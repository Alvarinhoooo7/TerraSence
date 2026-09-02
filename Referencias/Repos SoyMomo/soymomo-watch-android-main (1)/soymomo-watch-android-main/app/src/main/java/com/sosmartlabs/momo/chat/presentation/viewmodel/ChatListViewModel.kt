package com.sosmartlabs.momo.chat.presentation.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import androidx.work.impl.TestWorkManagerImpl
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.repository.ChatGroupRepository
import com.sosmartlabs.momo.chat.data.repository.ChatRepository
import com.sosmartlabs.momo.chat.data.local.entity.ChatEntity
import com.sosmartlabs.momo.chat.data.local.entity.GroupMessageEntity
import com.sosmartlabs.momo.chat.data.remote.model.ChatGroup
import com.sosmartlabs.momo.chat.presentation.model.ChatListItem
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.models.Wearer
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.cancel
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.mapLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class ChatListViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val chatRepository: ChatRepository,
    private val chatGroupRepository: ChatGroupRepository
) : AndroidViewModel(context as Application) {

    private var chatsCollectionJob: Job? = null

    private val _activeChats = MutableLiveData<List<ChatListItem>>()
    val activeChats: LiveData<List<ChatListItem>> = _activeChats

    private val _allWatches = MutableLiveData<List<ChatListItem>>()
    val allWatches: LiveData<List<ChatListItem>> = _allWatches

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _errorMessage = MutableLiveData<String?>()
    val errorMessage: LiveData<String?> = _errorMessage

    private var isLoadChatsRunning = false

    fun loadChats(activeWatchUsers: List<WatchUser>) {
        Timber.d("ChatListViewModel: loadChats called with ${activeWatchUsers.size} watch users")

        if (_activeChats.value.isNullOrEmpty()) {
            _isLoading.value = true
        }

        val user = ParseUser.getCurrentUser()

        // Cancel any previous collector to avoid concurrent collectors
        chatsCollectionJob?.cancel()

        // ---- 1) Build a single flow with the current snapshot of messages per wearer ----
        val wearerFlows = activeWatchUsers
            .mapNotNull { watchUser ->
                watchUser.watch?.let { wearer ->
                    chatRepository
                        .getChatFromRoom(wearer, user) // Flow<List<ChatEntity>>
                        .map { messages -> wearer to messages }
                }
            }

        val individualSnapshotFlow = if (wearerFlows.isEmpty()) {
            flowOf(emptyList())
        } else {
            combine(wearerFlows) { pairsArray ->
                // Each element: Pair< wearer, messages >
                pairsArray.toList()
            }
        }

        // ---- 2) Build flow for groups from Room ----
        val groupsFlow = chatGroupRepository
            .getUserGroupsFromRoom()
            .map { groups ->
                groups.map { groupEntity ->
                    ChatListItem(
                        chatId = groupEntity.id,
                        name = groupEntity.name,
                        lastMessage = formatGroupLastMessageText(
                            text = groupEntity.lastMessageText,
                            type = groupEntity.lastMessageType,
                            senderId = groupEntity.lastMessageSenderId,
                            senderName = groupEntity.lastMessageSenderName,
                            currentUserId = user.objectId
                        ),
                        timestamp = groupEntity.lastMessageTime,
                        unreadCount = groupEntity.unreadCount,
                        isGroup = true,
                        profileImageURL = groupEntity.avatar,
                        watch = null,
                        group = null, // full group fetched on demand
                        hasConversation = true,
                        isRemoved = false,
                        memberCount = groupEntity.memberCount
                    )
                }
            }

        // ---- 3) Combine messages + groups, and compute unread counts in a single batch ----
        chatsCollectionJob = viewModelScope.launch(ioContext) {
            try {
                combine(individualSnapshotFlow, groupsFlow) { wearerSnapshots, groupItems ->
                    // wearerSnapshots: List<Pair<Wearer, List<ChatEntity>>>
                    val individualItems = buildIndividualChatItems(user, wearerSnapshots)
                    (individualItems + groupItems)
                        .sortedByDescending { it.timestamp }
                }.collect { combinedList ->
                    Timber.d("ChatListViewModel: Emitting combined chat list with ${combinedList.size} items")
                    _activeChats.postValue(combinedList)
                    _isLoading.postValue(false)
                }
            } catch (e: CancellationException) {
                // Normal teardown of the collection job — must not surface as an error.
                throw e
            } catch (e: Exception) {
                Timber.e(e, "ChatListViewModel: Error collecting chat list flows")
                CrashlyticsLog.recordNonFatalError(e, "ChatListViewModel: Error collecting chat list flows")
                _errorMessage.postValue(e.message)
                _isLoading.postValue(false)
            }
        }

        // ---- 4) Kick off a network refresh in parallel (debounced with flag) ----
        refreshFromNetwork(activeWatchUsers, user)
    }

    /**
     * Builds the list of ChatListItem for individual (one-to-one) chats using
     * a single, centralized pass to compute unread counts.
     *
     * This avoids running getUnreadCount() in many concurrent mapLatest coroutines.
     */
    private suspend fun buildIndividualChatItems(
        user: ParseUser,
        snapshots: List<Pair<Wearer, List<ChatEntity>>>
    ): List<ChatListItem> {
        if (snapshots.isEmpty()) return emptyList()

        val result = mutableListOf<ChatListItem>()

        // We run unread count queries in a controlled way: either sequentially or with limited parallelism.
        // Sequential is simplest and usually fine for 10–20 chats.
        for ((wearer, messages) in snapshots) {
            val lastMessage = messages.firstOrNull()

            val unreadCount = try {
                chatRepository.getUnreadCount(wearer, user)
            } catch (e: CancellationException) {
                // Expected when flows are cancelled; do NOT log as error.
                // Just propagate cancellation.
                throw e
            } catch (e: Exception) {
                Timber.e(e, "ChatListViewModel: Error getting unread count for wearer=${wearer.objectId}")
                0
            }

            result += ChatListItem(
                chatId = wearer.objectId,
                name = wearer.name(),
                lastMessage = formatLastMessageText(lastMessage),
                timestamp = lastMessage?.createdAt ?: 0L,
                unreadCount = unreadCount,
                isGroup = false,
                profileImageURL = wearer.image?.url,
                watch = wearer,
                group = null,
                hasConversation = messages.isNotEmpty(),
                memberCount = 0
            )
        }

        Timber.d("ChatListViewModel: Built ${result.size} individual chat items")
        return result
    }


    /**
     * Network refresh: fetch chats and groups from server and cache them in Room.
     * Guarded by isLoadChatsRunning so we don't spam the backend.
     */
    private fun refreshFromNetwork(activeWatchUsers: List<WatchUser>, user: ParseUser) {
        if (isLoadChatsRunning) {
            Timber.d("ChatListViewModel: Network refresh already running, skipping")
            return
        }

        isLoadChatsRunning = true

        viewModelScope.launch(ioContext) {
            try {
                // Fetch individual chats in parallel
                val individualChatDeferreds = activeWatchUsers.mapNotNull { watchUser ->
                    watchUser.watch?.let { wearer ->
                        async {
                            chatRepository.getChatFromNetwork(wearer, user)
                        }
                    }
                }

                // Fetch groups
                val groupsDeferred = async {
                    chatGroupRepository.getUserGroupsFromNetwork(user)
                }

                individualChatDeferreds.awaitAll()
                Timber.d("ChatListViewModel: Fetched individual chats from network")

                groupsDeferred.await()
                Timber.d("ChatListViewModel: Fetched groups from network")
            } catch (e: CancellationException) {
                // Normal teardown of the refresh job — must not surface as an error.
                // The finally block below still clears isLoadChatsRunning.
                throw e
            } catch (e: Exception) {
                Timber.e(e, "ChatListViewModel: Error refreshing chats from network")
                CrashlyticsLog.recordNonFatalError(e, "ChatListViewModel: Error refreshing chats from network")
                _errorMessage.postValue(e.message)
            } finally {
                isLoadChatsRunning = false
            }
        }
    }

    suspend fun startLiveQueries(activeWatchUsers: List<WatchUser>) {
        Timber.d("ChatListViewModel: startLiveQueries called with ${activeWatchUsers.size} watch users")
        coroutineScope {
            try {
                val user = ParseUser.getCurrentUser()
                
                // Setup LiveQuery for individual chats
                activeWatchUsers.forEach { watchUser ->
                    watchUser.watch?.let { wearer ->
                        launch {
                            chatRepository.listenLiveQuery(wearer, user)
                        }
                    }
                }

                // Setup LiveQuery for groups
                launch {
                    chatGroupRepository.listenLiveQueryGroups(user)
                }

            } catch (e: Exception) {
                Timber.e(e, "ChatListViewModel: Error setting up LiveQuery")
                CrashlyticsLog.recordNonFatalError(e, "ChatListViewModel: Error setting up LiveQuery")
            }
        }
    }

    suspend fun fetchGroup(groupId: String): ChatGroup? {
        Timber.d("ChatListViewModel: fetchGroup groupId=$groupId")
        return try {
            chatGroupRepository.getGroupById(groupId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Timber.e(e, "ChatListViewModel: Error fetching group")
            CrashlyticsLog.recordNonFatalError(e, "ChatListViewModel: Error fetching group")
            null
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    private fun formatLastMessageText(message: ChatEntity?): String {
        if (message == null) return ""
        return formatLastMessageText(message.text, message.type)
    }

    private fun formatLastMessageText(text: String?, type: String?): String {
        return when (type) {
            ChatEntity.TYPE_IMAGE, GroupMessageEntity.TYPE_IMAGE -> {
                context.getString(R.string.message_type_image)
            }
            ChatEntity.TYPE_VIDEO, GroupMessageEntity.TYPE_VIDEO -> {
                context.getString(R.string.message_type_video)
            }
            ChatEntity.TYPE_AUDIO, GroupMessageEntity.TYPE_AUDIO -> {
                context.getString(R.string.message_type_audio)
            }
            else -> text ?: ""
        }
    }

    private fun formatGroupLastMessageText(
        text: String?,
        type: String?,
        senderId: String?,
        senderName: String?,
        currentUserId: String?
    ): String {
        val body = formatLastMessageText(text, type)
        if (body.isBlank()) {
            return ""
        }

        val senderLabel = when {
            !currentUserId.isNullOrBlank() && senderId == currentUserId -> {
                context.getString(R.string.chat_sender_you)
            }
            !senderName.isNullOrBlank() -> senderName
            else -> null
        } ?: return body

        return context.getString(R.string.chat_list_group_message_with_sender, senderLabel, body)
    }
}
