package com.sosmartlabs.momo.chat.data.remote.datasource

import android.content.Context
import com.parse.ParseFile
import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.coroutines.suspendFind
import com.parse.coroutines.suspendSave
import com.parse.livequery.ParseLiveQueryClient
import com.sosmartlabs.momo.chat.data.remote.model.ChatGroup
import com.sosmartlabs.momo.chat.data.remote.model.GroupMessage
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.io.File
import java.util.Date
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext
import kotlin.random.Random

@OptIn(ExperimentalCoroutinesApi::class)
class GroupMessageNetworkDataSource @Inject constructor(
    @ApplicationContext context: Context,
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext
) {
    companion object {
        private const val RECONNECT_BASE_DELAY_MS = 1_000L
        private const val RECONNECT_MAX_DELAY_MS = 30_000L
    }

    private var parseLiveQueryClient: ParseLiveQueryClient? = null

    fun getReconnectDelayMs(attempt: Int): Long {
        val safeAttempt = attempt.coerceAtLeast(1)
        val exponentialDelay = (RECONNECT_BASE_DELAY_MS shl (safeAttempt - 1))
            .coerceAtMost(RECONNECT_MAX_DELAY_MS)
        val jitter = Random.nextLong(0, (exponentialDelay / 2L).coerceAtLeast(1L))
        return (exponentialDelay + jitter).coerceAtMost(RECONNECT_MAX_DELAY_MS)
    }

    suspend fun getMessages(group: ChatGroup, limit: Int = 25): List<GroupMessage> {
        Timber.d("GroupMessageNetworkDataSource: getMessages for group=${group.objectId}, limit=$limit")
        return withContext(ioContext) {
            try {
                val query = ParseQuery.getQuery(GroupMessage::class.java)
                    .whereEqualTo("group", group)
                    .orderByDescending("ulid")
                    .setLimit(limit)
                    .include("user")
                    .include("wearer")

                val messages = query.suspendFind()
                Timber.d("GroupMessageNetworkDataSource: Found ${messages.size} messages")
                messages.reversed() // Reverse to get chronological order
            } catch (e: Exception) {
                Timber.e(e, "GroupMessageNetworkDataSource: Error in getMessages")
                CrashlyticsLog.recordNonFatalError(e, "GroupMessageNetworkDataSource: Error in getMessages")
                emptyList()
            }
        }
    }

    suspend fun getNewMessages(group: ChatGroup, afterUlid: String?): List<GroupMessage> {
        Timber.d("GroupMessageNetworkDataSource: getNewMessages for group=${group.objectId}, afterUlid=$afterUlid")
        return getMessagesPage(group = group, afterUlid = afterUlid)
    }

    suspend fun getMessagesPage(
        group: ChatGroup,
        afterUlid: String? = null,
        beforeUlid: String? = null,
        limit: Int? = null
    ): List<GroupMessage> {
        Timber.d(
            "GroupMessageNetworkDataSource: getMessagesPage for group=${group.objectId}, afterUlid=$afterUlid, beforeUlid=$beforeUlid, limit=$limit"
        )
        return withContext(ioContext) {
            try {
                val query = ParseQuery.getQuery(GroupMessage::class.java)
                    .whereEqualTo("group", group)
                    .orderByDescending("ulid")
                    .include("user")
                    .include("wearer")

                if (afterUlid != null) {
                    query.whereGreaterThan("ulid", afterUlid)
                }
                if (beforeUlid != null) {
                    query.whereLessThan("ulid", beforeUlid)
                }
                if (limit != null) {
                    query.setLimit(limit)
                }

                query.suspendFind()
            } catch (e: Exception) {
                Timber.e(e, "GroupMessageNetworkDataSource: Error in getMessagesPage")
                CrashlyticsLog.recordNonFatalError(e, "GroupMessageNetworkDataSource: Error in getMessagesPage")
                emptyList()
            }
        }
    }

    suspend fun getMessagesUpdatedSince(
        group: ChatGroup,
        updatedAfterMs: Long,
        limit: Int = 100
    ): List<GroupMessage> {
        if (updatedAfterMs <= 0L) {
            return emptyList()
        }
        Timber.d(
            "GroupMessageNetworkDataSource: getMessagesUpdatedSince group=${group.objectId}, updatedAfterMs=$updatedAfterMs, limit=$limit"
        )
        return withContext(ioContext) {
            try {
                ParseQuery.getQuery(GroupMessage::class.java)
                    .whereEqualTo("group", group)
                    .whereGreaterThan("updatedAt", Date(updatedAfterMs))
                    .orderByDescending("updatedAt")
                    .include("user")
                    .include("wearer")
                    .setLimit(limit)
                    .suspendFind()
            } catch (e: Exception) {
                Timber.e(e, "GroupMessageNetworkDataSource: Error in getMessagesUpdatedSince")
                CrashlyticsLog.recordNonFatalError(e, "GroupMessageNetworkDataSource: Error in getMessagesUpdatedSince")
                emptyList()
            }
        }
    }

    suspend fun sendTextMessage(
        group: ChatGroup,
        user: ParseUser,
        text: String,
        ulid: String
    ): GroupMessage {
        Timber.d("GroupMessageNetworkDataSource: sendTextMessage to group=${group.objectId}")
        return withContext(ioContext) {
            try {
                GroupMessage().apply {
                    this.group = group
                    this.user = user
                    this.type = "text"
                    this.text = text
                    this.status = "sending"
                    this.ulid = ulid
                }.also { message ->
                    message.suspendSave()
                    Timber.d("GroupMessageNetworkDataSource: Text message sent, objectId=${message.objectId}")
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "GroupMessageNetworkDataSource: Error in sendTextMessage")
                CrashlyticsLog.recordNonFatalError(e, "GroupMessageNetworkDataSource: Error in sendTextMessage")
                throw e
            }
        }
    }

    suspend fun sendImageMessage(
        group: ChatGroup,
        user: ParseUser,
        imagePath: String,
        ulid: String
    ): GroupMessage {
        Timber.d("GroupMessageNetworkDataSource: sendImageMessage to group=${group.objectId}")
        return withContext(ioContext) {
            try {
                val imageFile = File(imagePath)
                val parseFile = ParseFile(imageFile.name, imageFile.readBytes())
                parseFile.save()

                GroupMessage().apply {
                    this.group = group
                    this.user = user
                    this.type = "image"
                    this.image = parseFile
                    this.status = "sending"
                    this.ulid = ulid
                }.also { message ->
                    message.suspendSave()
                    Timber.d("GroupMessageNetworkDataSource: Image message sent, objectId=${message.objectId}")
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "GroupMessageNetworkDataSource: Error in sendImageMessage")
                CrashlyticsLog.recordNonFatalError(e, "GroupMessageNetworkDataSource: Error in sendImageMessage")
                throw e
            }
        }
    }

    suspend fun sendVoiceMessage(
        group: ChatGroup,
        user: ParseUser,
        audioPath: String,
        ulid: String
    ): GroupMessage {
        Timber.d("GroupMessageNetworkDataSource: sendVoiceMessage to group=${group.objectId}")
        return withContext(ioContext) {
            try {
                val audioFile = File(audioPath)
                val parseFile = ParseFile(audioFile.name, audioFile.readBytes())
                parseFile.save()

                GroupMessage().apply {
                    this.group = group
                    this.user = user
                    this.type = "audio"
                    this.audio = parseFile
                    this.status = "sending"
                    this.ulid = ulid
                }.also { message ->
                    message.suspendSave()
                    Timber.d("GroupMessageNetworkDataSource: Voice message sent, objectId=${message.objectId}")
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "GroupMessageNetworkDataSource: Error in sendVoiceMessage")
                CrashlyticsLog.recordNonFatalError(e, "GroupMessageNetworkDataSource: Error in sendVoiceMessage")
                throw e
            }
        }
    }

    suspend fun getMessageByUlid(group: ChatGroup, ulid: String): GroupMessage? {
        if (ulid.isBlank()) {
            return null
        }
        return withContext(ioContext) {
            try {
                ParseQuery.getQuery(GroupMessage::class.java)
                    .whereEqualTo("group", group)
                    .whereEqualTo("ulid", ulid)
                    .orderByDescending("updatedAt")
                    .include("user")
                    .include("wearer")
                    .setLimit(1)
                    .suspendFind()
                    .firstOrNull()
            } catch (e: Exception) {
                Timber.e(e, "GroupMessageNetworkDataSource: Error in getMessageByUlid")
                CrashlyticsLog.recordNonFatalError(e, "GroupMessageNetworkDataSource: Error in getMessageByUlid")
                null
            }
        }
    }

    fun listenLiveQuery(group: ChatGroup): Flow<GroupMessage> = callbackFlow {
        Timber.d("GroupMessageNetworkDataSource: Setting up LiveQuery for group messages")

        var query: ParseQuery<GroupMessage>? = null
        var connectionMonitorJob: kotlinx.coroutines.Job? = null

        try {
            setupLiveQueryClient()

            query = ParseQuery.getQuery(GroupMessage::class.java)
                .whereEqualTo("group", group)
                .include("user")
                .include("wearer")

            val client = parseLiveQueryClient
            if (client == null) {
                Timber.e("GroupMessageNetworkDataSource: Client is null after setup")
                close(IllegalStateException("LiveQuery client is null after setup"))
                return@callbackFlow
            }
            val subscription = client.subscribe(query)
            connectionMonitorJob = launch {
                while (true) {
                    delay(1_000L)
                    if (parseLiveQueryClient == null) {
                        Timber.w("GroupMessageNetworkDataSource: LiveQuery client invalidated, closing flow")
                        close(IllegalStateException("LiveQuery client invalidated"))
                        break
                    }
                }
            }

            subscription.handleEvent(com.parse.livequery.SubscriptionHandling.Event.CREATE) { _, message ->
                Timber.d("GroupMessageNetworkDataSource: New message via LiveQuery: ${message.objectId}")
                externalScope.launch {
                    send(message as GroupMessage)
                }
            }

            subscription.handleEvent(com.parse.livequery.SubscriptionHandling.Event.UPDATE) { _, message ->
                Timber.d("GroupMessageNetworkDataSource: Message updated via LiveQuery: ${message.objectId}")
                externalScope.launch {
                    send(message as GroupMessage)
                }
            }

        } catch (e: Exception) {
            Timber.e(e, "GroupMessageNetworkDataSource: Error in listenLiveQuery")
            CrashlyticsLog.recordNonFatalError(e, "GroupMessageNetworkDataSource: Error in listenLiveQuery")
            close(e)
            return@callbackFlow
        }

        awaitClose {
            Timber.d("GroupMessageNetworkDataSource: Closing LiveQuery subscription")
            connectionMonitorJob?.cancel()
            try {
                query?.let {
                    parseLiveQueryClient?.unsubscribe(it)
                }
            } catch (e: Exception) {
                Timber.e(e, "GroupMessageNetworkDataSource: Error during unsubscribe")
            }
        }
    }

    /**
     * Setup the LiveQuery client used for this class
     */
    private fun setupLiveQueryClient() {
        if (parseLiveQueryClient != null) {
            Timber.d("GroupMessageNetworkDataSource: setupLiveQueryClient() - Client already initialized")
            return
        }
        
        Timber.i("GroupMessageNetworkDataSource: setupLiveQueryClient() - Initializing LiveQuery client")
        parseLiveQueryClient = ParseLiveQueryClient.Factory.getClient().apply {
            registerListener(object : com.parse.livequery.ParseLiveQueryClientCallbacks {
                override fun onLiveQueryClientConnected(client: ParseLiveQueryClient?) {
                    Timber.i("GroupMessageNetworkDataSource: LiveQuery client connected")
                }

                override fun onLiveQueryClientDisconnected(client: ParseLiveQueryClient?, userInitiated: Boolean) {
                    Timber.w("GroupMessageNetworkDataSource: LiveQuery client disconnected (userInitiated=$userInitiated)")
                    if (!userInitiated) {
                        Timber.w("GroupMessageNetworkDataSource: Invalidating client due to disconnection")
                        invalidateClient()
                    }
                }

                override fun onLiveQueryError(client: ParseLiveQueryClient?, reason: com.parse.livequery.LiveQueryException?) {
                    Timber.e("GroupMessageNetworkDataSource: LiveQuery error: ${reason?.message}")
                    reason?.let {
                        CrashlyticsLog.recordNonFatalError(it.fillInStackTrace(), "GroupMessageNetworkDataSource: LiveQuery error")
                    }
                    invalidateClient()
                }

                override fun onSocketError(client: ParseLiveQueryClient?, reason: Throwable?) {
                    Timber.e(reason, "GroupMessageNetworkDataSource: LiveQuery socket error")
                    reason?.let {
                        CrashlyticsLog.recordNonFatalError(it.fillInStackTrace(), "GroupMessageNetworkDataSource: LiveQuery socket error")
                    }
                    // Invalidate client on ALL socket errors, including UnknownHostException
                    Timber.w("GroupMessageNetworkDataSource: Invalidating client due to socket error")
                    invalidateClient()
                }
            })
        }
    }

    /**
     * Invalidates the LiveQuery client, forcing a fresh client on next use
     */
    @Synchronized
    private fun invalidateClient() {
        parseLiveQueryClient?.let { client ->
            try {
                Timber.i("GroupMessageNetworkDataSource: invalidateClient() - Disconnecting client")
                client.disconnect()
            } catch (e: Exception) {
                Timber.e(e, "GroupMessageNetworkDataSource: invalidateClient() - Error disconnecting client")
            }
        }
        parseLiveQueryClient = null
        Timber.i("GroupMessageNetworkDataSource: invalidateClient() - Client invalidated")
    }

}
