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
import com.sosmartlabs.momo.main.MainActivity
import com.sosmartlabs.momo.pushnotifications.model.NotificationChannelCategory
import com.sosmartlabs.momo.pushnotifications.model.NotificationMessage
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.sim.SimActivity
import kotlinx.coroutines.CoroutineScope
import org.json.JSONObject
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

class SubscriptionNotificationHandler @Inject constructor() {

    @Inject
    lateinit var ioContext: CoroutineContext

    @Inject
    lateinit var externalScope: CoroutineScope

    fun handleGigsPhoneNumberNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("Received new Gigs phone number message")
        val notificationMessage = NotificationMessage(
            context.getString(R.string.subscription_push_notification_activation_complete_text, jsonData.optString("phoneNumber", "")),
            context.getString(R.string.subscription_push_notification_activation_complete_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO)
        showMessageNotification(context, notificationMessage)
    }

    fun handleSubscriptionPaymentIssueNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("Received subscription payment issue notification")
        val notificationMessage = NotificationMessage(
            context.getString(R.string.subscription_push_notification_payment_issue_text),
            context.getString(R.string.subscription_push_notification_payment_issue_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO)
        showSimActivityNotification(context, notificationMessage)
    }

    fun handleSubscriptionTerminatedNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("Received subscription terminated notification")
        val notificationMessage = NotificationMessage(
            context.getString(R.string.subscription_push_notification_terminated_text),
            context.getString(R.string.subscription_push_notification_terminated_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO)
        showSimActivityNotification(context, notificationMessage)
    }

    private fun showMessageNotification(context: Context, message: NotificationMessage) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent: PendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        showNotification(context, message, pendingIntent)
    }

    private fun showSimActivityNotification(context: Context, message: NotificationMessage) {
        val intent = Intent(context, SimActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent: PendingIntent = PendingIntent.getActivity(
            context,
            message.hashCode(),
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        showNotification(context, message, pendingIntent)
    }

    private fun showNotification(context: Context, message: NotificationMessage, pendingIntent: PendingIntent) {
        val notification = NotificationCompat.Builder(context, NotificationChannelCategory.SUBSCRIPTION.id)
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
        notificationManager.notify(message.hashCode(), notification)
    }

}