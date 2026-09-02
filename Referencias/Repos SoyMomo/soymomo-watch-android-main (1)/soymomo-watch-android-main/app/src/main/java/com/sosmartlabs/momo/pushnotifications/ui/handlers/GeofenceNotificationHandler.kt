package com.sosmartlabs.momo.pushnotifications.ui.handlers

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.pushnotifications.model.NotificationMessage
import com.sosmartlabs.momo.main.MainActivity
import com.sosmartlabs.momo.pushnotifications.model.NotificationChannelCategory
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.review.ReviewPromptRepository
import com.sosmartlabs.momo.utils.Constants
import kotlinx.coroutines.CoroutineScope
import org.json.JSONObject
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext
import timber.log.Timber

class GeofenceNotificationHandler @Inject constructor() {
    @Inject
    lateinit var ioContext: CoroutineContext

    @Inject
    lateinit var externalScope: CoroutineScope

    @Inject
    lateinit var reviewPromptRepository: ReviewPromptRepository

    companion object {
        private val activeNotificationIds = mutableSetOf<Int>()

        /**
         * Cancel all active geofence notifications.
         * Called when a geofence notification is clicked to dismiss all others.
         */
        fun cancelAllGeofenceNotifications(context: Context) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            activeNotificationIds.forEach { id ->
                notificationManager.cancel(Constants.NOTIFICATION_TAG_GEOFENCE, id)
            }
            activeNotificationIds.clear()
        }
    }

    fun handleEnterGeofenceNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("Received enter geofence message")
        val wearerId = extractWearerId(jsonData)
        val notificationMessage = NotificationMessage(
            context.getString(R.string.push_geofence_in_text, jsonData.optString("watchName", ""), jsonData.optString("placeName", "")),
            context.getString(R.string.push_geofence_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO)
        showMessageNotification(context, notificationMessage, wearerId)
        reviewPromptRepository.recordPositiveUserAction()
    }

    fun handleExitGeofenceNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("Received exit geofence message")
        val wearerId = extractWearerId(jsonData)
        val notificationMessage = NotificationMessage(
            context.getString(R.string.push_geofence_out_text, jsonData.optString("watchName", ""), jsonData.optString("placeName", "")),
            context.getString(R.string.push_geofence_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO)
        showMessageNotification(context, notificationMessage, wearerId)
        reviewPromptRepository.recordPositiveUserAction()
    }

    private fun showMessageNotification(context: Context, message: NotificationMessage, wearerId: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            if (wearerId.isNotEmpty()) {
                putExtra(Constants.EXTRA_WEARER_ID, wearerId)
            }
            putExtra(Constants.EXTRA_NOTIFICATION_SOURCE, Constants.NOTIFICATION_SOURCE_GEOFENCE)
        }
        val requestCode = if (wearerId.isNotEmpty()) wearerId.hashCode() else 0
        val pendingIntent: PendingIntent = PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(context, NotificationChannelCategory.GEOFENCE.id)
            .setContentTitle(message.sender)
            .setContentText(message.text)
            .setColor(ContextCompat.getColor(context, R.color.colorPrimary))
            .setSmallIcon(R.drawable.ic_soymomo_silohuette)
            .setLargeIcon(BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher))
            .setDefaults(Notification.DEFAULT_ALL)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notificationId = message.hashCode()
        activeNotificationIds.add(notificationId)
        notificationManager.notify(Constants.NOTIFICATION_TAG_GEOFENCE, notificationId, notification)
    }

    /**
     * Geofence payloads may use either `wearerId` (legacy) or `watchId` (current).
     */
    private fun extractWearerId(jsonData: JSONObject): String {
        val parsedId = jsonData.optString("wearerId", "")
            .ifBlank { jsonData.optString("watchId", "") }
            .ifBlank { jsonData.optString("objectId", "") }

        Timber.d(
            "GeofenceNotificationHandler: parsed wearer intent id=$parsedId " +
                "wearerId=${jsonData.optString("wearerId", "")} " +
                "watchId=${jsonData.optString("watchId", "")}"
        )
        return parsedId
    }
}
