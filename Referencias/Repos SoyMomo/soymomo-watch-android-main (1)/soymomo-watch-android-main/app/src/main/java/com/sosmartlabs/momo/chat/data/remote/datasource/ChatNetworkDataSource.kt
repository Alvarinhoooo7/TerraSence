package com.sosmartlabs.momo.chat.data.remote.datasource

import com.parse.*
import com.parse.coroutines.suspendFind
import com.parse.coroutines.suspendSave
import com.parse.livequery.LiveQueryException
import com.parse.livequery.ParseLiveQueryClient
import com.parse.livequery.ParseLiveQueryClientCallbacks
import com.parse.livequery.SubscriptionHandling
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.chat.data.local.entity.*
import com.sosmartlabs.momo.chat.data.remote.model.MessageBase
import com.sosmartlabs.momo.chat.data.remote.model.Message
import com.sosmartlabs.momo.chat.data.remote.model.ChatUser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import java.io.File
import kotlin.coroutines.CoroutineContext

private fun Message.getIdentifier(): String? = this.identifier
private fun ChatUser.getIdentifier(): String? = this.identifier
private fun MessageBase.getIdentifierSafely(): String? {
    return when (this) {
        is Message -> this.getIdentifier()
        is ChatUser -> this.getIdentifier()
        else -> null
    }
}

internal fun acknowledgeDirectChatSend(update: ChatWebUpdate): ChatWebUpdate {
    if (update.status == ChatEntity.STATUS_SENT ||
        update.status == ChatEntity.STATUS_RECEIVED ||
        update.status == ChatEntity.STATUS_ERROR
    ) {
        return update
    }

    return ChatWebUpdate(
        id = update.id,
        chatId = update.chatId,
        createdAt = update.createdAt,
        sender = update.sender,
        receiver = update.receiver,
        type = update.type,
        status = ChatEntity.STATUS_SENT,
        text = update.text,
        image = update.image,
        audio = update.audio,
        video = update.video,
        isIsolatedAudio = update.isIsolatedAudio
    )
}

/**
 * Base class for chat data source in Parse
 */
abstract class ChatNetworkDataSource<T>(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext
) where T : MessageBase {

    private var parseLiveQueryClient: ParseLiveQueryClient? = null

    protected abstract fun getMessagesQuery(wearer: Wearer, user: ParseUser): ParseQuery<T>
    protected abstract fun getMessagesUpdateQuery(
        wearer: Wearer,
        user: ParseUser,
        sentMessageIds: List<String>
    ): ParseQuery<T>
    protected abstract fun getChatWebUpdate(chat: T): ChatWebUpdate?
    protected abstract fun getNewMessage(watch: Wearer, user: ParseUser): T

    protected open fun processMessageStatus(message: T) {
        // Do nothing by default. Must be overwritten if required by the children classes
    }

    /**
     * Obtains the chats for the given wearer and user
     */
    suspend fun getChats(wearer: Wearer, user: ParseUser): List<ChatWebUpdate> {
        CrashlyticsLog.log("ChatNetworkDataSource: Querying chat messages for wearer=${wearer.objectId}, user=${user.objectId}")
        Timber.i("ChatNetworkDataSource: getChats() - Start for wearer=${wearer.objectId}, user=${user.objectId}")
        return try {
            val list = getMessagesQuery(wearer, user)
                .orderByDescending("createdAt")
                .suspendFind()
                .onEach { processMessageStatus(it) }

            Timber.d("ChatNetworkDataSource: getChats() - Retrieved ${list.size} messages")
            saveMessagesIfRequired(list)

            list.mapNotNull { msg ->
                Timber.d("ChatNetworkDataSource: getChats() - Message: $msg")
                getChatWebUpdate(msg)
            }
        } catch (e: ParseException) {
            Timber.e(e, "ChatNetworkDataSource: getChats() - ParseException occurred")
            CrashlyticsLog.recordNonFatalError(e, "ChatNetworkDataSource: getChats() - ParseException")
            checkAndThrowConnectionExceptionOrParseException(e)
            emptyList()
        } catch (e: Exception) {
            Timber.e(e, "ChatNetworkDataSource: getChats() - Unexpected exception")
            CrashlyticsLog.recordNonFatalError(e, "ChatNetworkDataSource: getChats() - Unexpected exception")
            emptyList()
        }
    }

    /**
     * Checks if the messages in the given list have changes and should be saved in Parse database.
     */
    private fun saveMessagesIfRequired(list: List<T>) {
        val dirtyList = list.filter { it.isDirty }
        if (dirtyList.isNotEmpty()) {
            Timber.i("ChatNetworkDataSource: saveMessagesIfRequired() - Saving ${dirtyList.size} dirty messages")
            externalScope.launch(ioContext) {
                runCatching {
                    ParseObject.saveAll(dirtyList)
                    Timber.i("ChatNetworkDataSource: saveMessagesIfRequired() - Successfully saved dirty messages")
                }.onFailure { e ->
                    Timber.e(e, "ChatNetworkDataSource: saveMessagesIfRequired() - Error saving dirty messages")
                    CrashlyticsLog.recordNonFatalError(e, "ChatNetworkDataSource: Error on saving chat status")
                }
            }
        } else {
            Timber.d("ChatNetworkDataSource: saveMessagesIfRequired() - No dirty messages to save")
        }
    }

    /**
     * Listen for new and updated messages from LiveQuery
     */
    @OptIn(ExperimentalCoroutinesApi::class)
    fun listenLiveQuery(wearer: Wearer, user: ParseUser) = callbackFlow {
        Timber.i("ChatNetworkDataSource: listenLiveQuery() - Setting up LiveQuery for wearer=${wearer.objectId}, user=${user.objectId}")

        var query: ParseQuery<out MessageBase>? = null

        try {
            setupLiveQueryClient()

            query = getMessagesQuery(wearer, user)
            val client = parseLiveQueryClient
            if (client == null) {
                Timber.e("ChatNetworkDataSource: listenLiveQuery() - Client is null after setup")
                return@callbackFlow
            }
            val subscription = client.subscribe(query)

            subscription.handleError { _, e ->
                Timber.e(e, "ChatNetworkDataSource: LiveQuery subscription error for wearer=${wearer.objectId}, user=${user.objectId}")
            }

            subscription.handleSubscribe { query ->
                Timber.i(
                    "ChatNetworkDataSource: LiveQuery SUBSCRIBED class=${query.className} wearer=${wearer.objectId} user=${user.objectId}"
                )
            }

            subscription.handleEvents { _, event, message ->
                Timber.d("ChatNetworkDataSource: LiveQuery event=$event")
                when (event) {
                    SubscriptionHandling.Event.CREATE -> {
                        Timber.d("ChatNetworkDataSource: listenLiveQuery() - Got new chat CREATE event ${message.objectId}")
                        try {
                            processMessageStatus(message)
                            saveMessagesIfRequired(listOf(message))
                            val update = getChatWebUpdate(message)
                            if (update != null) {
                                trySend(update)
                                Timber.d("ChatNetworkDataSource: listenLiveQuery() - Sent CREATE update to flow for message ${message.objectId}")
                            } else {
                                Timber.w("ChatNetworkDataSource: listenLiveQuery() - CREATE event: getChatWebUpdate returned null for message ${message.objectId}")
                            }
                        } catch (e: Exception) {
                            Timber.e(e, "ChatNetworkDataSource: listenLiveQuery() - Error processing CREATE event for message ${message.objectId}")
                            CrashlyticsLog.recordNonFatalError(e, "ChatNetworkDataSource: listenLiveQuery() - Error processing CREATE event")
                        }
                    }
                    SubscriptionHandling.Event.UPDATE -> {
                        Timber.d("ChatNetworkDataSource: listenLiveQuery() - Got new chat UPDATE event ${message.objectId}")
                        try {
                            processMessageStatus(message)
                            saveMessagesIfRequired(listOf(message))
                            val update = getChatWebUpdate(message)
                            if (update != null) {
                                trySend(update)
                                Timber.d("ChatNetworkDataSource: listenLiveQuery() - Sent UPDATE update to flow for message ${message.objectId}")
                            } else {
                                Timber.w("ChatNetworkDataSource: listenLiveQuery() - UPDATE event: getChatWebUpdate returned null for message ${message.objectId}")
                            }
                        } catch (e: Exception) {
                            Timber.e(e, "ChatNetworkDataSource: listenLiveQuery() - Error processing UPDATE event for message ${message.objectId}")
                            CrashlyticsLog.recordNonFatalError(e, "ChatNetworkDataSource: listenLiveQuery() - Error processing UPDATE event")
                        }
                    }
                    else -> Timber.d("ChatNetworkDataSource: listenLiveQuery() - LiveQuery event not handled: $event")
                }
            }

        } catch (e: Exception) {
            Timber.e(e, "ChatNetworkDataSource: listenLiveQuery() - Error setting up LiveQuery")
            CrashlyticsLog.recordNonFatalError(e, "ChatNetworkDataSource: listenLiveQuery() - Error setting up LiveQuery")
        }

        awaitClose {
            Timber.i("ChatNetworkDataSource: listenLiveQuery() - Closing LiveQuery subscription")
            try {
                query?.let { 
                    parseLiveQueryClient?.unsubscribe(it)
                }
            } catch (e: Exception) {
                Timber.e(e, "ChatNetworkDataSource: listenLiveQuery() - Error during unsubscribe")
            }
        }
    }

    /**
     * Gets for new and updated messages
     */
    suspend fun getChatUpdates(
        wearer: Wearer,
        user: ParseUser,
        sentMessageIds: List<String>
    ): List<ChatWebUpdate> {
        CrashlyticsLog.log("ChatNetworkDataSource: querying chat updates for wearer=${wearer.objectId}, user=${user.objectId}, sentMessageIds=${sentMessageIds.size}")
        Timber.i("ChatNetworkDataSource: getChatUpdates() - Start for wearer=${wearer.objectId}, user=${user.objectId}, sentMessageIds=${sentMessageIds.size}")
        return try {
            val updates = getMessagesUpdateQuery(wearer, user, sentMessageIds)
                .orderByDescending("createdAt")
                .suspendFind()
                .onEach {
                    processMessageStatus(it)
                }
                .also { saveMessagesIfRequired(it) }
                .mapNotNull { getChatWebUpdate(it) }
            Timber.i("ChatNetworkDataSource: getChatUpdates() - Found ${updates.size} updates")
            updates
        } catch (e: ParseException) {
            Timber.e(e, "ChatNetworkDataSource: getChatUpdates() - ParseException occurred")
            CrashlyticsLog.recordNonFatalError(e, "ChatNetworkDataSource: getChatUpdates() - ParseException")
            checkAndThrowConnectionExceptionOrParseException(e)
            emptyList()
        } catch (e: Exception) {
            Timber.e(e, "ChatNetworkDataSource: getChatUpdates() - Unexpected exception")
            CrashlyticsLog.recordNonFatalError(e, "ChatNetworkDataSource: getChatUpdates() - Unexpected exception")
            emptyList()
        }
    }

    /**
     * Setup the LiveQuery client used for this class
     */
    private fun setupLiveQueryClient() {
        if (parseLiveQueryClient != null) {
            Timber.d("ChatNetworkDataSource: setupLiveQueryClient() - Client already initialized")
            return
        }
        
        Timber.i("ChatNetworkDataSource: setupLiveQueryClient() - Initializing LiveQuery client")
        parseLiveQueryClient = ParseLiveQueryClient.Factory.getClient().apply {
            registerListener(object : ParseLiveQueryClientCallbacks {
                override fun onLiveQueryClientConnected(client: ParseLiveQueryClient?) {
                    Timber.i("ChatNetworkDataSource: LiveQuery client connected")
                }

                override fun onLiveQueryClientDisconnected(client: ParseLiveQueryClient?, userInitiated: Boolean) {
                    Timber.w("ChatNetworkDataSource: LiveQuery client disconnected (userInitiated=$userInitiated)")
                    if (!userInitiated) {
                        Timber.w("ChatNetworkDataSource: Invalidating client due to disconnection")
                        invalidateClient()
                    }
                }

                override fun onLiveQueryError(client: ParseLiveQueryClient?, reason: LiveQueryException?) {
                    Timber.e("ChatNetworkDataSource: LiveQuery error: ${reason?.message}")
                    reason?.let {
                        CrashlyticsLog.recordNonFatalError(it.fillInStackTrace(), "ChatNetworkDataSource: LiveQuery error")
                    }
                    invalidateClient()
                }

                override fun onSocketError(client: ParseLiveQueryClient?, reason: Throwable?) {
                    // Breadcrumb only: "Software caused connection abort" is the OS closing
                    // the websocket when we background — the normal end of a LiveQuery, not a
                    // defect. Never fillInStackTrace() here: it overwrites the throwable's own
                    // stack with this callback's, which is why these were blamed on app code.
                    Timber.e(reason, "ChatNetworkDataSource: LiveQuery socket error")
                    CrashlyticsLog.log("ChatNetworkDataSource: LiveQuery socket error: ${reason?.javaClass?.simpleName}: ${reason?.message}")
                    // Invalidate client on ALL socket errors, including UnknownHostException
                    Timber.w("ChatNetworkDataSource: Invalidating client due to socket error")
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
                Timber.i("ChatNetworkDataSource: invalidateClient() - Disconnecting client")
                client.disconnect()
            } catch (e: Exception) {
                Timber.e(e, "ChatNetworkDataSource: invalidateClient() - Error disconnecting client")
            }
        }
        parseLiveQueryClient = null
        Timber.i("ChatNetworkDataSource: invalidateClient() - Client invalidated")
    }

    private fun reconnect() {
        Timber.i("ChatNetworkDataSource: reconnect() - Attempting to reconnect LiveQuery client")
        parseLiveQueryClient?.let { client ->
            try {
                client.reconnect()
            } catch (e: Exception) {
                Timber.e(e, "ChatNetworkDataSource: reconnect() - Error during reconnection")
            }
        }
    }

    /**
     * Creates and send a new message
     */
    private suspend fun sendMessage(
        watch: Wearer,
        user: ParseUser,
        setParams: (T) -> Unit,
        webUpdateCallback: suspend (ChatWebUpdate) -> Unit
    ) {
        Timber.i("ChatNetworkDataSource: sendMessage() - Creating new message for wearer=${watch.objectId}, user=${user.objectId}")
        val message = getNewMessage(watch, user)
        setParams(message)

        val identifierValue = message.getIdentifierSafely() ?: System.currentTimeMillis().toString()
        val clientTimestamp = identifierValue.toLong()

        val chatWebUpdate = getChatWebUpdate(message)
        val clientUpdate = chatWebUpdate?.let {
            ChatWebUpdate(
                id = it.id,
                chatId = it.chatId,
                createdAt = clientTimestamp,
                sender = it.sender,
                receiver = it.receiver,
                type = it.type,
                status = it.status,
                text = it.text,
                image = it.image,
                audio = it.audio,
                video = it.video,
                isIsolatedAudio = it.isIsolatedAudio
            )
        }

        clientUpdate?.let {
            Timber.d("ChatNetworkDataSource: sendMessage() - Sending message to UI with client timestamp $clientTimestamp")
            webUpdateCallback(it)
        }

        try {
            Timber.i("ChatNetworkDataSource: sendMessage() - Saving message to Parse")
            message.suspendSave()
            Timber.i("ChatNetworkDataSource: sendMessage() - Message saved successfully")
            val savedUpdate = getChatWebUpdate(message) ?: clientUpdate
            savedUpdate?.let {
                val acknowledgedUpdate = acknowledgeDirectChatSend(it)
                if (acknowledgedUpdate.status != it.status) {
                    Timber.d(
                        "ChatNetworkDataSource: sendMessage() - Acknowledging local 1:1 message id=%s fromStatus=%s toStatus=%s",
                        acknowledgedUpdate.id,
                        it.status,
                        acknowledgedUpdate.status
                    )
                }
                webUpdateCallback(acknowledgedUpdate)
            }
        } catch (e: Exception) {
            Timber.e(e, "ChatNetworkDataSource: sendMessage() - Error saving message")
            CrashlyticsLog.recordNonFatalError(e, "ChatNetworkDataSource: sendMessage() - Error saving message")
            checkAndThrowConnectionExceptionOrException(e)
        }
    }

    /**
     * Sends a file with a file attached to it
     */
    private suspend fun sendFileMessage(
        wearer: Wearer,
        user: ParseUser,
        currentFilePath: String,
        setFileField: (T, ParseFile) -> Unit,
        webUpdateCallback: suspend (ChatWebUpdate) -> Unit
    ) {
        Timber.i("ChatNetworkDataSource: sendFileMessage() - Preparing file at $currentFilePath")
        val file = try {
            ParseFile(File(currentFilePath)).apply {
                save()
            }
        } catch (e: Exception) {
            Timber.e(e, "ChatNetworkDataSource: sendFileMessage() - Error saving file at $currentFilePath")
            CrashlyticsLog.recordNonFatalError(e, "ChatNetworkDataSource: sendFileMessage() - Error saving file")
            throw e
        }
        Timber.i("ChatNetworkDataSource: sendFileMessage() - File saved, sending message")
        return sendMessage(wearer, user, {
            setFileField(it, file)
        }, webUpdateCallback)
    }

    /**
     * Sets parameters specific for text messages
     */
    protected open fun setTextMessage(message: T, text: String) {
        message.text = text
    }

    /**
     * Sends a text message
     */
    suspend fun sendTextMessage(
        wearer: Wearer,
        user: ParseUser,
        text: String,
        webUpdateCallback: suspend (ChatWebUpdate) -> Unit
    ) {
        Timber.i("ChatNetworkDataSource: sendTextMessage() - wearer=${wearer.objectId}, user=${user.objectId}, text=${text.take(30)}")
        sendMessage(wearer, user, {
            setTextMessage(it, text)
        }, webUpdateCallback)
    }

    /**
     * Set parameters specific for image messages
     */
    protected open fun setImageMessage(message: T, image: ParseFile) {
        message.image = image
    }

    /**
     * Sends an image message
     */
    suspend fun sendImageMessage(
        wearer: Wearer,
        user: ParseUser,
        currentPhotoPath: String,
        webUpdateCallback: suspend (ChatWebUpdate) -> Unit
    ) {
        Timber.i("ChatNetworkDataSource: sendImageMessage() - wearer=${wearer.objectId}, user=${user.objectId}, photoPath=$currentPhotoPath")
        return sendFileMessage(wearer, user, currentPhotoPath, { chat, file ->
            setImageMessage(chat, file)
        }, webUpdateCallback)
    }

    /**
     * Set parameters specific for voice messages
     */
    protected open fun setVoiceMessage(message: T, audio: ParseFile) {
        message.audio = audio
    }

    /**
     * Sends a voice message
     */
    suspend fun sendVoiceMessage(
        wearer: Wearer,
        user: ParseUser,
        audioPath: String,
        webUpdateCallback: suspend (ChatWebUpdate) -> Unit
    ) {
        Timber.i("ChatNetworkDataSource: sendVoiceMessage() - wearer=${wearer.objectId}, user=${user.objectId}, audioPath=$audioPath")
        return sendFileMessage(wearer, user, audioPath, { chat, file ->
            setVoiceMessage(chat, file)
        }, webUpdateCallback)
    }

    /**
     * Checks if an exception must be handled by the app, launching a [ConnectionException] in that
     * case. Otherwise, launches the original exception
     */
    private fun checkAndThrowConnectionExceptionOrException(exception: Throwable) {
        if (exception is ParseException) {
            Timber.w("ChatNetworkDataSource: checkAndThrowConnectionExceptionOrException() - ParseException detected")
            checkAndThrowConnectionExceptionOrParseException(exception)
        } else {
            Timber.e(exception, "ChatNetworkDataSource: checkAndThrowConnectionExceptionOrException() - Rethrowing exception")
            throw exception
        }
    }

    /**
     * Checks if a [ParseException] must be handled by the app, launching a [ConnectionException] in that
     * case. Otherwise, launches the original exception
     */
    private fun checkAndThrowConnectionExceptionOrParseException(exception: ParseException) {
        if (exception.code in arrayListOf(ParseException.CONNECTION_FAILED, ParseException.INVALID_JSON)) {
            Timber.e(exception, "ChatNetworkDataSource: checkAndThrowConnectionExceptionOrParseException() - ConnectionException thrown")
            throw ConnectionException(exception.localizedMessage)
        } else {
            Timber.e(exception, "ChatNetworkDataSource: checkAndThrowConnectionExceptionOrParseException() - Rethrowing ParseException")
            throw exception
        }
    }

    /**
     * Class for handling connection exceptions
     */
    class ConnectionException(message: String?) : Exception(message ?: "Parse connection error")
}
