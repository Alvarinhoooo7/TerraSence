package com.sosmartlabs.momo.chat.data.repository

import android.content.Context
import com.parse.ParseCloud
import com.parse.ParseException
import com.parse.ParseObject
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.events.GroupChatEventBus
import com.sosmartlabs.momo.chat.data.local.entity.ChatAudioDurationUpdate
import com.sosmartlabs.momo.chat.data.local.entity.ChatAudioWaveformUpdate
import com.sosmartlabs.momo.chat.data.local.entity.GroupEntity
import com.sosmartlabs.momo.chat.data.local.entity.GroupMemberEntity
import com.sosmartlabs.momo.chat.data.local.entity.GroupMessageEntity
import com.sosmartlabs.momo.chat.data.media.LocalMediaUriResolver
import com.sosmartlabs.momo.chat.data.remote.datasource.GroupMemberNetworkDataSource
import com.sosmartlabs.momo.chat.data.remote.datasource.GroupMessageNetworkDataSource
import com.sosmartlabs.momo.chat.data.remote.datasource.GroupNetworkDataSource
import com.sosmartlabs.momo.chat.data.remote.model.ChatGroup
import com.sosmartlabs.momo.chat.data.remote.model.GroupMessage
import androidx.room.withTransaction
import com.sosmartlabs.momo.chat.data.local.database.ChatDatabase
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import ulid.ULID
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.cancellation.CancellationException

class ChatGroupRepository @Inject constructor(
    @param:ApplicationContext val context: Context,
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val database: ChatDatabase,
    private val groupNetworkDataSource: GroupNetworkDataSource,
    private val groupMemberNetworkDataSource: GroupMemberNetworkDataSource,
    private val groupMessageNetworkDataSource: GroupMessageNetworkDataSource,
    private val groupChatEventBus: GroupChatEventBus,
) {
    private val appContext = context.applicationContext
    private val reconciliationJobs = ConcurrentHashMap<String, Job>()

    private companion object {
        const val INITIAL_GROUP_SYNC_PAGE_SIZE = 100
        const val INITIAL_GROUP_BACKFILL_MAX_PAGES = 5
        const val STATUS_UPDATE_POLL_LIMIT = 100
        const val STATUS_UPDATE_LOOKBACK_MS = 10 * 60 * 1000L
        const val STATUS_UPDATE_CURSOR_OVERLAP_MS = 5_000L
        const val STALE_PENDING_GROUP_MESSAGE_GRACE_MS = 60_000L
        val UNRESOLVED_GROUP_MESSAGE_RECONCILIATION_DELAYS_MS = longArrayOf(2_000L, 5_000L, 10_000L)
    }

    // ========== Group Operations ==========

    fun getUserGroupsFromRoom(): Flow<List<GroupEntity>> {
        Timber.d("ChatGroupRepository: getUserGroupsFromRoom()")
        return database.groupDao().getAllGroups()
    }

    suspend fun getUserGroupsFromNetwork(user: ParseUser) {
        Timber.d("ChatGroupRepository: getUserGroupsFromNetwork() for user=${user.objectId}")
        try {
            withContext(ioContext) {
                val groups = groupNetworkDataSource.getUserGroups(user)
                Timber.d("ChatGroupRepository: Received ${groups.size} groups from network")

                val networkGroupIds = groups.mapNotNull { it.objectId }.toSet()
                
                // 1. Insert/Update valid groups
                groups.forEach { group ->
                    try {
                        // Get last message for the group
                        val messages = groupMessageNetworkDataSource.getMessages(group, limit = 1)
                        val lastMessage = messages.firstOrNull()
                        val senderSummary = lastMessage?.let { extractSenderSummary(it) }

                        // Get member count
                        val members = groupMemberNetworkDataSource.getGroupMembers(group)

                        // Calculate unread count
                        val currentUserId = user.objectId
                        val unreadCount = getUnreadCount(group.objectId ?: "", currentUserId)

                        val groupEntity = GroupEntity(
                            id = group.objectId ?: "",
                            name = group.name,
                            avatar = group.avatar?.url,
                            description = group.groupDescription,
                            ownerId = group.owner.objectId ?: "",
                            lastMessageText = lastMessage?.text ?: "",
                            lastMessageType = lastMessage?.type,
                            lastMessageSenderId = senderSummary?.senderId?.takeIf { it.isNotBlank() },
                            lastMessageSenderName = senderSummary?.senderName,
                            lastMessageTime = lastMessage?.createdAt?.time ?: 0,
                            unreadCount = unreadCount,
                            memberCount = members.size
                        )

                        database.groupDao().insertGroup(groupEntity)
                        Timber.d("ChatGroupRepository: Cached group ${group.objectId}")
                    } catch (e: Exception) {
                        Timber.e(e, "ChatGroupRepository: Error caching group ${group.objectId}")
                        CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error caching group")
                    }
                }
                
                // 2. Remove stale groups (present locally but not in network response)
                val localGroupIds = database.groupDao().getAllGroupIds()
                val staleGroupIds = localGroupIds.filter { !networkGroupIds.contains(it) }
                
                if (staleGroupIds.isNotEmpty()) {
                    Timber.d("ChatGroupRepository: Found ${staleGroupIds.size} stale groups to remove: $staleGroupIds")
                    staleGroupIds.forEach { purgeLocalGroup(it) }
                    Timber.d("ChatGroupRepository: Removed stale groups successfully")
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error in getUserGroupsFromNetwork")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in getUserGroupsFromNetwork")
        }
    }

    suspend fun getGroupById(groupId: String): ChatGroup? {
        Timber.d("ChatGroupRepository: getGroupById groupId=$groupId")
        return try {
            groupNetworkDataSource.getGroupById(groupId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error in getGroupById")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in getGroupById")
            null
        }
    }

    suspend fun getCachedGroupById(groupId: String): GroupEntity? {
        Timber.d("ChatGroupRepository: getCachedGroupById groupId=$groupId")
        return try {
            withContext(ioContext) {
                database.groupDao().getGroupById(groupId)
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error in getCachedGroupById")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in getCachedGroupById")
            null
        }
    }

    suspend fun getGroupByIdOrCachedPointer(groupId: String): ChatGroup? {
        val networkGroup = getGroupById(groupId)
        if (networkGroup != null) {
            return networkGroup
        }

        val cachedGroup = getCachedGroupById(groupId)
        if (cachedGroup == null) {
            Timber.w("ChatGroupRepository: No cached metadata available for groupId=$groupId")
            return null
        }

        return try {
            Timber.i("ChatGroupRepository: Using cached metadata pointer for groupId=$groupId")
            ParseObject.createWithoutData(ChatGroup::class.java, cachedGroup.id).apply {
                // Hydrate core fields so edit/detail screens can render without requiring network.
                name = cachedGroup.name
                groupDescription = cachedGroup.description
                if (cachedGroup.ownerId.isNotBlank()) {
                    owner = ParseObject.createWithoutData(ParseUser::class.java, cachedGroup.ownerId)
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Failed creating cached group pointer for groupId=$groupId")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Failed creating cached group pointer")
            null
        }
    }

    suspend fun createGroup(
        name: String,
        description: String?,
        avatarData: ByteArray?,
        owner: ParseUser,
        members: List<Pair<String, Boolean>>
    ): ChatGroup? {
        Timber.d("ChatGroupRepository: createGroup name=$name")
        return try {
            val group = groupNetworkDataSource.createGroup(name, description, avatarData, owner, members)
            
            if (group != null) {
                // Cache the group
                val groupEntity = GroupEntity(
                    id = group.objectId ?: "",
                    name = group.name ?: "",
                    avatar = group.avatar?.url,
                    description = group.groupDescription,
                    ownerId = group.owner?.objectId ?: "",
                    lastMessageText = "",
                    lastMessageType = null,
                    lastMessageSenderId = null,
                    lastMessageSenderName = null,
                    lastMessageTime = System.currentTimeMillis(),
                    unreadCount = 0,
                    memberCount = members.size
                )
                database.groupDao().insertGroup(groupEntity)
            }
            
            group
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error in createGroup")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in createGroup")
            null
        }
    }

    suspend fun updateGroup(
        group: ChatGroup,
        name: String?,
        description: String?,
        avatarData: ByteArray?
    ): Boolean {
        Timber.d("ChatGroupRepository: updateGroup groupId=${group.objectId}")
        return try {
            val success = groupNetworkDataSource.updateGroup(group, name, description, avatarData)
            
            if (success) {
                val groupId = group.objectId ?: return false
                val existingGroup = database.groupDao().getGroupById(groupId)

                // Update cached group
                val groupEntity = GroupEntity(
                    id = groupId,
                    name = name ?: group.name ?: existingGroup?.name.orEmpty(),
                    avatar = group.avatar?.url ?: existingGroup?.avatar,
                    description = description ?: group.groupDescription ?: existingGroup?.description,
                    ownerId = group.owner?.objectId ?: existingGroup?.ownerId.orEmpty(),
                    // Preserve existing conversation summary fields so list preview is stable after edit.
                    lastMessageText = existingGroup?.lastMessageText ?: "",
                    lastMessageType = existingGroup?.lastMessageType,
                    lastMessageSenderId = existingGroup?.lastMessageSenderId,
                    lastMessageSenderName = existingGroup?.lastMessageSenderName,
                    lastMessageTime = existingGroup?.lastMessageTime ?: System.currentTimeMillis(),
                    unreadCount = existingGroup?.unreadCount ?: 0,
                    memberCount = existingGroup?.memberCount ?: 0
                )
                database.groupDao().insertGroup(groupEntity)
            }
            
            success
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error in updateGroup")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in updateGroup")
            false
        }
    }

    // ========== Group Messages Operations ==========

    fun getGroupMessagesFromRoom(groupId: String): Flow<List<GroupMessageEntity>> {
        Timber.d("ChatGroupRepository: getGroupMessagesFromRoom() for groupId=$groupId")
        return database.groupMessageDao().getGroupMessages(groupId)
    }

    suspend fun getGroupMessagesFromNetwork(group: ChatGroup) {
        Timber.d("ChatGroupRepository: getGroupMessagesFromNetwork() for group=${group.objectId}")
        try {
            withContext(ioContext) {
                val remoteMessages = groupMessageNetworkDataSource.getMessages(group)
                val messages = GroupMessageSyncResolver.collapse(remoteMessages.map { mapMessageToEntity(it) })
                Timber.d("ChatGroupRepository: Received ${messages.size} messages from network after collapse")

                messages.forEach { message ->
                    try {
                        upsertGroupMessage(message)
                    } catch (e: Exception) {
                        Timber.e(e, "ChatGroupRepository: Error caching message ${message.remoteId}")
                        CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error caching message")
                    }
                }

                if (messages.isNotEmpty()) {
                    recoverStalePendingGroupMessages(group, canFinalizeAsError = true)
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error in getGroupMessagesFromNetwork")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in getGroupMessagesFromNetwork")
        }
    }

    suspend fun sendTextMessage(group: ChatGroup, user: ParseUser, text: String) {
        Timber.d("ChatGroupRepository: sendTextMessage to group=${group.objectId}")
        val ulid = ULID.randomULID()
        val pendingMessage = createPendingGroupMessage(
            groupId = group.objectId ?: "",
            user = user,
            type = GroupMessageEntity.TYPE_TEXT,
            ulid = ulid,
            text = text
        )
        sendPendingMessage(
            group = group,
            pendingMessage = pendingMessage
        ) {
            groupMessageNetworkDataSource.sendTextMessage(group, user, text, ulid)
        }
    }

    suspend fun sendImageMessage(group: ChatGroup, user: ParseUser, imagePath: String) {
        Timber.d("ChatGroupRepository: sendImageMessage to group=${group.objectId}")
        val ulid = ULID.randomULID()
        val pendingMessage = createPendingGroupMessage(
            groupId = group.objectId ?: "",
            user = user,
            type = GroupMessageEntity.TYPE_IMAGE,
            ulid = ulid,
            image = filePathToUri(imagePath)
        )
        sendPendingMessage(
            group = group,
            pendingMessage = pendingMessage
        ) {
            groupMessageNetworkDataSource.sendImageMessage(group, user, imagePath, ulid)
        }
    }

    suspend fun sendVoiceMessage(group: ChatGroup, user: ParseUser, audioPath: String) {
        Timber.d("ChatGroupRepository: sendVoiceMessage to group=${group.objectId}")
        val ulid = ULID.randomULID()
        val pendingMessage = createPendingGroupMessage(
            groupId = group.objectId ?: "",
            user = user,
            type = GroupMessageEntity.TYPE_AUDIO,
            ulid = ulid,
            audio = filePathToUri(audioPath)
        )
        sendPendingMessage(
            group = group,
            pendingMessage = pendingMessage
        ) {
            groupMessageNetworkDataSource.sendVoiceMessage(group, user, audioPath, ulid)
        }
    }

    suspend fun listenLiveQueryGroups(user: ParseUser) {
        Timber.d("ChatGroupRepository: listenLiveQueryGroups() for user=${user.objectId}")
        try {
            groupNetworkDataSource.listenLiveQuery(user)
                .catch { e ->
                    Timber.e(e, "ChatGroupRepository: Error in listenLiveQueryGroups flow")
                    CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in listenLiveQueryGroups flow")
                    throw e
                }
                .collect { group ->
                    Timber.v("ChatGroupRepository: listenLiveQueryGroups() received group id=${group.objectId}")
                    // Update only the specific group that changed, not all groups
                    updateSingleGroupInRoom(group, user)
                }
        } catch (e: CancellationException) {
            // Leaving the chat cancels this collector — normal, and swallowing it here
            // would break structured concurrency for the caller.
            throw e
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Exception in listenLiveQueryGroups")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Exception in listenLiveQueryGroups")
        }
    }

    private suspend fun updateSingleGroupInRoom(group: ChatGroup, user: ParseUser) {
        Timber.d("ChatGroupRepository: updateSingleGroupInRoom() for group=${group.objectId}")
        try {
            withContext(ioContext) {
                // Get last message for the group
                val messages = groupMessageNetworkDataSource.getMessages(group, limit = 1)
                val lastMessage = messages.firstOrNull()
                val senderSummary = lastMessage?.let { extractSenderSummary(it) }

                // Get member count
                val members = groupMemberNetworkDataSource.getGroupMembers(group)

                // Calculate unread count
                val currentUserId = user.objectId
                val unreadCount = getUnreadCount(group.objectId ?: "", currentUserId)

                val groupEntity = GroupEntity(
                    id = group.objectId ?: "",
                    name = group.name ?: "",
                    avatar = group.avatar?.url,
                    description = group.groupDescription,
                    ownerId = group.owner?.objectId ?: "",
                    lastMessageText = lastMessage?.text ?: "",
                    lastMessageType = lastMessage?.type,
                    lastMessageSenderId = senderSummary?.senderId?.takeIf { it.isNotBlank() },
                    lastMessageSenderName = senderSummary?.senderName,
                    lastMessageTime = lastMessage?.createdAt?.time ?: 0,
                    unreadCount = unreadCount,
                    memberCount = members.size
                )

                database.groupDao().insertGroup(groupEntity)
                Timber.d("ChatGroupRepository: Updated group ${group.objectId} in Room")
            }
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error updating single group ${group.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error updating single group")
        }
    }

    suspend fun listenLiveQueryMessages(group: ChatGroup) {
        Timber.d("ChatGroupRepository: listenLiveQueryMessages() for group=${group.objectId}")
        groupMessageNetworkDataSource.listenLiveQuery(group)
            .catch { e ->
                Timber.e(e, "ChatGroupRepository: Error in listenLiveQuery flow for group=${group.objectId}")
                CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in listenLiveQuery flow")
                throw e
            }
            .collect { message ->
                Timber.v("ChatGroupRepository: listenLiveQuery() received message id=${message.objectId}")
                val entity = mapMessageToEntity(message)
                upsertGroupMessage(entity)
            }
    }

    suspend fun listenLiveQueryMessagesWithRetry(groupId: String, maxAttempts: Int = 5) {
        var attempt = 0
        while (true) {
            try {
                val group = getGroupByIdOrCachedPointer(groupId)
                if (group == null) {
                    attempt += 1
                    if (attempt > maxAttempts) {
                        Timber.w("ChatGroupRepository: LiveQuery reconnect exhausted without group metadata for groupId=$groupId")
                        return
                    }
                    val delayMs = groupMessageNetworkDataSource.getReconnectDelayMs(attempt)
                    Timber.w(
                        "ChatGroupRepository: LiveQuery missing group metadata for groupId=$groupId, retry attempt=$attempt in ${delayMs}ms"
                    )
                    delay(delayMs)
                    continue
                }

                Timber.i("ChatGroupRepository: Starting LiveQuery for groupId=$groupId, attempt=${attempt + 1}")
                listenLiveQueryMessages(group)
                attempt = 0
                val delayMs = groupMessageNetworkDataSource.getReconnectDelayMs(1)
                Timber.w("ChatGroupRepository: LiveQuery ended for groupId=$groupId, reconnecting in ${delayMs}ms")
                delay(delayMs)
            } catch (e: CancellationException) {
                Timber.d("ChatGroupRepository: LiveQuery retry loop cancelled for groupId=$groupId")
                throw e
            } catch (e: Exception) {
                attempt += 1
                CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: LiveQuery retry failure for groupId=$groupId")
                if (attempt > maxAttempts) {
                    Timber.w(
                        e,
                        "ChatGroupRepository: LiveQuery reconnect exhausted for groupId=$groupId after $maxAttempts attempts"
                    )
                    return
                }
                val delayMs = groupMessageNetworkDataSource.getReconnectDelayMs(attempt)
                Timber.w(
                    e,
                    "ChatGroupRepository: LiveQuery retry attempt=$attempt for groupId=$groupId in ${delayMs}ms"
                )
                delay(delayMs)
            }
        }
    }

    suspend fun pollGroupMessageUpdates(groupId: String, updateInterval: Long = 5_000L) {
        Timber.i("ChatGroupRepository: Starting group polling fallback for groupId=$groupId interval=${updateInterval}ms")
        var resolvedGroup: ChatGroup? = null
        var initialBackfillInProgress = false
        var lastStatusUpdateSyncAtMs = System.currentTimeMillis() - STATUS_UPDATE_LOOKBACK_MS
        while (true) {
            try {
                val group = resolvedGroup ?: getGroupByIdOrCachedPointer(groupId).also {
                    resolvedGroup = it
                }
                if (group == null) {
                    Timber.w("ChatGroupRepository: Polling skipped, group metadata unavailable for groupId=$groupId")
                } else {
                    val latestUlid = withContext(ioContext) {
                        database.groupMessageDao().getLatestSyncedUlid(groupId)
                    }
                    val newMessageUpdates = if (latestUlid == null) {
                        groupMessageNetworkDataSource.getMessagesPage(
                            group = group,
                            limit = INITIAL_GROUP_SYNC_PAGE_SIZE
                        )
                    } else {
                        groupMessageNetworkDataSource.getNewMessages(group, latestUlid)
                    }
                    val statusUpdates = groupMessageNetworkDataSource.getMessagesUpdatedSince(
                        group = group,
                        updatedAfterMs = lastStatusUpdateSyncAtMs,
                        limit = STATUS_UPDATE_POLL_LIMIT
                    )
                    val updates = GroupMessageSyncResolver.collapse(
                        (newMessageUpdates + statusUpdates).map { mapMessageToEntity(it) }
                    )
                    Timber.v(
                        "ChatGroupRepository: Polling received ${updates.size} merged updates for groupId=$groupId afterUlid=$latestUlid statusSince=$lastStatusUpdateSyncAtMs"
                    )
                    updates.forEach { message ->
                        upsertGroupMessage(message)
                    }
                    if (updates.isNotEmpty()) {
                        recoverStalePendingGroupMessages(group, canFinalizeAsError = true)
                    }
                    val latestUpdatedAtMs = (newMessageUpdates + statusUpdates)
                        .maxOfOrNull { it.updatedAt?.time ?: 0L } ?: 0L
                    if (latestUpdatedAtMs > lastStatusUpdateSyncAtMs) {
                        lastStatusUpdateSyncAtMs =
                            (latestUpdatedAtMs - STATUS_UPDATE_CURSOR_OVERLAP_MS).coerceAtLeast(0L)
                    }
                    if (latestUlid == null && !initialBackfillInProgress) {
                        val cursorSelection = GroupBackfillCursorResolver.resolveInitialBackfillCursorFromUlids(
                            newMessageUlids = newMessageUpdates.map { it.ulid },
                            mergedUlids = updates.map { it.ulid }
                        )
                        val beforeUlid = cursorSelection.beforeUlid
                        Timber.i(
                            "ChatGroupRepository: Polling initial backfill cursor source=%s groupId=%s beforeUlid=%s newCount=%s statusCount=%s mergedCount=%s",
                            cursorSelection.source.logValue,
                            groupId,
                            beforeUlid,
                            newMessageUpdates.size,
                            statusUpdates.size,
                            updates.size
                        )
                        if (!beforeUlid.isNullOrBlank()) {
                            initialBackfillInProgress = true
                            externalScope.launch(ioContext) {
                                try {
                                    backfillOlderMessages(
                                        group = group,
                                        groupId = groupId,
                                        startBeforeUlid = beforeUlid,
                                        maxPages = INITIAL_GROUP_BACKFILL_MAX_PAGES,
                                        source = "polling_initial"
                                    )
                                } finally {
                                    initialBackfillInProgress = false
                                }
                            }
                        }
                    }
                }
                delay(updateInterval)
            } catch (e: CancellationException) {
                Timber.d("ChatGroupRepository: Group polling cancelled for groupId=$groupId")
                throw e
            } catch (e: Exception) {
                Timber.e(e, "ChatGroupRepository: Error on polling group updates for groupId=$groupId")
                CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error on polling group updates")
                resolvedGroup = null
                initialBackfillInProgress = false
                delay(updateInterval)
            }
        }
    }

    suspend fun syncGroupMessagesOnce(groupId: String, source: String = "manual") {
        runCatching {
            val group = getGroupByIdOrCachedPointer(groupId)
            if (group == null) {
                Timber.w("ChatGroupRepository: One-shot sync skipped, group metadata unavailable groupId=$groupId source=$source")
                return
            }

            val latestUlid = withContext(ioContext) {
                database.groupMessageDao().getLatestSyncedUlid(groupId)
            }
            val newMessageUpdates = if (latestUlid == null) {
                groupMessageNetworkDataSource.getMessagesPage(
                    group = group,
                    limit = INITIAL_GROUP_SYNC_PAGE_SIZE
                )
            } else {
                groupMessageNetworkDataSource.getNewMessages(group, latestUlid)
            }
            val statusUpdates = groupMessageNetworkDataSource.getMessagesUpdatedSince(
                group = group,
                updatedAfterMs = System.currentTimeMillis() - STATUS_UPDATE_LOOKBACK_MS,
                limit = STATUS_UPDATE_POLL_LIMIT
            )
            val updates = GroupMessageSyncResolver.collapse(
                (newMessageUpdates + statusUpdates).map { mapMessageToEntity(it) }
            )
            Timber.i(
                "ChatGroupRepository: One-shot sync source=$source groupId=$groupId fetched=${updates.size} afterUlid=$latestUlid"
            )
            updates.forEach { message ->
                upsertGroupMessage(message)
            }
            if (updates.isNotEmpty()) {
                recoverStalePendingGroupMessages(group, canFinalizeAsError = true)
            }
            if (latestUlid == null) {
                val cursorSelection = GroupBackfillCursorResolver.resolveInitialBackfillCursorFromUlids(
                    newMessageUlids = newMessageUpdates.map { it.ulid },
                    mergedUlids = updates.map { it.ulid }
                )
                val beforeUlid = cursorSelection.beforeUlid
                Timber.i(
                    "ChatGroupRepository: One-shot initial backfill cursor source=%s groupId=%s syncSource=%s beforeUlid=%s newCount=%s statusCount=%s mergedCount=%s",
                    cursorSelection.source.logValue,
                    groupId,
                    source,
                    beforeUlid,
                    newMessageUpdates.size,
                    statusUpdates.size,
                    updates.size
                )
                if (!beforeUlid.isNullOrBlank()) {
                    externalScope.launch(ioContext) {
                        backfillOlderMessages(
                            group = group,
                            groupId = groupId,
                            startBeforeUlid = beforeUlid,
                            maxPages = INITIAL_GROUP_BACKFILL_MAX_PAGES,
                            source = "${source}_initial"
                        )
                    }
                }
            }
        }.onFailure { e ->
            Timber.e(e, "ChatGroupRepository: One-shot sync failed source=$source groupId=$groupId")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: One-shot sync failed source=$source")
        }
    }

    private suspend fun backfillOlderMessages(
        group: ChatGroup,
        groupId: String,
        startBeforeUlid: String,
        maxPages: Int,
        source: String
    ) {
        var beforeUlid: String? = startBeforeUlid
        var page = 0
        while (page < maxPages && !beforeUlid.isNullOrBlank()) {
            val pageMessages = groupMessageNetworkDataSource.getMessagesPage(
                group = group,
                beforeUlid = beforeUlid,
                limit = INITIAL_GROUP_SYNC_PAGE_SIZE
            )
            if (pageMessages.isEmpty()) {
                Timber.v(
                    "ChatGroupRepository: Backfill source=$source groupId=$groupId ended page=$page beforeUlid=$beforeUlid"
                )
                break
            }

            GroupMessageSyncResolver.collapse(pageMessages.map { mapMessageToEntity(it) }).forEach { message ->
                upsertGroupMessage(message)
            }

            page += 1
            beforeUlid = pageMessages.lastOrNull()?.ulid
            Timber.v(
                "ChatGroupRepository: Backfill source=$source groupId=$groupId page=$page fetched=${pageMessages.size} nextBeforeUlid=$beforeUlid"
            )
        }
    }

    private suspend fun upsertGroupMessage(entity: GroupMessageEntity, additionalLookupIds: List<String> = emptyList()) {
        withContext(ioContext) {
            val merged = try {
                database.withTransaction {
                    var working = GroupMessageSyncResolver.normalize(entity)
                    val duplicatesToDelete = linkedSetOf<String>()
                    val existingCandidates = buildList {
                        working.ulid?.let { ulid ->
                            database.groupMessageDao().getByUlid(ulid)?.let(::add)
                        }
                        working.remoteId?.let { remoteId ->
                            database.groupMessageDao().getByRemoteId(remoteId)?.let(::add)
                        }
                        database.groupMessageDao().getById(working.id)?.let(::add)
                        additionalLookupIds.forEach { lookupId ->
                            database.groupMessageDao().getById(lookupId)?.let(::add)
                        }
                    }.distinctBy { it.id }

                    existingCandidates.forEach { existing ->
                        working = GroupMessageSyncResolver.merge(existing, working)
                        if (existing.id != working.id) {
                            duplicatesToDelete.add(existing.id)
                        }
                    }

                    duplicatesToDelete.forEach { duplicateId ->
                        Timber.d("ChatGroupRepository: Removing legacy duplicate message id=$duplicateId")
                        database.groupMessageDao().deleteById(duplicateId)
                    }

                    Timber.d(
                        "ChatGroupRepository: Upserting group message id=%s ulid=%s remoteId=%s",
                        working.id,
                        working.ulid,
                        working.remoteId
                    )
                    database.groupMessageDao().upsertMessage(working)
                    working
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "ChatGroupRepository: Error in upsertGroupMessage")
                CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in upsertGroupMessage")
                return@withContext
            }

            try {
                updateGroupListPreviewIfNewer(merged)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "ChatGroupRepository: Error updating group list preview")
                CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error updating group list preview")
            }
        }
    }

    private suspend fun updateGroupListPreviewIfNewer(message: GroupMessageEntity) {
        val groupId = message.groupId
        if (groupId.isBlank()) {
            return
        }
        if (!GroupMessageEntity.isTerminalStatus(message.status)) {
            return
        }

        val existingGroup = database.groupDao().getGroupById(groupId) ?: return
        if (message.createdAt < existingGroup.lastMessageTime) {
            return
        }

        val currentUserId = ParseUser.getCurrentUser()?.objectId
        val unreadCount = if (currentUserId.isNullOrBlank()) {
            existingGroup.unreadCount
        } else {
            getUnreadCount(groupId, currentUserId)
        }

        database.groupDao().insertGroup(
            GroupEntity(
                id = existingGroup.id,
                name = existingGroup.name,
                avatar = existingGroup.avatar,
                description = existingGroup.description,
                ownerId = existingGroup.ownerId,
                lastMessageText = message.text,
                lastMessageType = message.type,
                lastMessageSenderId = message.senderId,
                lastMessageSenderName = message.senderName,
                lastMessageTime = message.createdAt,
                unreadCount = unreadCount,
                memberCount = existingGroup.memberCount
            )
        )
    }

    suspend fun getGroupMembers(group: ChatGroup): List<GroupMemberEntity> {
        Timber.d("ChatGroupRepository: getGroupMembers() for group=${group.objectId}")
        return try {
            withContext(ioContext) {
                val members = groupMemberNetworkDataSource.getGroupMembers(group)
                Timber.d("ChatGroupRepository: Received ${members.size} members from network")

                members.mapNotNull { member ->
                    try {
                        mapMemberToEntity(member)
                    } catch (e: Exception) {
                        Timber.e(e, "ChatGroupRepository: Error mapping member ${member.objectId}")
                        CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error mapping member")
                        null
                    }
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error in getGroupMembers")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in getGroupMembers")
            emptyList()
        }
    }

    suspend fun addMembers(group: ChatGroup, members: List<Pair<String, Boolean>>): Boolean {
        Timber.d("ChatGroupRepository: addMembers to group=${group.objectId}")
        return try {
            groupMemberNetworkDataSource.addMembers(group, members)
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error in addMembers")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in addMembers")
            false
        }
    }

    suspend fun removeMember(member: com.sosmartlabs.momo.chat.data.remote.model.GroupMember): Boolean {
        Timber.d("ChatGroupRepository: removeMember ${member.objectId}")
        return try {
            groupMemberNetworkDataSource.removeMember(member)
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error in removeMember")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in removeMember")
            throw e
        }
    }

    suspend fun makeAdmin(member: com.sosmartlabs.momo.chat.data.remote.model.GroupMember): Boolean {
        Timber.d("ChatGroupRepository: makeAdmin ${member.objectId}")
        return try {
            groupMemberNetworkDataSource.makeAdmin(member)
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error in makeAdmin")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in makeAdmin")
            false
        }
    }

    suspend fun removeAdmin(member: com.sosmartlabs.momo.chat.data.remote.model.GroupMember): Boolean {
        Timber.d("ChatGroupRepository: removeAdmin ${member.objectId}")
        return try {
            groupMemberNetworkDataSource.removeAdmin(member)
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error in removeAdmin")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error in removeAdmin")
            false
        }
    }

    // ========== Helper Methods ==========

    private data class SenderSummary(
        val senderId: String,
        val senderName: String
    )

    private fun extractSenderSummary(message: GroupMessage): SenderSummary {
        val senderName = when {
            message.user != null -> {
                val firstName = message.user?.getString("firstName").orEmpty()
                val lastName = message.user?.getString("lastName").orEmpty()
                val fullName = "$firstName $lastName".trim()
                if (fullName.isNotEmpty()) {
                    fullName
                } else {
                    appContext.getString(R.string.chat_fallback_user)
                }
            }
            message.wearer != null -> message.wearer?.name()
                ?: appContext.getString(R.string.chat_fallback_wearer)
            else -> appContext.getString(R.string.chat_fallback_unknown)
        }

        val senderId = when {
            message.user != null -> message.user?.objectId ?: ""
            message.wearer != null -> message.wearer?.objectId ?: ""
            else -> ""
        }

        return SenderSummary(
            senderId = senderId,
            senderName = senderName
        )
    }

    private fun mapMessageToEntity(message: GroupMessage): GroupMessageEntity {
        val senderSummary = extractSenderSummary(message)

        val sender = when {
            message.user != null -> GroupMessageEntity.SENDER_USER
            message.wearer != null -> GroupMessageEntity.SENDER_WEARER
            else -> GroupMessageEntity.SENDER_USER
        }

        val senderAvatar = when {
            message.wearer != null -> message.wearer?.image?.url
            message.user != null -> message.user?.getParseFile("image")?.url
            else -> null
        }

        return GroupMessageEntity(
            id = GroupMessageEntity.buildId(message.ulid, message.objectId, message.objectId),
            remoteId = message.objectId,
            groupId = message.group?.objectId ?: "",
            createdAt = message.createdAt?.time ?: System.currentTimeMillis(),
            sender = sender,
            senderId = senderSummary.senderId,
            senderName = senderSummary.senderName,
            senderAvatar = senderAvatar,
            type = message.type ?: "text",
            text = message.text,
            audio = message.audio?.url,
            audioDuration = null,
            image = message.image?.url,
            video = message.video?.url,
            status = message.status ?: "sent",
            ulid = message.ulid
        )
    }

    private fun createPendingGroupMessage(
        groupId: String,
        user: ParseUser,
        type: String,
        ulid: String,
        text: String? = null,
        audio: String? = null,
        image: String? = null,
        video: String? = null
    ): GroupMessageEntity {
        val senderName = buildCurrentUserDisplayName(user)
        return GroupMessageEntity(
            id = GroupMessageEntity.buildId(ulid, null, ulid),
            remoteId = null,
            groupId = groupId,
            createdAt = System.currentTimeMillis(),
            sender = GroupMessageEntity.SENDER_USER,
            senderId = user.objectId ?: "",
            senderName = senderName,
            senderAvatar = user.getParseFile("image")?.url,
            type = type,
            text = text,
            audio = audio,
            audioDuration = null,
            image = image,
            video = video,
            status = GroupMessageEntity.STATUS_SENDING,
            ulid = ulid,
            audioWaveform = null
        )
    }

    private suspend fun sendPendingMessage(
        group: ChatGroup,
        pendingMessage: GroupMessageEntity,
        remoteSend: suspend () -> GroupMessage
    ) {
        try {
            upsertGroupMessage(pendingMessage)
            val savedMessage = remoteSend()
            val savedEntity = mapMessageToEntity(savedMessage)
            val acknowledgedEntity = GroupMessageSyncResolver.acknowledgeLocalSend(savedEntity)
            if (acknowledgedEntity.status != savedEntity.status) {
                Timber.d(
                    "ChatGroupRepository: Locally acknowledging group message ulid=%s remoteId=%s fromStatus=%s toStatus=%s",
                    acknowledgedEntity.ulid,
                    acknowledgedEntity.remoteId,
                    savedEntity.status,
                    acknowledgedEntity.status
                )
            }
            val additionalLookupIds = buildList {
                if (pendingMessage.id != acknowledgedEntity.id) {
                    add(pendingMessage.id)
                }
            }
            upsertGroupMessage(acknowledgedEntity, additionalLookupIds)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: sendPendingMessage failed for ulid=${pendingMessage.ulid}")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: sendPendingMessage failed")
            if (reconcileMessageByUlid(group, pendingMessage.ulid)) {
                scheduleUnresolvedGroupMessageReconciliation(group, pendingMessage.ulid)
                return
            }
            upsertGroupMessage(pendingMessage.copy(status = GroupMessageEntity.STATUS_ERROR))
            throw GroupMessageSendException(
                ulid = pendingMessage.ulid.orEmpty(),
                retryable = true,
                message = appContext.getString(messageTypeToRetryError(pendingMessage.type)),
                cause = e
            )
        }
    }

    suspend fun retryFailedGroupMessage(group: ChatGroup, user: ParseUser, ulid: String) {
        val existingMessage = withContext(ioContext) {
            database.groupMessageDao().getByUlid(ulid)
        } ?: throw GroupMessageSendException(
            ulid = ulid,
            retryable = false,
            message = appContext.getString(R.string.error_retry_group_message_missing)
        )

        when (existingMessage.type) {
            GroupMessageEntity.TYPE_TEXT -> {
                val text = existingMessage.text
                if (text.isNullOrBlank()) {
                    throw GroupMessageSendException(
                        ulid = ulid,
                        retryable = false,
                        message = appContext.getString(R.string.error_retry_group_message_missing)
                    )
                }
                sendPendingMessage(
                    group = group,
                    pendingMessage = existingMessage.copy(status = GroupMessageEntity.STATUS_SENDING)
                ) {
                    groupMessageNetworkDataSource.sendTextMessage(group, user, text, ulid)
                }
            }

            GroupMessageEntity.TYPE_IMAGE -> {
                val imagePath = resolveExistingLocalFilePath(existingMessage.image)
                    ?: throw GroupMessageSendException(
                        ulid = ulid,
                        retryable = false,
                        message = appContext.getString(R.string.error_retry_group_media_missing)
                    )
                sendPendingMessage(
                    group = group,
                    pendingMessage = existingMessage.copy(
                        status = GroupMessageEntity.STATUS_SENDING,
                        image = filePathToUri(imagePath)
                    )
                ) {
                    groupMessageNetworkDataSource.sendImageMessage(group, user, imagePath, ulid)
                }
            }

            GroupMessageEntity.TYPE_AUDIO -> {
                val audioPath = resolveExistingLocalFilePath(existingMessage.audio)
                    ?: throw GroupMessageSendException(
                        ulid = ulid,
                        retryable = false,
                        message = appContext.getString(R.string.error_retry_group_media_missing)
                    )
                sendPendingMessage(
                    group = group,
                    pendingMessage = existingMessage.copy(
                        status = GroupMessageEntity.STATUS_SENDING,
                        audio = filePathToUri(audioPath)
                    )
                ) {
                    groupMessageNetworkDataSource.sendVoiceMessage(group, user, audioPath, ulid)
                }
            }

            else -> throw GroupMessageSendException(
                ulid = ulid,
                retryable = false,
                message = appContext.getString(R.string.error_retry_group_message_unsupported)
            )
        }
    }

    private suspend fun reconcileMessageByUlid(group: ChatGroup, ulid: String?): Boolean {
        val safeUlid = ulid?.takeIf { it.isNotBlank() } ?: return false
        val reconciledMessage = groupMessageNetworkDataSource.getMessageByUlid(group, safeUlid) ?: return false
        upsertGroupMessage(mapMessageToEntity(reconciledMessage))
        return true
    }

    private fun scheduleUnresolvedGroupMessageReconciliation(group: ChatGroup, ulid: String?) {
        val safeUlid = ulid?.takeIf { it.isNotBlank() } ?: return
        reconciliationJobs.remove(safeUlid)?.cancel()
        val job = externalScope.launch(ioContext) {
            for (delayMs in UNRESOLVED_GROUP_MESSAGE_RECONCILIATION_DELAYS_MS) {
                try {
                    delay(delayMs)
                    val localMessage = database.groupMessageDao().getByUlid(safeUlid) ?: return@launch
                    if (GroupMessageEntity.isTerminalStatus(localMessage.status) ||
                        localMessage.status == GroupMessageEntity.STATUS_ERROR
                    ) {
                        return@launch
                    }

                    val reconciled = reconcileMessageByUlid(group, safeUlid)
                    if (!reconciled) {
                        continue
                    }

                    val updatedMessage = database.groupMessageDao().getByUlid(safeUlid) ?: return@launch
                    if (GroupMessageEntity.isTerminalStatus(updatedMessage.status)) {
                        Timber.d(
                            "ChatGroupRepository: Resolved group message status via delayed reconciliation ulid=%s status=%s",
                            safeUlid,
                            updatedMessage.status
                        )
                        return@launch
                    }
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    Timber.e(
                        e,
                        "ChatGroupRepository: Delayed reconciliation failed for group message ulid=$safeUlid"
                    )
                    CrashlyticsLog.recordNonFatalError(
                        e,
                        "ChatGroupRepository: Delayed reconciliation failed for group message"
                    )
                }
            }
        }
        reconciliationJobs[safeUlid] = job
        job.invokeOnCompletion { reconciliationJobs.remove(safeUlid, job) }
    }

    private fun buildCurrentUserDisplayName(user: ParseUser): String {
        val firstName = user.getString("firstName").orEmpty()
        val lastName = user.getString("lastName").orEmpty()
        val fullName = "$firstName $lastName".trim()
        return when {
            fullName.isNotBlank() -> fullName
            !user.username.isNullOrBlank() -> user.username
            !user.email.isNullOrBlank() -> user.email ?: appContext.getString(R.string.chat_fallback_user)
            else -> appContext.getString(R.string.chat_fallback_user)
        }
    }

    private fun filePathToUri(path: String): String {
        return LocalMediaUriResolver.filePathToUri(path)
    }

    private fun resolveExistingLocalFilePath(uriOrPath: String?): String? {
        return LocalMediaUriResolver.resolveExistingLocalFilePath(uriOrPath)
    }

    private suspend fun recoverStalePendingGroupMessages(group: ChatGroup, canFinalizeAsError: Boolean) {
        val groupId = group.objectId?.takeIf { it.isNotBlank() } ?: return
        val staleBeforeMs = System.currentTimeMillis() - STALE_PENDING_GROUP_MESSAGE_GRACE_MS
        val staleMessages = withContext(ioContext) {
            database.groupMessageDao().getStalePendingOutgoingMessages(groupId, staleBeforeMs)
        }

        if (staleMessages.isEmpty()) {
            return
        }

        Timber.i(
            "ChatGroupRepository: Recovering %s stale pending group messages for groupId=%s canFinalizeAsError=%s",
            staleMessages.size,
            groupId,
            canFinalizeAsError
        )

        staleMessages.forEach { message ->
            try {
                val reconciled = reconcileMessageByUlid(group, message.ulid)
                if (reconciled) {
                    scheduleUnresolvedGroupMessageReconciliation(group, message.ulid)
                } else if (canFinalizeAsError) {
                    upsertGroupMessage(message.copy(status = GroupMessageEntity.STATUS_ERROR))
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "ChatGroupRepository: Error recovering stale pending group message ulid=${message.ulid}")
                CrashlyticsLog.recordNonFatalError(
                    e,
                    "ChatGroupRepository: Error recovering stale pending group message"
                )
            }
        }
    }

    private fun messageTypeToRetryError(type: String): Int {
        return when (type) {
            GroupMessageEntity.TYPE_IMAGE -> R.string.error_send_image_failed_retry
            GroupMessageEntity.TYPE_AUDIO -> R.string.error_send_audio_failed_retry
            else -> R.string.error_send_text_failed_retry
        }
    }

    private fun mapMemberToEntity(member: com.sosmartlabs.momo.chat.data.remote.model.GroupMember): GroupMemberEntity {
        val avatar = when {
            member.wearer != null -> member.wearer?.image?.url
            member.user != null -> member.user?.getParseFile("image")?.url
            else -> null
        }

        val name = when {
            member.wearer != null -> member.wearer?.name() ?: ""
            member.user != null -> {
                val firstName = member.user?.getString("firstName") ?: ""
                val lastName = member.user?.getString("lastName") ?: ""
                val fullName = "$firstName $lastName".trim()
                if (fullName.isNotEmpty()) {
                    fullName
                } else {
                    member.user?.username
                        ?: member.user?.email
                        ?: appContext.getString(R.string.chat_fallback_unknown_user)
                }
            }
            else -> member.name ?: appContext.getString(R.string.chat_fallback_unknown)
        }

        return GroupMemberEntity(
            id = member.objectId ?: "",
            groupId = member.group?.objectId ?: "",
            userId = member.user?.objectId,
            wearerId = member.wearer?.objectId,
            name = name,
            avatar = avatar,
            isWearer = member.isWearer ?: false,
            wearerModelName = member.wearer?.modelName(),
            status = member.status ?: "active",
            role = member.role ?: "member",
            joinedAt = member.joinedAt?.time
        )
    }

    suspend fun getUnreadCount(groupId: String, currentUserId: String): Int {
        Timber.d("ChatGroupRepository: getUnreadCount() called for groupId=$groupId, currentUserId=$currentUserId")
        return try {
            val lastViewedAt = withContext(ioContext) {
                database.chatLastViewedDao().getLastViewed(groupId)?.lastViewedAt ?: 0L
            }
            Timber.v("ChatGroupRepository: getUnreadCount() lastViewedAt=$lastViewedAt for groupId=$groupId")
            val count = withContext(ioContext) {
                database.groupMessageDao().getUnreadCount(groupId, currentUserId, lastViewedAt)
            }
            Timber.d("ChatGroupRepository: getUnreadCount() found $count unread messages for groupId=$groupId")
            count
        } catch (e: CancellationException) {
            Timber.d("ChatGroupRepository: getUnreadCount() cancelled for groupId=$groupId")
            throw e
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error getting unread count for groupId=$groupId")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error getting unread count for groupId=$groupId")
            0
        }
    }

    suspend fun updateLastViewed(groupId: String) {
        Timber.d("ChatGroupRepository: updateLastViewed() called for groupId=$groupId")
        try {
            updateLastViewedIfNewer(groupId, System.currentTimeMillis())
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error updating last viewed for groupId=$groupId")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error updating last viewed for groupId=$groupId")
        }
    }

    suspend fun updateLastViewedIfNewer(groupId: String, timestamp: Long) {
        if (timestamp <= 0L) {
            return
        }
        Timber.d("ChatGroupRepository: updateLastViewedIfNewer() called for groupId=$groupId timestamp=$timestamp")
        withContext(ioContext) {
            val existing = database.chatLastViewedDao().getLastViewed(groupId)
            if (existing != null && timestamp <= existing.lastViewedAt) {
                return@withContext
            }
            database.chatLastViewedDao().insertOrUpdate(
                com.sosmartlabs.momo.chat.data.local.entity.ChatLastViewedEntity(
                    chatId = groupId,
                    lastViewedAt = timestamp,
                    isGroup = true
                )
            )
            database.groupDao().updateUnreadCount(groupId, 0)
        }
        Timber.d("ChatGroupRepository: updateLastViewedIfNewer() updated timestamp=$timestamp for groupId=$groupId")
    }

    suspend fun updateGroupAudioWaveforms(updates: List<ChatAudioWaveformUpdate>) {
        Timber.d("ChatGroupRepository: updateGroupAudioWaveforms() called for ${updates.size} messages")
        try {
            database.groupMessageDao().updateGroupAudioWaveforms(updates)
            Timber.d("ChatGroupRepository: updateGroupAudioWaveforms() completed successfully")
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error updating group audio waveforms")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error updating group audio waveforms")
        }
    }

    suspend fun updateGroupAudioDurations(updates: List<ChatAudioDurationUpdate>) {
        Timber.d("ChatGroupRepository: updateGroupAudioDurations() called for ${updates.size} messages")
        try {
            database.groupMessageDao().updateGroupAudioDurations(updates)
            Timber.d("ChatGroupRepository: updateGroupAudioDurations() completed successfully")
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: Error updating group audio durations")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: Error updating group audio durations")
        }
    }

    // ========== Group Lifecycle (leave / delete / purge) ==========

    /**
     * Tears down a group's local-DB state and announces the purge on
     * [GroupChatEventBus] so any foreground screen viewing the group can
     * react. OS notification cancellation is the caller's responsibility
     * (see `ChatMessagingNotificationBuilder` / `GroupMembershipNotificationHandler`)
     * because the builder is a `@Singleton` and needs Context — keeping the
     * repository context-free.
     */
    suspend fun purgeLocalGroup(groupId: String) {
        if (groupId.isBlank()) return
        withContext(ioContext) {
            try {
                database.groupMessageDao().deleteAllMessagesForGroup(groupId)
                database.groupDao().deleteGroupsByIds(listOf(groupId))
                Timber.i("ChatGroupRepository: purgeLocalGroup completed for groupId=$groupId")
            } catch (e: Exception) {
                Timber.e(e, "ChatGroupRepository: purgeLocalGroup failed for groupId=$groupId")
                CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: purgeLocalGroup failed")
            }
        }
        groupChatEventBus.publish(GroupChatEventBus.GroupPurged(groupId))
    }

    /**
     * Calls the `leaveChatGroup` cloud function for the current user and
     * cleans up local state on success. The cloud's `afterSaveGroupMember`
     * fires a `left` membership push to other members — the leaver does
     * NOT receive a push, so local cleanup is triggered from the success
     * path here.
     */
    suspend fun leaveGroup(groupId: String): LeaveGroupResult = withContext(ioContext) {
        Timber.d("ChatGroupRepository: leaveGroup groupId=$groupId")
        try {
            val params = hashMapOf<String, Any>("groupId" to groupId)
            val raw = ParseCloud.callFunction<HashMap<*, *>>("leaveChatGroup", params)
            val success = ChatGroupCloudResponses.parseLeaveResponse(raw)
            purgeLocalGroup(groupId)
            success
        } catch (e: ParseException) {
            Timber.e(e, "ChatGroupRepository: leaveGroup failed parseCode=${e.code}")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: leaveGroup failed")
            LeaveGroupResult.Failure(parseCode = e.code, message = e.message)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: leaveGroup failed")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: leaveGroup failed")
            LeaveGroupResult.Failure(parseCode = null, message = e.message)
        }
    }

    /**
     * Calls the `deleteChatGroup` cloud function and cleans up local state
     * on success. Other members learn of the deletion via a `group_deleted`
     * push (code 45); the admin who initiated the delete is excluded from
     * recipients by the cloud, so we rely on this success path to purge
     * the local DB for them.
     */
    suspend fun deleteGroup(groupId: String): DeleteGroupResult = withContext(ioContext) {
        Timber.d("ChatGroupRepository: deleteGroup groupId=$groupId")
        try {
            val params = hashMapOf<String, Any>("groupId" to groupId)
            val raw = ParseCloud.callFunction<HashMap<*, *>>("deleteChatGroup", params)
            val success = ChatGroupCloudResponses.parseDeleteResponse(raw)
            purgeLocalGroup(groupId)
            success
        } catch (e: ParseException) {
            Timber.e(e, "ChatGroupRepository: deleteGroup failed parseCode=${e.code}")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: deleteGroup failed")
            DeleteGroupResult.Failure(parseCode = e.code, message = e.message)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Timber.e(e, "ChatGroupRepository: deleteGroup failed")
            CrashlyticsLog.recordNonFatalError(e, "ChatGroupRepository: deleteGroup failed")
            DeleteGroupResult.Failure(parseCode = null, message = e.message)
        }
    }
}
