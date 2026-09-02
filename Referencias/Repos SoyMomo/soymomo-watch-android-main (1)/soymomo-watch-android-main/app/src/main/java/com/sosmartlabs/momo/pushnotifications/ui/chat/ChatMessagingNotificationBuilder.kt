package com.sosmartlabs.momo.pushnotifications.ui.chat

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.RectF
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.IconCompat
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.presentation.activity.ChatListActivity
import com.sosmartlabs.momo.firebase.FirebaseRemoteConfigRepository
import com.sosmartlabs.momo.main.MainActivity
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.pushnotifications.model.NotificationChannelCategory
import com.sosmartlabs.momo.utils.Constants
import timber.log.Timber
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList
import javax.inject.Inject
import javax.inject.Singleton
import androidx.core.graphics.scale
import androidx.core.graphics.createBitmap
import java.util.Locale

/**
 * Data class representing a chat message for notification display
 */
data class ChatNotificationMessage(
    val conversationId: String,
    val conversationName: String,
    val isGroup: Boolean,
    val senderName: String?,
    val type: String,
    val text: String?,
    val audioDurationMs: Long?,
    val imageUrl: String?,
    val messageIdentifier: String?,
    val timestamp: Long
)

/**
 * Builder for WhatsApp-style MessagingStyle chat notifications.
 * 
 * Features:
 * - Per-watch conversation notifications (unique notification ID per watch)
 * - Group summary for multiple active conversations
 * - MessagingStyle with message history
 * - Support for text, image, and audio message types
 */
@Singleton
class ChatMessagingNotificationBuilder @Inject constructor() {

    companion object {
        private const val GROUP_KEY = "com.sosmartlabs.momoandroid.chat"
        private const val GROUP_SUMMARY_ID = 8180
        private const val MAX_MESSAGES_PER_CONVERSATION = 10
        private const val PROFILE_IMAGE_SIZE = 128 // pixels
        private const val IMAGE_LOAD_TIMEOUT_MS = 3000
    }

    // Cache of messages per conversation for MessagingStyle history
    // Uses CopyOnWriteArrayList for thread-safe iteration during concurrent modifications
    private val messageCache = ConcurrentHashMap<String, CopyOnWriteArrayList<ChatNotificationMessage>>()
    
    // Track active conversations for group summary
    private val activeConversations = ConcurrentHashMap<String, String>() // conversationId -> conversationName
    
    // Cache profile images per conversation to avoid reloading
    private val profileImageCache = ConcurrentHashMap<String, IconCompat>()

    /**
     * Build and show a chat notification for the given message.
     * Creates a MessagingStyle notification for the watch conversation.
     */
    fun showNotification(
        context: Context,
        message: ChatNotificationMessage,
        watch: Wearer? = null
    ) {
        Timber.d(
            "ChatMessagingNotificationBuilder: Building notification for conversationId=${message.conversationId}, type=${message.type}"
        )
        
        // Add message to cache
        addMessageToCache(message)
        
        // Track active conversation
        activeConversations[message.conversationId] = message.conversationName
        
        // Build the conversation notification
        val notification = buildConversationNotification(context, message.conversationId, message, watch)
        
        // Show the notification
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notificationId = getNotificationIdForConversation(message.conversationId)
        notificationManager.notify(notificationId, notification)
        Timber.i(
            "ChatMessagingNotificationBuilder: Notification shown with id=$notificationId for conversationId=${message.conversationId}"
        )
        
        // Update group summary if needed
        updateGroupSummary(context, notificationManager)
    }

    /**
     * Cancel the notification for a specific watch conversation.
     */
    fun cancelNotificationForWatch(context: Context, watchId: String) {
        cancelNotificationForConversation(context, getConversationKeyForWatch(watchId))
    }

    /**
     * Cancel the notification for a specific group conversation.
     */
    fun cancelNotificationForGroup(context: Context, groupId: String) {
        cancelNotificationForConversation(context, getConversationKeyForGroup(groupId))
    }

    /**
     * Cancel all chat notifications.
     */
    fun cancelAllNotifications(context: Context) {
        Timber.d("ChatMessagingNotificationBuilder: Canceling all chat notifications")
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        activeConversations.keys.forEach { conversationId ->
            notificationManager.cancel(getNotificationIdForConversation(conversationId))
        }
        notificationManager.cancel(GROUP_SUMMARY_ID)
        
        messageCache.clear()
        activeConversations.clear()
        profileImageCache.clear()
        Timber.i("ChatMessagingNotificationBuilder: All chat notifications canceled")
    }

    /**
     * Get the notification ID for a specific watch.
     */
    fun getNotificationIdForWatch(watchId: String): Int {
        return getNotificationIdForConversation(getConversationKeyForWatch(watchId))
    }

    fun getNotificationIdForConversation(conversationId: String): Int {
        // Use a stable hash based on namespaced conversation key
        return conversationId.hashCode() and 0x7FFFFFFF // Ensure positive
    }

    fun getConversationKeyForWatch(watchId: String): String = "watch:$watchId"

    fun getConversationKeyForGroup(groupId: String): String = "group:$groupId"

    private fun addMessageToCache(message: ChatNotificationMessage) {
        val messages = messageCache.getOrPut(message.conversationId) { CopyOnWriteArrayList() }
        val identifier = message.messageIdentifier?.takeIf { it.isNotBlank() }
        if (identifier != null && messages.any { it.messageIdentifier == identifier }) {
            Timber.d(
                "ChatMessagingNotificationBuilder: Skipping duplicate message for conversationId=${message.conversationId}, identifier=$identifier"
            )
            return
        }
        messages.add(message)
        
        // Keep only the last N messages - CopyOnWriteArrayList handles concurrent access safely
        while (messages.size > MAX_MESSAGES_PER_CONVERSATION) {
            messages.removeAt(0)
        }
    }

    private fun buildConversationNotification(
        context: Context,
        conversationId: String,
        incomingMessage: ChatNotificationMessage,
        watch: Wearer?
    ): Notification {
        // Get snapshot of messages, filtering out any null entries that may occur during concurrent access
        val messages = messageCache[conversationId]?.toList()?.filterNotNull() ?: emptyList()
        val conversationName = activeConversations[conversationId]
            ?: context.getString(R.string.chat_notification_default_name)
        
        // Get or load profile icon for 1:1 conversations.
        val profileIcon = if (!incomingMessage.isGroup && watch != null) {
            getOrLoadProfileIcon(context, conversationId, watch)
        } else {
            IconCompat.createWithResource(context, R.drawable.ic_group_avatar_white_stroke)
        }
        val defaultSenderPerson = Person.Builder()
            .setName(conversationName)
            .setIcon(profileIcon)
            .setKey(conversationId)
            .build()

        // Build MessagingStyle
        val messagingStyle = NotificationCompat.MessagingStyle(defaultSenderPerson)
            .setConversationTitle(conversationName)
            .setGroupConversation(incomingMessage.isGroup)

        // Add all cached messages
        messages.forEach { msg ->
            val senderPerson = if (msg.isGroup) {
                Person.Builder()
                    .setName(msg.senderName ?: context.getString(R.string.app_name))
                    .setIcon(IconCompat.createWithResource(context, R.drawable.ic_group_avatar_white_stroke))
                    .setKey("${msg.conversationId}:${msg.senderName.orEmpty()}")
                    .build()
            } else {
                defaultSenderPerson
            }
            val messageText = formatMessageContent(context, msg)
            messagingStyle.addMessage(
                messageText,
                msg.timestamp,
                senderPerson
            )
        }

        // Build PendingIntent
        val pendingIntentFlags = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        val contentIntent = PendingIntent.getActivity(
            context,
            getNotificationIdForConversation(conversationId),
            Intent(context, ChatListActivity::class.java).apply {
                if (incomingMessage.isGroup) {
                    putExtra(Constants.EXTRA_GROUP_ID, conversationId.removePrefix("group:"))
                    putExtra(Constants.EXTRA_GROUP_NAME, incomingMessage.conversationName)
                } else if (watch != null) {
                    putExtra(Constants.EXTRA_WATCH, watch)
                }
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            pendingIntentFlags
        )

        // Get latest message for ticker
        val latestCachedMessage = messages.lastOrNull()
        val tickerText = if (latestCachedMessage != null) {
            if (latestCachedMessage.isGroup && !latestCachedMessage.senderName.isNullOrBlank()) {
                "${latestCachedMessage.conversationName}: ${latestCachedMessage.senderName}: ${formatMessageContent(context, latestCachedMessage)}"
            } else {
                "${latestCachedMessage.conversationName}: ${formatMessageContent(context, latestCachedMessage)}"
            }
        } else {
            context.getString(R.string.push_new_message_title)
        }

        return NotificationCompat.Builder(context, NotificationChannelCategory.MESSAGES.id)
            .setSmallIcon(R.drawable.ic_soymomo_silohuette)
            .setColor(ContextCompat.getColor(context, R.color.colorPrimary))
            .setStyle(messagingStyle)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(Notification.DEFAULT_ALL)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .setGroup(GROUP_KEY)
            .setWhen(latestCachedMessage?.timestamp ?: System.currentTimeMillis())
            .setShowWhen(true)
            .setTicker(tickerText)
            .build()
    }
    
    /**
     * Get cached profile icon or load it from the watch image URL.
     * Falls back to default icon if loading fails.
     */
    private fun getOrLoadProfileIcon(context: Context, conversationId: String, watch: Wearer): IconCompat {
        // Check cache first
        profileImageCache[conversationId]?.let { return it }
        
        // Try to load from watch image URL
        val imageUrl = watch.image?.url
        if (imageUrl != null) {
            try {
                val bitmap = loadBitmapFromUrl(imageUrl)
                if (bitmap != null) {
                    val circularBitmap = createCircularBitmap(bitmap)
                    val icon = IconCompat.createWithBitmap(circularBitmap)
                    profileImageCache[conversationId] = icon
                    Timber.d("ChatMessagingNotificationBuilder: Loaded profile image for conversationId=$conversationId")
                    return icon
                }
            } catch (e: Exception) {
                Timber.w(e, "ChatMessagingNotificationBuilder: Failed to load profile image for conversationId=$conversationId")
            }
        }
        
        // Fall back to default icon
        val defaultIcon = IconCompat.createWithResource(context, R.drawable.ic_soymomo_silohuette)
        profileImageCache[conversationId] = defaultIcon
        return defaultIcon
    }
    
    /**
     * Load a bitmap from a URL with timeout.
     */
    private fun loadBitmapFromUrl(urlString: String): Bitmap? {
        return try {
            val url = URL(urlString)
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = IMAGE_LOAD_TIMEOUT_MS
            connection.readTimeout = IMAGE_LOAD_TIMEOUT_MS
            connection.doInput = true
            connection.connect()
            
            val inputStream = connection.inputStream
            val bitmap = BitmapFactory.decodeStream(inputStream)
            inputStream.close()
            connection.disconnect()
            
            // Scale down if too large
            bitmap?.let { scaleBitmap(it, PROFILE_IMAGE_SIZE) }
        } catch (e: Exception) {
            Timber.w(e, "ChatMessagingNotificationBuilder: Error loading bitmap from URL: $urlString")
            null
        }
    }
    
    /**
     * Scale bitmap to target size while maintaining aspect ratio.
     */
    private fun scaleBitmap(source: Bitmap, targetSize: Int): Bitmap {
        val size = minOf(source.width, source.height)
        val x = (source.width - size) / 2
        val y = (source.height - size) / 2
        
        // Crop to square
        val cropped = Bitmap.createBitmap(source, x, y, size, size)
        
        // Scale to target size
        return if (size != targetSize) {
            val scaled = cropped.scale(targetSize, targetSize)
            if (cropped != source) cropped.recycle()
            scaled
        } else {
            cropped
        }
    }
    
    /**
     * Create a circular bitmap from a square bitmap.
     */
    private fun createCircularBitmap(source: Bitmap): Bitmap {
        val size = minOf(source.width, source.height)
        val output = createBitmap(size, size)
        
        val canvas = Canvas(output)
        val paint = Paint().apply {
            isAntiAlias = true
            isFilterBitmap = true
        }
        
        val rect = Rect(0, 0, size, size)
        val rectF = RectF(rect)
        
        // Draw circular mask
        canvas.drawOval(rectF, paint)
        
        // Draw bitmap with SRC_IN to clip to circle
        paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
        canvas.drawBitmap(source, rect, rect, paint)
        
        return output
    }

    private fun formatMessageContent(context: Context, message: ChatNotificationMessage): String {
        return when (message.type) {
            "text" -> message.text ?: context.getString(R.string.push_new_message_title)
            "image" -> "\uD83D\uDCF7 ${context.getString(R.string.notification_photo_label)}"
            "audio" -> {
                val durationStr = message.audioDurationMs?.let { formatAudioDuration(it) }
                if (durationStr != null) {
                    "\uD83C\uDFA4 ${context.getString(R.string.notification_voice_message_label)} ($durationStr)"
                } else {
                    "\uD83C\uDFA4 ${context.getString(R.string.notification_voice_message_label)}"
                }
            }
            "video" -> "\uD83C\uDFA5 ${context.getString(R.string.notification_video_label)}"
            else -> context.getString(R.string.push_new_message_title)
        }
    }

    private fun formatAudioDuration(durationMs: Long): String {
        val totalSeconds = durationMs / 1000
        val minutes = totalSeconds / 60
        val seconds = totalSeconds % 60
        return String.format(Locale.getDefault(), "%d:%02d", minutes, seconds)
    }

    private fun updateGroupSummary(context: Context, notificationManager: NotificationManager) {
        if (activeConversations.size > 1) {
            // Show group summary when there are multiple conversations
            val summaryNotification = buildGroupSummaryNotification(context)
            notificationManager.notify(GROUP_SUMMARY_ID, summaryNotification)
            Timber.d("ChatMessagingNotificationBuilder: Group summary shown with ${activeConversations.size} conversations")
        } else {
            // Cancel group summary if only one or no conversation
            notificationManager.cancel(GROUP_SUMMARY_ID)
            Timber.d("ChatMessagingNotificationBuilder: Group summary canceled (${activeConversations.size} conversations)")
        }
    }

    private fun buildGroupSummaryNotification(context: Context): Notification {
        val conversationCount = activeConversations.size
        val names = activeConversations.values.take(3).joinToString(", ")
        val summaryText = if (conversationCount > 3) {
            "$names +${conversationCount - 3}"
        } else {
            names
        }

        val pendingIntentFlags = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        // Temporary rollout behavior: while the chat list remains hidden for some users, the
        // grouped summary notification must avoid launching ChatListActivity. Remove this branch
        // once the chat-group rollout reaches 100% and the list is always accessible.
        val summaryIntentClass = if (FirebaseRemoteConfigRepository.chatGroupListIsHidden) {
            MainActivity::class.java
        } else {
            ChatListActivity::class.java
        }
        val contentIntent = PendingIntent.getActivity(
            context,
            GROUP_SUMMARY_ID,
            Intent(context, summaryIntentClass).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            pendingIntentFlags
        )

        return NotificationCompat.Builder(context, NotificationChannelCategory.MESSAGES.id)
            .setSmallIcon(R.drawable.ic_soymomo_silohuette)
            .setColor(ContextCompat.getColor(context, R.color.colorPrimary))
            .setContentTitle(context.getString(R.string.app_name))
            .setContentText(context.getString(R.string.notification_messages_summary, conversationCount))
            .setStyle(
                NotificationCompat.InboxStyle()
                    .setBigContentTitle(context.getString(R.string.notification_messages_summary, conversationCount))
                    .setSummaryText(summaryText)
            )
            .setGroup(GROUP_KEY)
            .setGroupSummary(true)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .build()
    }

    private fun cancelNotificationForConversation(context: Context, conversationId: String) {
        Timber.d("ChatMessagingNotificationBuilder: Canceling notification for conversationId=$conversationId")
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notificationId = getNotificationIdForConversation(conversationId)
        notificationManager.cancel(notificationId)

        // Clear caches and active conversation
        messageCache.remove(conversationId)
        activeConversations.remove(conversationId)
        profileImageCache.remove(conversationId)

        // Update group summary
        updateGroupSummary(context, notificationManager)
        Timber.i("ChatMessagingNotificationBuilder: Notification canceled for conversationId=$conversationId")
    }
}
