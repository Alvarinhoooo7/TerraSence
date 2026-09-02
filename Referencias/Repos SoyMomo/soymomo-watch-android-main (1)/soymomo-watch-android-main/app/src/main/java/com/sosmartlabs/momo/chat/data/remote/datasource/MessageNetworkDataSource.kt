package com.sosmartlabs.momo.chat.data.remote.datasource

import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.ktx.whereDoesNotExist
import com.parse.ktx.whereEqualTo
import com.sosmartlabs.momo.chat.data.local.entity.*
import com.sosmartlabs.momo.chat.data.remote.model.Message
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import kotlinx.coroutines.CoroutineScope
import timber.log.Timber
import java.util.*
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

/**
 * Class for work with [Message] object from Message collection in Parse database
 */
class MessageNetworkDataSource @Inject constructor(
    externalScope: CoroutineScope,
    ioContext: CoroutineContext
) : ChatNetworkDataSource<Message>(externalScope, ioContext) {

    override fun getMessagesQuery(wearer: Wearer, user: ParseUser): ParseQuery<Message> {
        Timber.v("MessageNetworkDataSource: getMessagesQuery() - Building query for wearer: ${wearer.objectId}, user: ${user.objectId}")
        return ParseQuery.getQuery(Message::class.java)
            .whereEqualTo(Message::watch, wearer)
    }

    override fun getMessagesUpdateQuery(
        wearer: Wearer,
        user: ParseUser,
        sentMessageIds: List<String>
    ): ParseQuery<Message> {
        Timber.i("MessageNetworkDataSource: getMessagesUpdateQuery() - Start for wearer: ${wearer.objectId}, user: ${user.objectId}, sentMessageIds: $sentMessageIds")
        try {
            val fiveMinutesAgo = Calendar.getInstance().apply { add(Calendar.MINUTE, -5) }.time
            Timber.v("MessageNetworkDataSource: getMessagesUpdateQuery() - Calculated fiveMinutesAgo: $fiveMinutesAgo")

            val sentCreatedAts = sentMessageIds.mapNotNull {
                try {
                    val ts = it.split('_').getOrNull(1)?.toLong()
                    if (ts != null) Date(ts) else null
                } catch (e: Exception) {
                    Timber.e(e, "MessageNetworkDataSource: getMessagesUpdateQuery() - Failed to parse timestamp from messageId: $it")
                    CrashlyticsLog.recordNonFatalError(e, "MessageNetworkDataSource: Error parsing timestamp from messageId: $it")
                    null
                }
            }
            Timber.v("MessageNetworkDataSource: getMessagesUpdateQuery() - sentCreatedAts: $sentCreatedAts")

            val sentMessagesQuery = getMessagesQuery(wearer, user)
                .whereGreaterThanOrEqualTo("createdAt", fiveMinutesAgo)
                .whereContainedIn("createdAt", sentCreatedAts)

            val receivedMessagesQuery = getMessagesQuery(wearer, user)
                .whereDoesNotExist(Message::from)
                .whereDoesNotExist(Message::error)
                .whereDoesNotExist(Message::received)

            Timber.d("MessageNetworkDataSource: getMessagesUpdateQuery() - Built sentMessagesQuery and receivedMessagesQuery")
            return ParseQuery.or(listOf(sentMessagesQuery, receivedMessagesQuery))
        } catch (e: Exception) {
            Timber.e(e, "MessageNetworkDataSource: getMessagesUpdateQuery() - Error building update query")
            CrashlyticsLog.recordNonFatalError(e, "MessageNetworkDataSource: Error in getMessagesUpdateQuery for wearer: ${wearer.objectId}")
            throw e
        }
    }

    override fun processMessageStatus(message: Message) {
        Timber.v("MessageNetworkDataSource: processMessageStatus() - Processing message: ${message.objectId}")
        try {
            with(message) {
                if (!has("from")) {
                    if (!has("sent") || !sent) {
                        Timber.d("MessageNetworkDataSource: processMessageStatus() - Setting sent=true for message: ${message.objectId}")
                        sent = true
                    }
                    if (!has("received") || !received) {
                        Timber.d("MessageNetworkDataSource: processMessageStatus() - Setting received=true for message: ${message.objectId}")
                        received = true
                    }
                    if (has("error") && error) {
                        Timber.d("MessageNetworkDataSource: processMessageStatus() - Clearing error for message: ${message.objectId}")
                        error = false
                    }
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "MessageNetworkDataSource: processMessageStatus() - Error processing message status for: ${message.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "MessageNetworkDataSource: Error in processMessageStatus for message: ${message.objectId}")
        }
    }

    /**
     * Creates a ChatWebUpdate with consistent client-side timestamps
     * Always uses the identifier (client timestamp) for message ordering
     */
    override fun getChatWebUpdate(message: Message): ChatWebUpdate? {
        Timber.v("MessageNetworkDataSource: getChatWebUpdate() - Start for message: ${message.objectId}")
        try {
            // Make sure we have an identifier
            // If identifier is null, use the Parse createdAt timestamp to ensure stable message IDs
            // This prevents creating duplicate messages with new timestamps when fetching from network
            if (message.identifier == null) {
                val createdAtTimestamp = message.createdAt?.time
                if (createdAtTimestamp != null) {
                    message.identifier = createdAtTimestamp.toString()
                    Timber.d("MessageNetworkDataSource: getChatWebUpdate() - Assigned identifier from createdAt: ${message.identifier} to message: ${message.objectId}")
                } else {
                    // Fallback to current time only if createdAt is also null (shouldn't happen)
                    val newIdentifier = System.currentTimeMillis().toString()
                    message.identifier = newIdentifier
                    Timber.w("MessageNetworkDataSource: getChatWebUpdate() - Both identifier and createdAt are null, using current time: $newIdentifier for message: ${message.objectId}")
                }
            }

            // Always use the client timestamp from identifier
            val clientTimestamp = try {
                message.identifier!!.toLong()
            } catch (e: Exception) {
                Timber.e(e, "MessageNetworkDataSource: getChatWebUpdate() - Invalid identifier format: ${message.identifier} for message: ${message.objectId}")
                CrashlyticsLog.recordNonFatalError(e, "MessageNetworkDataSource: Invalid identifier in getChatWebUpdate for message: ${message.objectId}")
                return null
            }

            // Use the identifier directly in the ID to ensure stable message identity
            val messageId = "${message.watch.objectId}_${message.identifier}"

            val type = when {
                message.has("audio") -> ChatEntity.TYPE_AUDIO
                message.has("image") -> ChatEntity.TYPE_IMAGE
                else -> ChatEntity.TYPE_TEXT
            }
            val status = when {
                message.has("error") && message.error -> ChatEntity.STATUS_ERROR
                message.has("received") && message.received -> ChatEntity.STATUS_RECEIVED
                message.has("sent") && message.sent -> ChatEntity.STATUS_SENT
                else -> ChatEntity.STATUS_SENDING
            }
            val sender = if (message.has("from")) ChatEntity.SENDER_APP else ChatEntity.SENDER_WATCH

            Timber.d(
                "MessageNetworkDataSource: getChatWebUpdate() - Building ChatWebUpdate for messageId: $messageId, type: $type, status: $status, sender: $sender"
            )

            val chatWebUpdate = ChatWebUpdate(
                id = messageId,
                chatId = message.watch.objectId,
                createdAt = clientTimestamp, // Always use client timestamp 
                sender = sender,
                receiver = message.watch.objectId,
                type = type,
                status = status,
                text = message.text,
                audio = message.audio?.url,
                image = message.image?.url,
                video = null,
                isIsolatedAudio = false
            )

            Timber.i("MessageNetworkDataSource: getChatWebUpdate() - Successfully created ChatWebUpdate for messageId: $messageId")
            return chatWebUpdate
        } catch (e: Exception) {
            Timber.e(e, "MessageNetworkDataSource: getChatWebUpdate() - Error creating ChatWebUpdate for message: ${message.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "MessageNetworkDataSource: Error in getChatWebUpdate for message: ${message.objectId}")
            return null
        }
    }

    override fun getNewMessage(watch: Wearer, user: ParseUser): Message {
        Timber.v("MessageNetworkDataSource: getNewMessage() - Creating new message for watch: ${watch.objectId}, user: ${user.objectId}")
        return try {
            val currentTimestamp = System.currentTimeMillis()
            val message = Message().apply {
                this.watch = watch
                this.identifier = currentTimestamp.toString()
                from = user
            }
            Timber.i("MessageNetworkDataSource: getNewMessage() - New message created with identifier: ${message.identifier}")
            message
        } catch (e: Exception) {
            Timber.e(e, "MessageNetworkDataSource: getNewMessage() - Error creating new message for watch: ${watch.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "MessageNetworkDataSource: Error in getNewMessage for watch: ${watch.objectId}")
            throw e
        }
    }
}
