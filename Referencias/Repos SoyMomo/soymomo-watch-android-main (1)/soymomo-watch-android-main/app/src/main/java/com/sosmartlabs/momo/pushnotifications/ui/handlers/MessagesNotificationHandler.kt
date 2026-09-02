package com.sosmartlabs.momo.pushnotifications.ui.handlers

import android.content.Context
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.repository.ChatGroupRepository
import com.sosmartlabs.momo.chat.data.repository.ChatRepository
import com.sosmartlabs.momo.chat.presentation.common.ActiveChatSessionRegistry
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.pushnotifications.ui.chat.ChatMessagingNotificationBuilder
import com.sosmartlabs.momo.pushnotifications.ui.chat.ChatNotificationMessage
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.review.ReviewPromptRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

/**
 * Handler for chat message push notifications.
 * 
 * Uses [ChatMessagingNotificationBuilder] to create WhatsApp-style MessagingStyle notifications
 * with per-watch conversation grouping and message history.
 */
class MessagesNotificationHandler @Inject constructor() {

    @Inject
    lateinit var ioContext: CoroutineContext

    @Inject
    lateinit var externalScope: CoroutineScope

    @Inject
    lateinit var watchUserRepository: WatchUserRepository

    @Inject
    lateinit var chatNotificationBuilder: ChatMessagingNotificationBuilder

    @Inject
    lateinit var chatGroupRepository: ChatGroupRepository

    @Inject
    lateinit var chatRepository: ChatRepository

    @Inject
    lateinit var reviewPromptRepository: ReviewPromptRepository

    /**
     * Handle text message notification.
     * Routes to unified chat notification handler with type="text".
     */
    fun handleMessageTextNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        Timber.i("MessagesNotificationHandler: handleMessageTextNotification called")
        CrashlyticsLog.log("MessagesNotificationHandler: Received text message")
        handleChatMessageNotification(context, currentUser, jsonData, "text")
    }

    /**
     * Handle audio message notification.
     * Routes to unified chat notification handler with type="audio".
     */
    fun handleMessageAudioNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        Timber.i("MessagesNotificationHandler: handleMessageAudioNotification called")
        CrashlyticsLog.log("MessagesNotificationHandler: Received audio message")
        handleChatMessageNotification(context, currentUser, jsonData, "audio")
    }

    /**
     * Handle image message notification.
     * Routes to unified chat notification handler with type="image".
     */
    fun handleMessageImageNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        Timber.i("MessagesNotificationHandler: handleMessageImageNotification called")
        CrashlyticsLog.log("MessagesNotificationHandler: Received image message")
        handleChatMessageNotification(context, currentUser, jsonData, "image")
    }

    /**
     * Handle generic chat notification payloads where message type is provided by `type`.
     */
    fun handleChatNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        val rawType = jsonData.optString("type", "text").trim().lowercase()
        val resolvedType = when (rawType) {
            "audio", "voice" -> "audio"
            "image", "photo", "picture" -> "image"
            "video" -> "video"
            else -> "text"
        }
        Timber.i(
            "MessagesNotificationHandler: handleChatNotification called with payloadType=$rawType resolvedType=$resolvedType"
        )
        handleChatMessageNotification(context, currentUser, jsonData, resolvedType)
    }

    /**
     * Unified chat message notification handler.
     * Creates a MessagingStyle notification for the watch conversation.
     * 
     * @param context Application context
     * @param currentUser Current Parse user
     * @param jsonData Push notification payload containing:
     *   - watchId: ID of the watch that sent the message
     *   - watchName: Display name of the watch
     *   - timestamp: Message timestamp
     *   - type: Message type (text, image, audio, video)
     *   - text: Message text content (for text messages)
     *   - messageIdentifier: Stable message identifier
     *   - audioDurationMs: Audio duration in milliseconds (for audio messages)
     * @param type Message type override (used when called from legacy handlers)
     */
    private fun handleChatMessageNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject, type: String) {
        val defaultConversationName = context.getString(R.string.chat_notification_default_name)
        val groupId = jsonData.optString("groupId", "")
        if (groupId.isNotBlank()) {
            val groupName = jsonData.optString("groupName", defaultConversationName)
            val senderName = jsonData.optString("senderName", "").takeIf { it.isNotBlank() }
            val suppressNotification = ActiveChatSessionRegistry.isActiveGroup(groupId)
            val message = ChatNotificationMessage(
                conversationId = chatNotificationBuilder.getConversationKeyForGroup(groupId),
                conversationName = groupName,
                isGroup = true,
                senderName = senderName,
                type = type,
                text = jsonData.optString("text", null),
                audioDurationMs = if (jsonData.has("audioDurationMs")) {
                    jsonData.optLong("audioDurationMs", 0L).takeIf { it > 0 }
                } else null,
                imageUrl = jsonData.optString("imageUrl", null),
                messageIdentifier = jsonData.optString("messageIdentifier", null),
                timestamp = jsonData.optLong("timestamp", System.currentTimeMillis())
            )
            if (!suppressNotification) {
                chatNotificationBuilder.showNotification(context, message)
            } else {
                Timber.i(
                    "MessagesNotificationHandler: Suppressing group notification for active chat groupId=$groupId"
                )
            }
            externalScope.launch(ioContext) {
                chatGroupRepository.syncGroupMessagesOnce(groupId, source = "push_notification")
            }
            Timber.i(
                "MessagesNotificationHandler: Group chat push handled for groupId=$groupId, notificationSuppressed=$suppressNotification"
            )
            reviewPromptRepository.recordPositiveUserAction()
            return
        }

        val watchId = jsonData.optString("watchId", "")
        val watchName = jsonData.optString("watchName", defaultConversationName)
        
        if (watchId.isEmpty()) {
            Timber.e("MessagesNotificationHandler: watchId is empty, cannot show notification")
            CrashlyticsLog.log("MessagesNotificationHandler: watchId is empty in push payload")
            return
        }

        Timber.d("MessagesNotificationHandler: Processing $type message from watchId=$watchId, watchName=$watchName")

        externalScope.launch(ioContext) {
            Timber.d("MessagesNotificationHandler: Launching coroutine for chat notification")
            runCatching {
                Timber.d("MessagesNotificationHandler: Attempting to find watch by id: $watchId")
                watchUserRepository.findWatchById(watchId)
            }.onSuccess { watch ->
                Timber.i("MessagesNotificationHandler: Watch found for notification: $watch")
                
                // Extract message content from payload
                val message = ChatNotificationMessage(
                    conversationId = chatNotificationBuilder.getConversationKeyForWatch(watchId),
                    conversationName = watchName,
                    isGroup = false,
                    senderName = watchName,
                    type = type,
                    text = jsonData.optString("text", null),
                    audioDurationMs = if (jsonData.has("audioDurationMs")) {
                        jsonData.optLong("audioDurationMs", 0L).takeIf { it > 0 }
                    } else null,
                    imageUrl = jsonData.optString("imageUrl", null),
                    messageIdentifier = jsonData.optString("messageIdentifier", null),
                    timestamp = jsonData.optLong("timestamp", System.currentTimeMillis())
                )

                val suppressNotification = ActiveChatSessionRegistry.isActiveIndividual(watchId)
                if (!suppressNotification) {
                    // Build and show the MessagingStyle notification
                    chatNotificationBuilder.showNotification(context, message, watch)
                } else {
                    Timber.i(
                        "MessagesNotificationHandler: Suppressing 1:1 notification for active chat watchId=$watchId"
                    )
                }
                
                Timber.i(
                    "MessagesNotificationHandler: 1:1 chat push handled for watchId=$watchId, notificationSuppressed=$suppressNotification"
                )
                reviewPromptRepository.recordPositiveUserAction()
                Timber.d("MessagesNotificationHandler: User action recorded in ReviewPromptRepository")
                chatRepository.syncChatMessagesOnce(watch, currentUser, source = "push_notification")
                
            }.onFailure { throwable ->
                Timber.e(throwable, "MessagesNotificationHandler: Error handling chat message notification")
                CrashlyticsLog.recordNonFatalError(throwable, "MessagesNotificationHandler: Error handling chat message")

                val fallbackMessage = ChatNotificationMessage(
                    conversationId = chatNotificationBuilder.getConversationKeyForWatch(watchId),
                    conversationName = watchName,
                    isGroup = false,
                    senderName = watchName,
                    type = type,
                    text = jsonData.optString("text", null),
                    audioDurationMs = if (jsonData.has("audioDurationMs")) {
                        jsonData.optLong("audioDurationMs", 0L).takeIf { it > 0 }
                    } else null,
                    imageUrl = jsonData.optString("imageUrl", null),
                    messageIdentifier = jsonData.optString("messageIdentifier", null),
                    timestamp = jsonData.optLong("timestamp", System.currentTimeMillis())
                )
                val suppressNotification = ActiveChatSessionRegistry.isActiveIndividual(watchId)
                if (!suppressNotification) {
                    chatNotificationBuilder.showNotification(context, fallbackMessage, watch = null)
                    Timber.i(
                        "MessagesNotificationHandler: Fallback chat notification sent for watchId=$watchId after watch lookup failure"
                    )
                } else {
                    Timber.i(
                        "MessagesNotificationHandler: Suppressing fallback 1:1 notification for active chat watchId=$watchId"
                    )
                }
            }
        }
    }
}
