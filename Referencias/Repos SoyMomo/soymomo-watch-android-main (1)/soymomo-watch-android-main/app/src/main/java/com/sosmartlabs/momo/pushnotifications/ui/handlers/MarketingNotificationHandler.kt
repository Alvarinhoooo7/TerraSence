package com.sosmartlabs.momo.pushnotifications.ui.handlers

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat.getColor
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.main.MainActivity
import com.sosmartlabs.momo.pushnotifications.model.NotificationChannelCategory
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import kotlinx.coroutines.CoroutineScope
import org.json.JSONObject
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext
import androidx.core.net.toUri


class MarketingNotificationHandler @Inject constructor() {
    @Inject
    lateinit var ioContext: CoroutineContext

    @Inject
    lateinit var externalScope: CoroutineScope

    fun handleMarketingNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        Timber.d("handleMarketingNotification")
        CrashlyticsLog.log("Received marketing message")
        val type = jsonData.optString("type", "app")
        val title = jsonData.optString("title", "SoyMomo")
        val message = jsonData.optString("message", "SoyMomo")
        when (type) {
            "app" -> {
                showAppNotification(context, title, message)
            }
            "url" -> {
                val url = jsonData.optString("url", "www.soymomo.com")
                showUrlNotification(context, title, message, url)
            }
        }
    }

    private fun showAppNotification(context: Context, title: String, message: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent: PendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)

        val notification = NotificationCompat.Builder(context, NotificationChannelCategory.MARKETING.id)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(R.drawable.ic_soymomo_silohuette)
            .setLargeIcon(BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher))
            .setDefaults(Notification.DEFAULT_ALL)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(message.hashCode(), notification)
    }

    private fun showUrlNotification(context: Context, title: String, message: String, url: String) {
        Timber.d("showUrlNotification: $url")
        val intent = Intent(Intent.ACTION_VIEW).apply {
            data = url.toUri()
        }
        val pendingIntent: PendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, NotificationChannelCategory.MARKETING.id)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(R.drawable.ic_soymomo_silohuette)
            .setColor(getColor(context, R.color.colorPrimary))
            .setLargeIcon(BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher))
            .setDefaults(Notification.DEFAULT_ALL)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(message.hashCode(), notification)
    }

}