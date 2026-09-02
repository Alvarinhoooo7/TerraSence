package com.sosmartlabs.momo.chat.data.repository

import android.content.Context
import com.parse.ParseUser
import com.sosmartlabs.momo.chat.data.remote.datasource.ChatNetworkDataSource
import com.sosmartlabs.momo.chat.data.remote.datasource.ChatUserNetworkDataSource
import com.sosmartlabs.momo.chat.data.remote.datasource.MessageNetworkDataSource
import com.sosmartlabs.momo.chat.data.local.database.ChatDatabase
import com.sosmartlabs.momo.chat.data.local.entity.*
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

class ChatRepository @Inject constructor(
    @ApplicationContext val context: Context,
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val database: ChatDatabase,
    private val chatUserNetworkDataSource: ChatUserNetworkDataSource,
    private val messageNetworkDataSource: MessageNetworkDataSource
) {

    private data class ChatRoutingInputs(
        val hasModelField: Boolean,
        val modelValue: Int?,
        val legacyCacheCount: Int,
        val chatUserCacheCount: Int
    )

    private fun buildLegacyChatId(wearer: Wearer): String = wearer.objectId

    private fun buildChatUserChatId(wearer: Wearer, user: ParseUser): String =
        "${wearer.objectId}_${user.objectId}"

    private fun getChatId(backend: ChatBackend, wearer: Wearer, user: ParseUser): String {
        return when (backend) {
            ChatBackend.CHAT_USER -> buildChatUserChatId(wearer, user)
            ChatBackend.LEGACY_MESSAGE -> buildLegacyChatId(wearer)
        }
    }

    private fun getNetworkDataSource(backend: ChatBackend): ChatNetworkDataSource<*> {
        return when (backend) {
            ChatBackend.CHAT_USER -> chatUserNetworkDataSource
            ChatBackend.LEGACY_MESSAGE -> messageNetworkDataSource
        }
    }

    private suspend fun resolveRoutingInputs(wearer: Wearer, user: ParseUser): ChatRoutingInputs {
        val hasModelField = wearer.has("model")
        val modelValue = if (hasModelField) {
            runCatching { wearer.getInt("model") }
                .onFailure { e ->
                    Timber.e(
                        e,
                        "ChatRepository: failed to read raw model int for wearer=${wearer.objectId}"
                    )
                    CrashlyticsLog.recordNonFatalError(
                        e,
                        "ChatRepository: failed to read raw model int for wearer=${wearer.objectId}"
                    )
                }
                .getOrNull()
        } else {
            null
        }

        if (!hasModelField) {
            val message =
                "ChatRepository: missing model field for wearer=${wearer.objectId}; chat routing will apply fallback"
            Timber.w(message)
            CrashlyticsLog.log(message)
        }

        if (ChatBackendResolver.isUnknownModelInt(modelValue)) {
            val message =
                "ChatRepository: unknown model int for wearer=${wearer.objectId}: model=$modelValue"
            Timber.w(message)
            CrashlyticsLog.log(message)
        }

        val shouldUseCacheHints =
            ChatBackendResolver.shouldUseCacheHints(hasModelField, modelValue)
        val legacyCacheCount: Int
        val chatUserCacheCount: Int
        if (shouldUseCacheHints) {
            val legacyChatId = buildLegacyChatId(wearer)
            val chatUserChatId = buildChatUserChatId(wearer, user)
            val cacheCounts = withContext(ioContext) {
                val legacyCount = database.chatDao().getMessageCountByChatId(legacyChatId)
                val chatUserCount = database.chatDao().getMessageCountByChatId(chatUserChatId)
                legacyCount to chatUserCount
            }
            legacyCacheCount = cacheCounts.first
            chatUserCacheCount = cacheCounts.second
        } else {
            legacyCacheCount = 0
            chatUserCacheCount = 0
        }

        return ChatRoutingInputs(
            hasModelField = hasModelField,
            modelValue = modelValue,
            legacyCacheCount = legacyCacheCount,
            chatUserCacheCount = chatUserCacheCount
        )
    }

    private suspend fun resolveBackend(wearer: Wearer, user: ParseUser): ChatBackend {
        val inputs = resolveRoutingInputs(wearer, user)
        val backend = ChatBackendResolver.resolve(
            ChatBackendResolutionInput(
                hasModelField = inputs.hasModelField,
                modelValue = inputs.modelValue,
                legacyCacheCount = inputs.legacyCacheCount,
                chatUserCacheCount = inputs.chatUserCacheCount
            )
        )
        val message =
            "ChatRepository: resolved chat backend=$backend wearer=${wearer.objectId} user=${user.objectId} " +
                "modelPresent=${inputs.hasModelField} modelValue=${inputs.modelValue} " +
                "legacyCacheCount=${inputs.legacyCacheCount} chatUserCacheCount=${inputs.chatUserCacheCount}"
        Timber.i(message)
        CrashlyticsLog.log(message)
        return backend
    }

    fun getChatFromRoom(watch: Wearer, user: ParseUser): Flow<List<ChatEntity>> {
        return flow {
            val backend = resolveBackend(watch, user)
            val chatId = getChatId(backend, watch, user)
            Timber.d(
                "ChatRepository: getChatFromRoom() for chatId=$chatId backend=$backend wearer=${watch.objectId} user=${user.objectId}"
            )
            emitAll(database.chatDao().getChatList(id = chatId))
        }
    }

    suspend fun getChatFromNetwork(watch: Wearer, user: ParseUser) {
        Timber.d("ChatRepository: getChatFromNetwork() called for wearer=${watch.objectId}, user=${user.objectId}")
        try {
            withContext(ioContext) {
                val backend = resolveBackend(watch, user)
                val chatId = getChatId(backend, watch, user)
                val dataSource = getNetworkDataSource(backend)
                Timber.v("ChatRepository: Fetching chats from network data source: ${dataSource::class.simpleName}")
                val chats = dataSource.getChats(watch, user)
                Timber.d(
                    "ChatRepository: Received ${chats.size} chats from network for chatId=$chatId backend=$backend"
                )
                chats.forEach {
                    insertOrUpdateChatMessageRoom(it)
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "ChatRepository: Error in getChatFromNetwork for wearer=${watch.objectId}, user=${user.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "ChatRepository: Error in getChatFromNetwork for wearer=${watch.objectId}, user=${user.objectId}")
        }
    }

    suspend fun syncChatMessagesOnce(wearer: Wearer, user: ParseUser, source: String = "manual") {
        runCatching {
            getChatFromNetwork(wearer, user)
            Timber.i(
                "ChatRepository: One-shot sync completed source=$source wearer=${wearer.objectId}, user=${user.objectId}"
            )
        }.onFailure { e ->
            Timber.e(
                e,
                "ChatRepository: One-shot sync failed source=$source wearer=${wearer.objectId}, user=${user.objectId}"
            )
            CrashlyticsLog.recordNonFatalError(
                e,
                "ChatRepository: One-shot sync failed source=$source wearer=${wearer.objectId}, user=${user.objectId}"
            )
        }
    }

    suspend fun listenLiveQuery(wearer: Wearer, user: ParseUser) {
        Timber.d("ChatRepository: listenLiveQuery() started for wearer=${wearer.objectId}, user=${user.objectId}")
        try {
            val backend = resolveBackend(wearer, user)
            getNetworkDataSource(backend).listenLiveQuery(wearer, user)
                .catch { e ->
                    Timber.e(e, "ChatRepository: Error in listenLiveQuery flow for wearer=${wearer.objectId}, user=${user.objectId}")
                    CrashlyticsLog.recordNonFatalError(e, "ChatRepository: Error in listenLiveQuery flow for wearer=${wearer.objectId}, user=${user.objectId}")
                    throw e
                }
                .collect { message ->
                    Timber.v("ChatRepository: listenLiveQuery() received message id=${message.id}")
                    insertOrUpdateChatMessageRoom(message)
                }
        } catch (e: CancellationException) {
            // Leaving the chat cancels this collector — normal, and swallowing it here
            // would break structured concurrency for the caller.
            throw e
        } catch (e: Exception) {
            Timber.e(e, "ChatRepository: Exception in listenLiveQuery for wearer=${wearer.objectId}, user=${user.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "ChatRepository: Exception in listenLiveQuery for wearer=${wearer.objectId}, user=${user.objectId}")
        }
    }

    /**
     * Polls the message updates for the given watch and user at given update interval.
     * Updates found are stored in Room database
     * @param wearer Watch in this chat
     * @param user Current user
     * @param updateInterval Interval in millisecond for polling new messages to database
     */
    suspend fun pollMessageUpdates(wearer: Wearer, user: ParseUser, updateInterval: Long) {
        Timber.d("ChatRepository: pollMessageUpdates() started for wearer=${wearer.objectId}, user=${user.objectId}, interval=${updateInterval}ms")
        val backend = resolveBackend(wearer, user)
        val chatId = getChatId(backend, wearer, user)
        val dataSource = getNetworkDataSource(backend)
        while (currentCoroutineContext().isActive) {
            delay(updateInterval)
            runCatching {
                Timber.v("ChatRepository: pollMessageUpdates() fetching sent message ids for chatId=$chatId")
                val sentMessageIds = database.chatDao().getSentChatsMessageIdsForUpdate(chatId)
                Timber.v("ChatRepository: pollMessageUpdates() found ${sentMessageIds.size} sent message ids")
                Timber.v("ChatRepository: pollMessageUpdates() requesting chat updates from network")
                dataSource.getChatUpdates(wearer, user, sentMessageIds)
            }.onSuccess { updates ->
                Timber.d("ChatRepository: pollMessageUpdates() received ${updates.size} updates")
                updates.forEach { message ->
                    Timber.v("ChatRepository: pollMessageUpdates() processing update message id=${message.id}")
                    insertOrUpdateChatMessageRoom(message)
                }
            }.onFailure { throwable ->
                Timber.e(throwable, "ChatRepository: Error on polling chat message updates for wearer=${wearer.objectId}, user=${user.objectId}")
                CrashlyticsLog.recordNonFatalError(throwable, "ChatRepository: Error on polling chat message updates for wearer=${wearer.objectId}, user=${user.objectId}")
            }
        }
        Timber.d("ChatRepository: pollMessageUpdates() coroutine ended for wearer=${wearer.objectId}, user=${user.objectId}")
    }

    private suspend fun insertOrUpdateChatMessageRoom(chat: ChatWebUpdate) {
        withContext(ioContext) {
            try {
                val exists = database.chatDao().exists(chat.id)
                if (!exists) {
                    database.chatDao().insertChatMessage(chat)
                } else {
                    database.chatDao().updateChatMessage(chat)
                }
            } catch (e: Exception) {
                Timber.e(e, "ChatRepository: Error in insertOrUpdateChatMessageRoom for message id=${chat.id}")
                CrashlyticsLog.recordNonFatalError(e, "ChatRepository: Error in insertOrUpdateChatMessageRoom for message id=${chat.id}")
            }
        }
    }

    suspend fun sendTextMessage(wearer: Wearer, user: ParseUser, text: String) {
        Timber.d("ChatRepository: [TIMESTAMP_DEBUG] Sending text message to wearer=${wearer.objectId}, user=${user.objectId}")
        try {
            val backend = resolveBackend(wearer, user)
            getNetworkDataSource(backend).sendTextMessage(wearer, user, text) { chat ->
                Timber.d("ChatRepository: [TIMESTAMP_DEBUG] Text message created id=${chat.id}, timestamp=${chat.createdAt}")
                insertOrUpdateChatMessageRoom(chat)
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Timber.e(e, "ChatRepository: Error sending text message to wearer=${wearer.objectId}, user=${user.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "ChatRepository: Error sending text message to wearer=${wearer.objectId}, user=${user.objectId}")
            throw e
        }
    }

    suspend fun sendImageMessage(wearer: Wearer, user: ParseUser, currentPhotoPath: String) {
        Timber.d("ChatRepository: [TIMESTAMP_DEBUG] Sending image message to wearer=${wearer.objectId}, user=${user.objectId}")
        try {
            val backend = resolveBackend(wearer, user)
            getNetworkDataSource(backend).sendImageMessage(wearer, user, currentPhotoPath) { chat ->
                Timber.d("ChatRepository: [TIMESTAMP_DEBUG] Image message created id=${chat.id}, timestamp=${chat.createdAt}")
                insertOrUpdateChatMessageRoom(chat)
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Timber.e(e, "ChatRepository: Error sending image message to wearer=${wearer.objectId}, user=${user.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "ChatRepository: Error sending image message to wearer=${wearer.objectId}, user=${user.objectId}")
            throw e
        }
    }

    suspend fun sendVoiceMessage(wearer: Wearer, user: ParseUser, audioPath: String) {
        Timber.d("ChatRepository: [TIMESTAMP_DEBUG] Sending voice message to wearer=${wearer.objectId}, user=${user.objectId}")
        try {
            val backend = resolveBackend(wearer, user)
            getNetworkDataSource(backend).sendVoiceMessage(wearer, user, audioPath) { chat ->
                Timber.d("ChatRepository: [TIMESTAMP_DEBUG] Voice message created id=${chat.id}, timestamp=${chat.createdAt}")
                insertOrUpdateChatMessageRoom(chat)
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Timber.e(e, "ChatRepository: Error sending voice message to wearer=${wearer.objectId}, user=${user.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "ChatRepository: Error sending voice message to wearer=${wearer.objectId}, user=${user.objectId}")
            throw e
        }
    }

    suspend fun updateAudioDurations(messages: List<ChatAudioDurationUpdate>) {
        Timber.d("ChatRepository: updateAudioDurations() called for ${messages.size} messages")
        try {
            database.chatDao().updateChatAudioDurations(messages)
            Timber.d("ChatRepository: updateAudioDurations() completed successfully")
        } catch (e: Exception) {
            Timber.e(e, "ChatRepository: Error updating audio durations")
            CrashlyticsLog.recordNonFatalError(e, "ChatRepository: Error updating audio durations")
        }
    }

    suspend fun updateAudioWaveforms(updates: List<ChatAudioWaveformUpdate>) {
        Timber.d("ChatRepository: updateAudioWaveforms() called for ${updates.size} messages")
        try {
            database.chatDao().updateChatAudioWaveforms(updates)
            Timber.d("ChatRepository: updateAudioWaveforms() completed successfully")
        } catch (e: Exception) {
            Timber.e(e, "ChatRepository: Error updating audio waveforms")
            CrashlyticsLog.recordNonFatalError(e, "ChatRepository: Error updating audio waveforms")
        }
    }

    // Helper methods for timestamp debugging
    suspend fun countDuplicateTimestamps(chatId: String): Int {
        Timber.d("ChatRepository: countDuplicateTimestamps() called for chatId=$chatId")
        return try {
            val count = withContext(ioContext) {
                database.chatDao().countDuplicateTimestamps(chatId)
            }
            Timber.d("ChatRepository: countDuplicateTimestamps() found $count duplicates for chatId=$chatId")
            count
        } catch (e: Exception) {
            Timber.e(e, "ChatRepository: Error counting duplicate timestamps for chatId=$chatId")
            CrashlyticsLog.recordNonFatalError(e, "ChatRepository: Error counting duplicate timestamps for chatId=$chatId")
            0
        }
    }

    suspend fun getMessagesInTimeWindow(chatId: String, startTime: Long, endTime: Long): List<ChatEntity> {
        Timber.d("ChatRepository: getMessagesInTimeWindow() called for chatId=$chatId, startTime=$startTime, endTime=$endTime")
        return try {
            val messages = withContext(ioContext) {
                database.chatDao().getMessagesInTimeWindow(chatId, startTime, endTime)
            }
            Timber.d("ChatRepository: getMessagesInTimeWindow() found ${messages.size} messages for chatId=$chatId")
            messages
        } catch (e: Exception) {
            Timber.e(e, "ChatRepository: Error getting messages in time window for chatId=$chatId")
            CrashlyticsLog.recordNonFatalError(e, "ChatRepository: Error getting messages in time window for chatId=$chatId")
            emptyList()
        }
    }

    suspend fun getUnreadCount(wearer: Wearer, user: ParseUser): Int {
        Timber.d("ChatRepository: getUnreadCount() called for wearer=${wearer.objectId}, user=${user.objectId}")
        return try {
            val backend = resolveBackend(wearer, user)
            val chatId = getChatId(backend, wearer, user)
            val lastViewedAt = withContext(ioContext) {
                database.chatLastViewedDao().getLastViewed(chatId)?.lastViewedAt ?: 0L
            }
            Timber.v("ChatRepository: getUnreadCount() lastViewedAt=$lastViewedAt for chatId=$chatId")
            val count = withContext(ioContext) {
                database.chatDao().getUnreadCount(chatId, lastViewedAt)
            }
            Timber.d("ChatRepository: getUnreadCount() found $count unread messages for chatId=$chatId")
            count
        } catch (e: CancellationException) {
            Timber.d("ChatRepository: getUnreadCount() cancelled for wearer=${wearer.objectId}, user=${user.objectId}")
            throw e
        } catch (e: Exception) {
            Timber.e(e, "ChatRepository: Error getting unread count for wearer=${wearer.objectId}, user=${user.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "ChatRepository: Error getting unread count for wearer=${wearer.objectId}, user=${user.objectId}")
            0
        }
    }

    suspend fun updateLastViewed(wearer: Wearer, user: ParseUser) {
        Timber.d("ChatRepository: updateLastViewed() called for wearer=${wearer.objectId}, user=${user.objectId}")
        try {
            val backend = resolveBackend(wearer, user)
            val chatId = getChatId(backend, wearer, user)
            val timestamp = System.currentTimeMillis()
            withContext(ioContext) {
                database.chatLastViewedDao().insertOrUpdate(
                    ChatLastViewedEntity(chatId = chatId, lastViewedAt = timestamp, isGroup = false)
                )
            }
            Timber.d("ChatRepository: updateLastViewed() updated timestamp=$timestamp for chatId=$chatId")
        } catch (e: Exception) {
            Timber.e(e, "ChatRepository: Error updating last viewed for wearer=${wearer.objectId}, user=${user.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "ChatRepository: Error updating last viewed for wearer=${wearer.objectId}, user=${user.objectId}")
        }
    }

    suspend fun updateLastViewedIfNewer(wearer: Wearer, user: ParseUser, timestamp: Long) {
        if (timestamp <= 0L) {
            return
        }
        Timber.d(
            "ChatRepository: updateLastViewedIfNewer() called for wearer=${wearer.objectId}, user=${user.objectId}, timestamp=$timestamp"
        )
        try {
            val backend = resolveBackend(wearer, user)
            val chatId = getChatId(backend, wearer, user)
            withContext(ioContext) {
                val existing = database.chatLastViewedDao().getLastViewed(chatId)
                if (existing != null && timestamp <= existing.lastViewedAt) {
                    return@withContext
                }
                database.chatLastViewedDao().insertOrUpdate(
                    ChatLastViewedEntity(chatId = chatId, lastViewedAt = timestamp, isGroup = false)
                )
            }
        } catch (e: Exception) {
            Timber.e(
                e,
                "ChatRepository: Error updating last viewed if newer for wearer=${wearer.objectId}, user=${user.objectId}"
            )
            CrashlyticsLog.recordNonFatalError(
                e,
                "ChatRepository: Error updating last viewed if newer for wearer=${wearer.objectId}, user=${user.objectId}"
            )
        }
    }
}
