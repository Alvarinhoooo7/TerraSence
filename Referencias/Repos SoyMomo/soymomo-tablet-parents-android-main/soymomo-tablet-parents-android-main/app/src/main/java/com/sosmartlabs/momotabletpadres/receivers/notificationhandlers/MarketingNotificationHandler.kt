package com.sosmartlabs.momotabletpadres.receivers.notificationhandlers

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Bundle
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.main.MainActivity
import com.sosmartlabs.momotabletpadres.receivers.ParseInstructionReceiver
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONObject
import timber.log.Timber
import javax.inject.Inject

class MarketingNotificationHandler @Inject constructor(
    @ApplicationContext context: Context,
    userRepository: UserRepository,
) : NotificationHandler(context, userRepository) {

    override val notificationId: Int
        get() = 0

    override var notificationContentTitleId: Int = 0

    override var notificationContextTextId: Int = 0

    override val notificationErrorText: String = "Marketing Notification Error"

    override fun getNotificationContentParams(jsonData: JSONObject): Array<String> = emptyArray()

    override fun getNotificationsArgsBundle(jsonData: JSONObject): Bundle = Bundle()

    override fun getNotificationPendingIntent(args: Bundle): PendingIntent {
        throw NotImplementedError("This method should not be called.")
    }

    override suspend fun handleNotification(jsonData: JSONObject) {
        Timber.d("handleMarketingNotification")
        CrashlyticsLog.log("Received marketing message")

        val type = jsonData.optString("type", "app")
        val title = jsonData.optString("title", "SoyMomo")
        val message = jsonData.optString("message", "SoyMomo")

        val notification = when (type) {
            "app" -> buildAppNotification(title, message)
            "url" -> {
                val url = jsonData.optString("url", "www.soymomo.com")
                buildUrlNotification(title, message, url)
            }
            else -> {
                Timber.w("Unknown marketing notification type: $type")
                null
            }
        }

        if (notification != null) {
            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(message.hashCode(), notification)
        }
    }

    private fun buildAppNotification(title: String, message: String): Notification {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent: PendingIntent =
            PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)

        return NotificationCompat.Builder(context, ParseInstructionReceiver.CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(R.drawable.ic_soymomo_silohuette)
            .setLargeIcon(
                BitmapFactory.decodeResource(
                    context.resources,
                    R.mipmap.ic_launcher
                )
            )
            .setDefaults(Notification.DEFAULT_ALL)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun buildUrlNotification(title: String, message: String, url: String): Notification {
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

        return NotificationCompat.Builder(context, ParseInstructionReceiver.CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(R.drawable.ic_soymomo_silohuette)
            .setColor(ContextCompat.getColor(context, R.color.colorPrimary))
            .setLargeIcon(
                BitmapFactory.decodeResource(
                    context.resources,
                    R.mipmap.ic_launcher
                )
            )
            .setDefaults(Notification.DEFAULT_ALL)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
    }
}
