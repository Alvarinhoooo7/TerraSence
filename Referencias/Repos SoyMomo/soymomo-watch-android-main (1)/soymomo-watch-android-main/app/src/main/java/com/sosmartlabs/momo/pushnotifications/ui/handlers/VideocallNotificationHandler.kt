package com.sosmartlabs.momo.pushnotifications.ui.handlers

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.pushnotifications.model.NotificationChannelCategory
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.videocall.CallActivity
import com.sosmartlabs.momo.videocall.receivers.NotifyEndVideocallReceiver
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.json.JSONObject
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

class VideocallNotificationHandler @Inject constructor() {

    @Inject
    lateinit var ioContext: CoroutineContext

    @Inject
    lateinit var externalScope: CoroutineScope

    fun handleVideocallIncomingNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("Received incoming videocall message")
        showVideocallNotification(context, jsonData)
    }

    fun handleVideocallHangupNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("Received hangup videocall message")
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(Constants.NOTIFICATION_VIDEOCALL)
        // setPackage keeps the broadcast inside this app, matching the NOT_EXPORTED receiver in
        // CallActivity — an implicit broadcast would otherwise be visible to any installed app.
        val videocallHangupIntent = Intent("${context.packageName}.videocallHangup")
            .setPackage(context.packageName)
        context.sendBroadcast(videocallHangupIntent)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    private fun showVideocallNotification(context: Context, jsonData: JSONObject) {
        val title = context.getString(R.string.push_videocall_title)
        val description = context.getString(R.string.push_videocall_text, jsonData.optString("watchName", ""))

        val watchId = jsonData.optString("watchId", "")
        val isOutgoing = false
        val watchName = jsonData.optString("watchName", "")
        val watchImage = jsonData.optString("watchImage", "")

        val pendingIntentFlags = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT

        val fullScreenIntent = Intent(context, CallActivity::class.java)
        fullScreenIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        fullScreenIntent.putExtra("type", "watch")
        fullScreenIntent.putExtra("typeId", watchId)
        fullScreenIntent.putExtra("isOutgoing", isOutgoing)
        fullScreenIntent.putExtra("contactName", watchName)
        fullScreenIntent.putExtra("contactImage", watchImage)
        fullScreenIntent.putExtra("intentAction", "")
        fullScreenIntent.putExtra("wearerDeviceId", watchId)
        val fullScreenPendingIntent = PendingIntent.getActivity(context, 8080, fullScreenIntent, pendingIntentFlags)

        val answerIntent = Intent(context, CallActivity::class.java)
        answerIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        answerIntent.putExtra("type", "watch")
        answerIntent.putExtra("typeId", watchId)
        answerIntent.putExtra("isOutgoing", isOutgoing)
        answerIntent.putExtra("contactName", watchName)
        answerIntent.putExtra("contactImage", watchImage)
        answerIntent.putExtra("intentAction", "answer")
        answerIntent.putExtra("wearerDeviceId", watchId)
        val answerPendingIntent = PendingIntent.getActivity(context, 8081, answerIntent, pendingIntentFlags)

        val declineIntent = Intent(context, NotifyEndVideocallReceiver::class.java)
        declineIntent.putExtra("typeId", watchId)
        declineIntent.putExtra("wearerDeviceId", watchId)
        val declinePendingIntent = PendingIntent.getBroadcast(context, 8082, declineIntent, pendingIntentFlags)

        val notification = NotificationCompat.Builder(context, NotificationChannelCategory.VIDEOCALL.id)
            .setDefaults(Notification.DEFAULT_ALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSmallIcon(R.drawable.ic_soymomo_silohuette)
            .setOngoing(true)
            .setWhen(System.currentTimeMillis())
            .setContentTitle(title)
            .setContentText(description)
            .setVibrate(longArrayOf(0, 400, 250, 400))
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE))
            .setColor(ContextCompat.getColor(context, R.color.colorPrimary))
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .addAction(R.drawable.ic_action_call, context.getString(R.string.button_answer), answerPendingIntent)
            .addAction(R.drawable.ic_action_call_end, context.getString(R.string.button_decline), declinePendingIntent)
            .build()
        notification.flags = Notification.FLAG_INSISTENT

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(Constants.NOTIFICATION_VIDEOCALL, notification)
    }

}