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
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.main.MainActivity
import com.sosmartlabs.momo.pushnotifications.model.NotificationChannelCategory
import com.sosmartlabs.momo.pushnotifications.model.NotificationMessage
import com.sosmartlabs.momo.utils.Constants
import org.json.JSONObject
import timber.log.Timber
import javax.inject.Inject

class LingoNotificationHandler @Inject constructor() {

    fun handleLingoStartedNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("LingoNotificationHandler: Received lingo started notification")
        val wearerId = jsonData.optString("watchId", "")
        val wearerName = jsonData.optString("wearerName", "")
        val language = jsonData.optString("language", "")

        // Unshipped languages fall back to a generic, language-agnostic message so a language
        // enabled in the cloud before an app update never names the wrong one (e.g. "English").
        val bodyResId = when (language.lowercase().take(2)) {
            "es" -> R.string.pn_lingo_started_es_text
            "en" -> R.string.pn_lingo_started_en_text
            "de" -> R.string.pn_lingo_started_de_text
            "fr" -> R.string.pn_lingo_started_fr_text
            "sv" -> R.string.pn_lingo_started_sv_text
            else -> R.string.pn_lingo_started_generic_text
        }

        val message = NotificationMessage(
            context.getString(bodyResId, wearerName),
            context.getString(R.string.pn_lingo_started_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO,
        )
        showLingoNotification(context, message, wearerId)
    }

    fun handleLingoChallengeCompleteNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("LingoNotificationHandler: Received lingo challenge complete notification")
        val wearerId = jsonData.optString("watchId", "")
        val wearerName = jsonData.optString("wearerName", "")
        val levelName = jsonData.optString("levelDisplayName", "")

        val message = NotificationMessage(
            context.getString(R.string.pn_lingo_challenge_text, wearerName, levelName),
            context.getString(R.string.pn_lingo_challenge_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO,
        )
        showLingoNotification(context, message, wearerId)
    }

    private fun showLingoNotification(context: Context, message: NotificationMessage, wearerId: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            if (wearerId.isNotEmpty()) {
                putExtra(Constants.EXTRA_WEARER_ID, wearerId)
                putExtra(Constants.EXTRA_OPEN_LINGO_PROGRESS, true)
            }
        }

        val requestCode = if (wearerId.isNotEmpty()) wearerId.hashCode() else 0
        val pendingIntent: PendingIntent = PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        val notification = NotificationCompat.Builder(context, NotificationChannelCategory.LINGO.id)
            .setContentTitle(message.sender)
            .setContentText(message.text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message.text))
            .setColor(ContextCompat.getColor(context, R.color.colorPrimary))
            .setSmallIcon(R.drawable.ic_soymomo_silohuette)
            .setLargeIcon(BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher))
            .setDefaults(Notification.DEFAULT_ALL)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notificationId = (wearerId + message.sender).hashCode()
        notificationManager.notify(notificationId, notification)
        Timber.d("LingoNotificationHandler: notification shown id=$notificationId wearerId=$wearerId")
    }
}
