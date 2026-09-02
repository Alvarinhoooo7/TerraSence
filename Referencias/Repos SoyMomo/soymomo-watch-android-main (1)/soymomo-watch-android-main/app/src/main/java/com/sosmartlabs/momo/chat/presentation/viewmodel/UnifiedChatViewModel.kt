package com.sosmartlabs.momo.chat.presentation.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.local.entity.ChatAudioDurationUpdate
import com.sosmartlabs.momo.chat.data.local.entity.ChatAudioWaveformUpdate
import com.sosmartlabs.momo.chat.data.media.AudioWaveformExtractor
import com.sosmartlabs.momo.chat.data.media.LocalMediaUriResolver
import com.sosmartlabs.momo.chat.data.repository.ChatGroupRepository
import com.sosmartlabs.momo.chat.data.repository.ChatRepository
import com.sosmartlabs.momo.chat.data.media.AudioMetadataRetriever
import com.sosmartlabs.momo.chat.data.local.entity.ChatEntity
import com.sosmartlabs.momo.chat.data.local.entity.GroupMessageEntity
import com.sosmartlabs.momo.chat.presentation.model.ChatDateSeparatorBuilder
import com.sosmartlabs.momo.chat.presentation.model.ChatSession
import com.sosmartlabs.momo.chat.presentation.model.UnifiedMessageItem
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.main.model.WatchUserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.io.File

data class UnifiedChatHeader(
    val title: String,
    val subtitle: String? = null,
    val avatarUrl: String? = null,
    val isGroup: Boolean,
    val canVideoCall: Boolean,
    val canSendImage: Boolean,
    val hasUnlimitedMessageLength: Boolean = true,
    val wearerDeviceId: String? = null,
    val wearerModelInt: Int? = null
)

data class UnifiedChatUiState(
    val isLoading: Boolean = false,
    val header: UnifiedChatHeader? = null,
    val messages: List<UnifiedMessageItem> = emptyList(),
    val groupSenderAvatarById: Map<String, String?> = emptyMap(),
    val errorMessage: String? = null,
    val sendFailure: ChatSendFailure? = null,
    val groupRealtimeMode: GroupRealtimeMode = GroupRealtimeMode.IDLE
)

data class ChatSendFailure(
    val sessionType: SendFailureSessionType,
    val reason: String,
    val retryable: Boolean,
    val retryMessageId: String? = null
)

enum class SendFailureSessionType {
    INDIVIDUAL,
    GROUP
}

enum class GroupRealtimeMode {
    IDLE,
    LIVEQUERY_AND_POLLING,
    POLLING_ONLY,
    POLLING_ONLY_RETRY_SCHEDULED
}

enum class RealtimeSyncPolicy {
    ACTIVE,
    BACKGROUND
}

@HiltViewModel
class UnifiedChatViewModel @Inject constructor(
    @ApplicationContext context: Context,
    private val ioContext: CoroutineContext,
    private val externalScope: CoroutineScope,
    private val chatRepository: ChatRepository,
    private val audioMetadataRetriever: AudioMetadataRetriever,
    private val audioWaveformExtractor: AudioWaveformExtractor,
    private val chatGroupRepository: ChatGroupRepository,
    private val watchUserRepository: WatchUserRepository
) : AndroidViewModel(context as Application) {
    private val appContext: Context = context.applicationContext

    private companion object {
        const val GROUP_LIVEQUERY_REATTEMPT_INTERVAL_MS = 60_000L
        const val INDIVIDUAL_ACTIVE_POLL_INTERVAL_MS = 30_000L
        const val INDIVIDUAL_BACKGROUND_POLL_INTERVAL_MS = 120_000L
        const val GROUP_ACTIVE_POLL_INTERVAL_MS = 5_000L
        const val GROUP_BACKGROUND_POLL_INTERVAL_MS = 30_000L
    }


    private val _uiState = MutableStateFlow(UnifiedChatUiState())
    val uiState: StateFlow<UnifiedChatUiState> = _uiState.asStateFlow()

    private var session: ChatSession? = null
    private var sessionUser: ParseUser? = null
    private var observeMessagesJob: Job? = null
    private val failedWaveformUrls: MutableSet<String> = java.util.Collections.synchronizedSet(mutableSetOf())
    private val failedDurationUrls: MutableSet<String> = java.util.Collections.synchronizedSet(mutableSetOf())

    fun loadSession(newSession: ChatSession, user: ParseUser) {
        session = newSession
        sessionUser = user
        _uiState.value = _uiState.value.copy(
            isLoading = true,
            errorMessage = null,
            sendFailure = null,
            groupSenderAvatarById = emptyMap()
        )

        observeMessagesJob?.cancel()
        observeMessagesJob = viewModelScope.launch(ioContext) {
            try {
                when (newSession) {
                    is ChatSession.Individual -> loadIndividualSession(newSession, user)
                    is ChatSession.Group -> loadGroupSession(newSession, user)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "UnifiedChatViewModel: Error loading session")
                CrashlyticsLog.recordNonFatalError(e, "UnifiedChatViewModel: Error loading session")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.localizedMessage ?: appContext.getString(R.string.error_loading_chat)
                )
            }
        }
    }

    private suspend fun loadIndividualSession(session: ChatSession.Individual, user: ParseUser) = coroutineScope {
        _uiState.value = _uiState.value.copy(
            header = UnifiedChatHeader(
                title = session.wearer.name(),
                avatarUrl = session.wearer.image?.url,
                isGroup = false,
                canVideoCall = session.wearer.hasVideocall() &&
                    watchUserRepository.hasVideocallPermission(session.wearer),
                canSendImage = session.wearer.model.hasImageMessage(),
                hasUnlimitedMessageLength = session.wearer.hasUnlimitedMessageLength(),
                wearerDeviceId = session.wearer.deviceId,
                wearerModelInt = session.wearer.modelInt
            )
        )

        launch {
            runCatching { chatRepository.getChatFromNetwork(session.wearer, user) }
                .onFailure { e -> handleBackgroundSyncFailure("individual session", e) }
        }

        chatRepository.getChatFromRoom(session.wearer, user).collectLatest { chats ->
            val unifiedMessages = chats.map { it.toUnifiedMessage(user) }
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                messages = buildUiMessagesWithDateSeparators(unifiedMessages)
            )
            backfillAudioDurations(chats)
            backfillAudioWaveforms(chats)
        }
    }

    private fun backfillAudioDurations(messages: List<ChatEntity>) {
        externalScope.launch(ioContext) {
            try {
                val messagesToBackfill = messages.filter { message ->
                    message.audio != null && message.audioDuration == null && message.audio !in failedDurationUrls
                }

                if (messagesToBackfill.isEmpty()) {
                    return@launch
                }

                val updates = mutableListOf<ChatAudioDurationUpdate>()
                messagesToBackfill.forEach { message ->
                    val audioUrl = message.audio ?: return@forEach
                    val audioDuration = if (message.isIsolatedAudio == true) {
                        audioMetadataRetriever.getAudioDurationWithDownload(audioUrl)
                    } else {
                        audioMetadataRetriever.getAudioDuration(audioUrl)
                    }

                    if (audioDuration != null) {
                        updates.add(ChatAudioDurationUpdate(message.id, audioDuration))
                    } else {
                        failedDurationUrls.add(audioUrl)
                    }
                }

                if (updates.isNotEmpty()) {
                    chatRepository.updateAudioDurations(updates)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "UnifiedChatViewModel: Error backfilling individual audio durations")
                CrashlyticsLog.recordNonFatalError(e, "UnifiedChatViewModel: Error backfilling individual audio durations")
            }
        }
    }

    private fun backfillAudioWaveforms(messages: List<ChatEntity>) {
        externalScope.launch(ioContext) {
            try {
                val messagesToBackfill = messages.filter { message ->
                    message.audio != null && message.audioWaveform == null && message.audio !in failedWaveformUrls
                }

                if (messagesToBackfill.isEmpty()) {
                    return@launch
                }

                Timber.d("UnifiedChatViewModel: Backfilling waveforms for ${messagesToBackfill.size} audio messages")
                val updates = mutableListOf<ChatAudioWaveformUpdate>()
                messagesToBackfill.forEach { message ->
                    val audioUrl = message.audio ?: return@forEach
                    val amplitudes = audioWaveformExtractor.extractWaveform(audioUrl)
                    if (amplitudes != null) {
                        updates.add(
                            ChatAudioWaveformUpdate(
                                message.id,
                                AudioWaveformExtractor.serializeWaveform(amplitudes)
                            )
                        )
                    } else {
                        failedWaveformUrls.add(audioUrl)
                    }
                }

                if (updates.isNotEmpty()) {
                    chatRepository.updateAudioWaveforms(updates)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "UnifiedChatViewModel: Error backfilling audio waveforms")
                CrashlyticsLog.recordNonFatalError(e, "UnifiedChatViewModel: Error backfilling audio waveforms")
            }
        }
    }

    private fun backfillGroupAudioWaveforms(messages: List<GroupMessageEntity>) {
        externalScope.launch(ioContext) {
            try {
                val messagesToBackfill = messages.filter { message ->
                    message.audio != null && message.audioWaveform == null && message.audio !in failedWaveformUrls
                }

                if (messagesToBackfill.isEmpty()) {
                    return@launch
                }

                Timber.d("UnifiedChatViewModel: Backfilling group waveforms for ${messagesToBackfill.size} audio messages")
                val updates = mutableListOf<ChatAudioWaveformUpdate>()
                messagesToBackfill.forEach { message ->
                    val audioUrl = message.audio ?: return@forEach
                    val localFilePath = resolveLocalFilePath(audioUrl)
                    val amplitudes = if (localFilePath != null) {
                        audioWaveformExtractor.extractWaveformFromFile(localFilePath)
                    } else {
                        audioWaveformExtractor.extractWaveform(audioUrl)
                    }
                    if (amplitudes != null) {
                        updates.add(
                            ChatAudioWaveformUpdate(
                                message.id,
                                AudioWaveformExtractor.serializeWaveform(amplitudes)
                            )
                        )
                    } else {
                        failedWaveformUrls.add(audioUrl)
                    }
                }

                if (updates.isNotEmpty()) {
                    chatGroupRepository.updateGroupAudioWaveforms(updates)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "UnifiedChatViewModel: Error backfilling group audio waveforms")
                CrashlyticsLog.recordNonFatalError(e, "UnifiedChatViewModel: Error backfilling group audio waveforms")
            }
        }
    }

    private fun backfillGroupAudioDurations(messages: List<GroupMessageEntity>) {
        externalScope.launch(ioContext) {
            try {
                val messagesToBackfill = messages.filter { message ->
                    message.audio != null && message.audioDuration == null && message.audio !in failedDurationUrls
                }

                if (messagesToBackfill.isEmpty()) {
                    return@launch
                }

                val updates = mutableListOf<ChatAudioDurationUpdate>()
                messagesToBackfill.forEach { message ->
                    val audioUrl = message.audio ?: return@forEach
                    val localFilePath = resolveLocalFilePath(audioUrl)
                    val audioDuration = if (localFilePath != null) {
                        audioMetadataRetriever.getAudioDurationFromFile(localFilePath)
                    } else {
                        audioMetadataRetriever.getAudioDuration(audioUrl)
                            ?: audioMetadataRetriever.getAudioDurationWithDownload(audioUrl)
                    }

                    if (audioDuration != null) {
                        updates.add(ChatAudioDurationUpdate(message.id, audioDuration))
                    } else {
                        failedDurationUrls.add(audioUrl)
                    }
                }

                if (updates.isNotEmpty()) {
                    chatGroupRepository.updateGroupAudioDurations(updates)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "UnifiedChatViewModel: Error backfilling group audio durations")
                CrashlyticsLog.recordNonFatalError(e, "UnifiedChatViewModel: Error backfilling group audio durations")
            }
        }
    }

    private suspend fun loadGroupSession(session: ChatSession.Group, user: ParseUser) = coroutineScope {
        val cachedGroup = chatGroupRepository.getCachedGroupById(session.groupId)
        val fallbackTitle = cachedGroup?.name?.takeIf { it.isNotBlank() } ?: session.groupName.orEmpty()
        _uiState.value = _uiState.value.copy(
            header = UnifiedChatHeader(
                title = fallbackTitle,
                subtitle = cachedGroup?.memberCount?.let {
                    appContext.getString(R.string.group_chat_members, it)
                },
                avatarUrl = cachedGroup?.avatar,
                isGroup = true,
                canVideoCall = false,
                canSendImage = true
            )
        )

        launch {
            refreshGroupHeaderAndMessages(session)
        }

        chatGroupRepository.getGroupMessagesFromRoom(session.groupId).collectLatest { messages ->
            val unifiedMessages = messages.map { it.toUnifiedMessage(user) }
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                messages = buildUiMessagesWithDateSeparators(unifiedMessages)
            )
            backfillGroupAudioDurations(messages)
            backfillGroupAudioWaveforms(messages)
        }
    }

    private suspend fun refreshGroupHeaderAndMessages(session: ChatSession.Group) {
        runCatching {
            val group = chatGroupRepository.getGroupById(session.groupId) ?: return
            val members = chatGroupRepository.getGroupMembers(group)
            val groupSenderAvatarById = members
                .mapNotNull { member ->
                    val senderId = member.userId ?: member.wearerId
                    senderId?.takeIf { it.isNotBlank() }?.let { validSenderId ->
                        validSenderId to member.avatar
                    }
                }
                .toMap()
            _uiState.value = _uiState.value.copy(
                header = UnifiedChatHeader(
                    title = group.name ?: (session.groupName ?: ""),
                    subtitle = appContext.getString(R.string.group_chat_members, members.size),
                    avatarUrl = group.avatar?.url,
                    isGroup = true,
                    canVideoCall = false,
                    canSendImage = true
                ),
                groupSenderAvatarById = groupSenderAvatarById
            )
            chatGroupRepository.getGroupMessagesFromNetwork(group)
        }.onFailure { e ->
            handleBackgroundSyncFailure("group session", e)
        }
    }

    private fun handleBackgroundSyncFailure(scope: String, throwable: Throwable) {
        if (throwable is CancellationException) {
            throw throwable
        }
        Timber.e(throwable, "UnifiedChatViewModel: Error refreshing $scope")
        CrashlyticsLog.recordNonFatalError(throwable, "UnifiedChatViewModel: Error refreshing $scope")
        _uiState.value = _uiState.value.copy(
            errorMessage = appContext.getString(R.string.error_refresh_chat_showing_cached)
        )
    }

    suspend fun runRealtimeSession(policy: RealtimeSyncPolicy) {
        val activeSession = session ?: return
        val user = sessionUser ?: return

        try {
            when (activeSession) {
                is ChatSession.Individual -> runIndividualRealtimeSession(activeSession, user, policy)
                is ChatSession.Group -> runGroupRealtimeSession(activeSession, policy)
            }
        } finally {
            setGroupRealtimeMode(GroupRealtimeMode.IDLE)
        }
    }

    fun stopRealtime() {
        setGroupRealtimeMode(GroupRealtimeMode.IDLE)
    }

    private suspend fun runIndividualRealtimeSession(
        activeSession: ChatSession.Individual,
        user: ParseUser,
        policy: RealtimeSyncPolicy
    ) = coroutineScope {
        val pollInterval = when (policy) {
            RealtimeSyncPolicy.ACTIVE -> INDIVIDUAL_ACTIVE_POLL_INTERVAL_MS
            RealtimeSyncPolicy.BACKGROUND -> INDIVIDUAL_BACKGROUND_POLL_INTERVAL_MS
        }

        if (policy == RealtimeSyncPolicy.ACTIVE) {
            launch {
                chatRepository.listenLiveQuery(activeSession.wearer, user)
            }
        }

        launch {
            chatRepository.pollMessageUpdates(activeSession.wearer, user, pollInterval)
        }
    }

    private suspend fun runGroupRealtimeSession(
        activeSession: ChatSession.Group,
        policy: RealtimeSyncPolicy
    ) = coroutineScope {
        val pollInterval = when (policy) {
            RealtimeSyncPolicy.ACTIVE -> GROUP_ACTIVE_POLL_INTERVAL_MS
            RealtimeSyncPolicy.BACKGROUND -> GROUP_BACKGROUND_POLL_INTERVAL_MS
        }

        val liveQueryEnabled = policy == RealtimeSyncPolicy.ACTIVE
        setGroupRealtimeMode(
            if (liveQueryEnabled) {
                GroupRealtimeMode.LIVEQUERY_AND_POLLING
            } else {
                GroupRealtimeMode.POLLING_ONLY
            }
        )

        if (liveQueryEnabled) {
            launch {
                while (currentCoroutineContext().isActive) {
                    setGroupRealtimeMode(GroupRealtimeMode.LIVEQUERY_AND_POLLING)
                    chatGroupRepository.listenLiveQueryMessagesWithRetry(activeSession.groupId)
                    if (!currentCoroutineContext().isActive) {
                        break
                    }
                    setGroupRealtimeMode(GroupRealtimeMode.POLLING_ONLY_RETRY_SCHEDULED)
                    delay(GROUP_LIVEQUERY_REATTEMPT_INTERVAL_MS)
                }
            }
        }

        launch {
            chatGroupRepository.pollGroupMessageUpdates(activeSession.groupId, pollInterval)
        }
    }

    private fun setGroupRealtimeMode(mode: GroupRealtimeMode) {
        if (_uiState.value.groupRealtimeMode != mode) {
            _uiState.value = _uiState.value.copy(groupRealtimeMode = mode)
        }
    }

    suspend fun updateLastViewed() {
        val activeSession = session ?: return
        val user = sessionUser ?: return
        withContext(ioContext) {
            when (activeSession) {
                is ChatSession.Individual -> chatRepository.updateLastViewed(activeSession.wearer, user)
                is ChatSession.Group -> chatGroupRepository.updateLastViewed(activeSession.groupId)
            }
        }
    }

    suspend fun updateLastViewedAtIfNewer(latestMessageTimestamp: Long) {
        if (latestMessageTimestamp <= 0L) {
            return
        }
        val activeSession = session ?: return
        val user = sessionUser ?: return
        withContext(ioContext) {
            when (activeSession) {
                is ChatSession.Individual ->
                    chatRepository.updateLastViewedIfNewer(activeSession.wearer, user, latestMessageTimestamp)
                is ChatSession.Group ->
                    chatGroupRepository.updateLastViewedIfNewer(activeSession.groupId, latestMessageTimestamp)
            }
        }
    }

    fun clearError() {
        if (_uiState.value.errorMessage != null) {
            _uiState.value = _uiState.value.copy(errorMessage = null)
        }
    }

    fun clearSendFailure() {
        if (_uiState.value.sendFailure != null) {
            _uiState.value = _uiState.value.copy(sendFailure = null)
        }
    }

    private fun postSendFailure(
        sessionType: SendFailureSessionType,
        reason: String,
        retryable: Boolean = true,
        retryMessageId: String? = null
    ) {
        _uiState.value = _uiState.value.copy(
            sendFailure = ChatSendFailure(
                sessionType = sessionType,
                reason = reason,
                retryable = retryable,
                retryMessageId = retryMessageId
            )
        )
    }

    fun sendText(text: String) {
        val activeSession = session ?: return
        val user = sessionUser ?: return
        externalScope.launch(ioContext) {
            runCatching {
                when (activeSession) {
                    is ChatSession.Individual -> chatRepository.sendTextMessage(activeSession.wearer, user, text)
                    is ChatSession.Group -> {
                        val group = chatGroupRepository.getGroupByIdOrCachedPointer(activeSession.groupId)
                        if (group == null) {
                            postSendFailure(
                                sessionType = SendFailureSessionType.GROUP,
                                reason = appContext.getString(R.string.error_send_text_group_unavailable),
                                retryable = true
                            )
                            return@runCatching
                        }
                        chatGroupRepository.sendTextMessage(group, user, text)
                    }
                }
            }.onFailure { e ->
                Timber.e(e, "UnifiedChatViewModel: sendText failed")
                CrashlyticsLog.recordNonFatalError(e, "UnifiedChatViewModel: sendText failed")
                handleSendFailure(
                    throwable = e,
                    activeSession = activeSession,
                    defaultReason = appContext.getString(R.string.error_send_text_failed_retry)
                )
            }
        }
    }

    fun sendImage(path: String) {
        val activeSession = session ?: return
        val user = sessionUser ?: return
        if (activeSession is ChatSession.Individual && !activeSession.wearer.model.hasImageMessage()) {
            postSendFailure(
                sessionType = SendFailureSessionType.INDIVIDUAL,
                reason = appContext.getString(R.string.error_send_image_model_unsupported),
                retryable = false
            )
            return
        }
        externalScope.launch(ioContext) {
            runCatching {
                when (activeSession) {
                    is ChatSession.Individual -> {
                        chatRepository.sendImageMessage(activeSession.wearer, user, path)
                        true
                    }
                    is ChatSession.Group -> {
                        val group = chatGroupRepository.getGroupByIdOrCachedPointer(activeSession.groupId)
                        if (group == null) {
                            postSendFailure(
                                sessionType = SendFailureSessionType.GROUP,
                                reason = appContext.getString(R.string.error_send_image_group_unavailable),
                                retryable = true
                            )
                            return@runCatching false
                        }
                        chatGroupRepository.sendImageMessage(group, user, path)
                        true
                    }
                }
            }.onSuccess { sent ->
                if (sent) {
                    deleteTempMediaFile(path, "image")
                }
            }.onFailure { e ->
                Timber.e(e, "UnifiedChatViewModel: sendImage failed")
                CrashlyticsLog.recordNonFatalError(e, "UnifiedChatViewModel: sendImage failed")
                handleSendFailure(
                    throwable = e,
                    activeSession = activeSession,
                    defaultReason = appContext.getString(R.string.error_send_image_failed_retry)
                )
            }
        }
    }

    fun sendVoice(path: String) {
        val activeSession = session ?: return
        val user = sessionUser ?: return
        externalScope.launch(ioContext) {
            runCatching {
                when (activeSession) {
                    is ChatSession.Individual -> {
                        chatRepository.sendVoiceMessage(activeSession.wearer, user, path)
                        true
                    }
                    is ChatSession.Group -> {
                        val group = chatGroupRepository.getGroupByIdOrCachedPointer(activeSession.groupId)
                        if (group == null) {
                            postSendFailure(
                                sessionType = SendFailureSessionType.GROUP,
                                reason = appContext.getString(R.string.error_send_audio_group_unavailable),
                                retryable = true
                            )
                            return@runCatching false
                        }
                        chatGroupRepository.sendVoiceMessage(group, user, path)
                        true
                    }
                }
            }.onSuccess { sent ->
                if (sent) {
                    deleteTempMediaFile(path, "audio")
                }
            }.onFailure { e ->
                Timber.e(e, "UnifiedChatViewModel: sendVoice failed")
                CrashlyticsLog.recordNonFatalError(e, "UnifiedChatViewModel: sendVoice failed")
                handleSendFailure(
                    throwable = e,
                    activeSession = activeSession,
                    defaultReason = appContext.getString(R.string.error_send_audio_failed_retry)
                )
            }
        }
    }

    fun retryFailedGroupMessage(retryMessageId: String) {
        val activeSession = session as? ChatSession.Group ?: return
        val user = sessionUser ?: return
        val localMedia = _uiState.value.messages
            .firstOrNull { it.id == retryMessageId }
            ?.toLocalMediaReference()

        externalScope.launch(ioContext) {
            runCatching {
                val group = chatGroupRepository.getGroupByIdOrCachedPointer(activeSession.groupId)
                if (group == null) {
                    postSendFailure(
                        sessionType = SendFailureSessionType.GROUP,
                        reason = appContext.getString(R.string.error_send_text_group_unavailable),
                        retryable = true,
                        retryMessageId = retryMessageId
                    )
                    return@runCatching
                }
                chatGroupRepository.retryFailedGroupMessage(group, user, retryMessageId)
                localMedia?.let { deleteTempMediaFile(it.path, it.type) }
            }.onFailure { e ->
                Timber.e(e, "UnifiedChatViewModel: retryFailedGroupMessage failed")
                CrashlyticsLog.recordNonFatalError(e, "UnifiedChatViewModel: retryFailedGroupMessage failed")
                handleSendFailure(
                    throwable = e,
                    activeSession = activeSession,
                    defaultReason = appContext.getString(R.string.error_send_text_failed_retry)
                )
            }
        }
    }

    private fun handleSendFailure(
        throwable: Throwable,
        activeSession: ChatSession,
        defaultReason: String
    ) {
        val groupSendFailure = throwable as? com.sosmartlabs.momo.chat.data.repository.GroupMessageSendException
        postSendFailure(
            sessionType = if (activeSession is ChatSession.Group) {
                SendFailureSessionType.GROUP
            } else {
                SendFailureSessionType.INDIVIDUAL
            },
            reason = groupSendFailure?.message ?: defaultReason,
            retryable = groupSendFailure?.retryable ?: true,
            retryMessageId = groupSendFailure?.ulid
        )
    }

    private data class LocalMediaReference(
        val path: String,
        val type: String
    )

    private fun UnifiedMessageItem.toLocalMediaReference(): LocalMediaReference? {
        val imagePath = resolveLocalFilePath(image)
        if (imagePath != null) {
            return LocalMediaReference(imagePath, "image")
        }
        val audioPath = resolveLocalFilePath(audio)
        if (audioPath != null) {
            return LocalMediaReference(audioPath, "audio")
        }
        return null
    }

    private fun resolveLocalFilePath(uriOrPath: String?): String? {
        return LocalMediaUriResolver.resolveExistingLocalFilePath(uriOrPath)
    }

    private fun buildUiMessagesWithDateSeparators(
        messages: List<UnifiedMessageItem>
    ): List<UnifiedMessageItem> {
        return ChatDateSeparatorBuilder.build(
            messages = messages,
            todayLabel = appContext.getString(R.string.today),
            yesterdayLabel = appContext.getString(R.string.yesterday)
        )
    }

    private fun ChatEntity.toUnifiedMessage(user: ParseUser): UnifiedMessageItem {
        val mine = sender == ChatEntity.SENDER_APP
        return UnifiedMessageItem(
            id = id,
            timestamp = createdAt,
            senderId = if (mine) user.objectId else receiver,
            senderName = if (mine) {
                appContext.getString(R.string.chat_sender_you)
            } else {
                appContext.getString(R.string.chat_sender_watch)
            },
            isMine = mine,
            type = type,
            text = text,
            audio = audio,
            audioDuration = audioDuration,
            image = image,
            video = video,
            status = status,
            isSeparator = type == ChatEntity.TYPE_SEPARATOR,
            isIsolatedAudio = isIsolatedAudio == true,
            audioWaveform = audioWaveform
        )
    }

    private fun GroupMessageEntity.toUnifiedMessage(user: ParseUser): UnifiedMessageItem {
        val mine = sender == GroupMessageEntity.SENDER_USER && senderId == user.objectId
        return UnifiedMessageItem(
            id = id,
            timestamp = createdAt,
            senderId = senderId,
            senderName = senderName,
            senderAvatar = senderAvatar,
            isMine = mine,
            type = type,
            text = text,
            audio = audio,
            audioDuration = audioDuration,
            image = image,
            video = video,
            status = status,
            isSeparator = type == GroupMessageEntity.TYPE_SEPARATOR,
            audioWaveform = audioWaveform
        )
    }

    override fun onCleared() {
        stopRealtime()
        observeMessagesJob?.cancel()
        super.onCleared()
    }

    private fun deleteTempMediaFile(path: String, mediaType: String) {
        if (path.isBlank()) {
            return
        }
        try {
            val file = File(path)
            if (!file.exists()) {
                return
            }
            if (!file.delete()) {
                Timber.w(
                    "UnifiedChatViewModel: Failed to delete temp %s file at path=%s",
                    mediaType,
                    path
                )
            }
        } catch (e: Exception) {
            Timber.e(e, "UnifiedChatViewModel: Error deleting temp %s file", mediaType)
            CrashlyticsLog.recordNonFatalError(
                e,
                "UnifiedChatViewModel: Error deleting temp $mediaType file"
            )
        }
    }
}
