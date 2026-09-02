package com.sosmartlabs.momo.chat.data.remote.datasource

import com.parse.ParseFile
import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.ktx.whereContainedIn
import com.parse.ktx.whereEqualTo
import com.sosmartlabs.momo.chat.data.local.entity.*
import com.sosmartlabs.momo.chat.data.remote.model.ChatUser
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import kotlinx.coroutines.CoroutineScope
import timber.log.Timber
import java.util.*
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

/**
 * Class for work with [ChatUser] object from ChatUser collection in Parse database
 */
class ChatUserNetworkDataSource @Inject constructor(
    externalScope: CoroutineScope,
    ioContext: CoroutineContext
) : ChatNetworkDataSource<ChatUser>(externalScope, ioContext) {

    override fun getMessagesQuery(wearer: Wearer, user: ParseUser): ParseQuery<ChatUser> {
        Timber.d("ChatUserNetworkDataSource: getMessagesQuery called for wearer=${wearer.objectId}, user=${user.objectId}")
        return ParseQuery.getQuery(ChatUser::class.java)
            .whereEqualTo(ChatUser::user, user)
            .whereEqualTo(ChatUser::watch, wearer)
    }

    override fun getMessagesUpdateQuery(
        wearer: Wearer,
        user: ParseUser,
        sentMessageIds: List<String>
    ): ParseQuery<ChatUser> {
        Timber.d("ChatUserNetworkDataSource: getMessagesUpdateQuery called for wearer=${wearer.objectId}, user=${user.objectId}, sentMessageIds=$sentMessageIds")
        try {
            val sentIdentifiers = sentMessageIds.map {
                try {
                    it.split("_")[2]
                } catch (e: Exception) {
                    Timber.e("ChatUserNetworkDataSource: Error splitting sentMessageId: $it")
                    CrashlyticsLog.recordNonFatalError(e, "ChatUserNetworkDataSource: Error splitting sentMessageId: $it")
                    ""
                }
            }
            val sentMessagesQuery = getMessagesQuery(wearer, user)
                .whereGreaterThanOrEqualTo(
                    "createdAt",
                    Calendar.getInstance().apply { add(Calendar.MINUTE, -5) }.time
                )
                .whereContainedIn(ChatUser::identifier, sentIdentifiers)
            val receivedMessagesQuery = getMessagesQuery(wearer, user)
                .whereEqualTo(ChatUser::sender, ChatEntity.SENDER_WATCH)
                .whereContainedIn(
                    ChatUser::status,
                    listOf(ChatEntity.STATUS_SENDING, ChatEntity.STATUS_SENT)
                )

            Timber.d("ChatUserNetworkDataSource: getMessagesUpdateQuery returning OR query")
            return ParseQuery.or(listOf(sentMessagesQuery, receivedMessagesQuery))
        } catch (e: Exception) {
            Timber.e("ChatUserNetworkDataSource: Error in getMessagesUpdateQuery: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "ChatUserNetworkDataSource: Error in getMessagesUpdateQuery")
            throw e
        }
    }

    override fun processMessageStatus(message: ChatUser) {
        try {
            with(message) {
                if (sender == "watch" && (status == "sent" || status == "sending")) {
                    Timber.d("ChatUserNetworkDataSource: Updating status to 'received' for message identifier=${identifier}")
                    status = "received"
                }
            }
        } catch (e: Exception) {
            Timber.e("ChatUserNetworkDataSource: Error in processMessageStatus: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "ChatUserNetworkDataSource: Error in processMessageStatus")
        }
    }

    /**
     * Creates a ChatWebUpdate with consistent client-side timestamps
     * Always uses the identifier (client timestamp) for message ordering
     */
    override fun getChatWebUpdate(chat: ChatUser): ChatWebUpdate {
        try {
            if (chat.identifier == null) {
                val createdAtTimestamp = chat.createdAt?.time
                if (createdAtTimestamp != null) {
                    chat.identifier = createdAtTimestamp.toString()
                    Timber.d("ChatUserNetworkDataSource: getChatWebUpdate() - Assigned identifier from createdAt: ${chat.identifier} to message: ${chat.objectId}")
                } else {
                    // Fallback to current time only if createdAt is also null (shouldn't happen)
                    val newIdentifier = System.currentTimeMillis().toString()
                    chat.identifier = newIdentifier
                    Timber.w("ChatUserNetworkDataSource: ChatUser identifier and createdAt are null, using current time: $newIdentifier")
                }
            }

            // Always use the identifier (client timestamp) regardless of server timestamp
            val clientTimestamp = try {
                chat.identifier!!.toLong()
            } catch (e: Exception) {
                Timber.e("ChatUserNetworkDataSource: Error parsing identifier to Long: ${chat.identifier}")
                CrashlyticsLog.recordNonFatalError(e, "ChatUserNetworkDataSource: Error parsing identifier to Long: ${chat.identifier}")
                System.currentTimeMillis()
            }

            // Use the identifier directly in the ID to ensure stable message identity
            val messageId = "${chat.watch.objectId}_${chat.user.objectId}_${chat.identifier}"

            val chatWebUpdate = ChatWebUpdate(
                id = messageId,
                chatId = "${chat.watch.objectId}_${chat.user.objectId}",
                createdAt = clientTimestamp, // Always use client timestamp
                sender = chat.sender,
                receiver = chat.watch.objectId,
                type = chat.type,
                status = chat.status ?: run {
                    Timber.e("ChatUserNetworkDataSource: status is null for messageId=$messageId")
                    CrashlyticsLog.log("ChatUserNetworkDataSource: status is null for messageId=$messageId")
                    ""
                },
                text = chat.text,
                image = chat.image?.url,
                audio = chat.isolatedAudio?.url ?: chat.audio?.url,
                video = chat.video?.url,
                isIsolatedAudio = chat.isolatedAudio != null
            )

            Timber.d("ChatUserNetworkDataSource: getChatWebUpdate returning ChatWebUpdate for messageId=$messageId")
            return chatWebUpdate
        } catch (e: Exception) {
            Timber.e("ChatUserNetworkDataSource: Error in getChatWebUpdate: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "ChatUserNetworkDataSource: Error in getChatWebUpdate")
            throw e
        }
    }

    override fun getNewMessage(watch: Wearer, user: ParseUser): ChatUser {
        Timber.d("ChatUserNetworkDataSource: getNewMessage called for watch=${watch.objectId}, user=${user.objectId}")
        return try {
            ChatUser().apply {
                acl?.setReadAccess(user, true)
                val currentTimestamp = System.currentTimeMillis()
                this.identifier = currentTimestamp.toString()
                status = "sending"
                sender = "app"
                this.watch = watch
                this.user = user
                Timber.d("ChatUserNetworkDataSource: New message created with identifier=$identifier")
            }
        } catch (e: Exception) {
            Timber.e("ChatUserNetworkDataSource: Error in getNewMessage: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "ChatUserNetworkDataSource: Error in getNewMessage")
            throw e
        }
    }

    override fun setTextMessage(message: ChatUser, text: String) {
        Timber.d("ChatUserNetworkDataSource: setTextMessage called for message identifier=${message.identifier}")
        try {
            super.setTextMessage(message, text)
            message.type = ChatEntity.TYPE_TEXT
            Timber.d("ChatUserNetworkDataSource: setTextMessage set type to ${ChatEntity.TYPE_TEXT}")
        } catch (e: Exception) {
            Timber.e("ChatUserNetworkDataSource: Error in setTextMessage: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "ChatUserNetworkDataSource: Error in setTextMessage")
        }
    }

    override fun setImageMessage(message: ChatUser, image: ParseFile) {
        Timber.d("ChatUserNetworkDataSource: setImageMessage called for message identifier=${message.identifier}")
        try {
            super.setImageMessage(message, image)
            message.type = ChatEntity.TYPE_IMAGE
            Timber.d("ChatUserNetworkDataSource: setImageMessage set type to ${ChatEntity.TYPE_IMAGE}")
        } catch (e: Exception) {
            Timber.e("ChatUserNetworkDataSource: Error in setImageMessage: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "ChatUserNetworkDataSource: Error in setImageMessage")
        }
    }

    override fun setVoiceMessage(message: ChatUser, audio: ParseFile) {
        Timber.d("ChatUserNetworkDataSource: setVoiceMessage called for message identifier=${message.identifier}")
        try {
            super.setVoiceMessage(message, audio)
            message.type = ChatEntity.TYPE_AUDIO
            Timber.d("ChatUserNetworkDataSource: setVoiceMessage set type to ${ChatEntity.TYPE_AUDIO}")
        } catch (e: Exception) {
            Timber.e("ChatUserNetworkDataSource: Error in setVoiceMessage: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "ChatUserNetworkDataSource: Error in setVoiceMessage")
        }
    }
}
