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
import com.sosmartlabs.momo.utils.Constants
import kotlinx.coroutines.CoroutineScope
import org.json.JSONObject
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

class WatchActionsNotificationHandler @Inject constructor() {

    @Inject
    lateinit var ioContext: CoroutineContext

    @Inject
    lateinit var externalScope: CoroutineScope

    fun handleSOSNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        Timber.d("WatchActionsNotificationHandler: Handling SOS notification")
        CrashlyticsLog.log("WatchActionsNotificationHandler: Received SOS message")
        val wearerId = extractWearerId(jsonData)
        val notificationMessage = NotificationMessage(
            context.getString(R.string.push_sos_text, jsonData.optString("watchName", "")),
            context.getString(R.string.push_sos_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO)
        showMessageNotification(
            context = context,
            message = notificationMessage,
            wearerId = wearerId,
            notificationSource = Constants.NOTIFICATION_SOURCE_SOS
        )
    }

    fun handleValidatedReminderNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        Timber.d("WatchActionsNotificationHandler: Handling Validated Reminder notification")
        CrashlyticsLog.log("WatchActionsNotificationHandler: Received Reminder Validation message")
        val notificationMessage = NotificationMessage(
            context.getString(
                R.string.push_validation_reminder_text,
                jsonData.optString("reminderName", ""),
                jsonData.optString("watchName", "")
            ),
            context.getString(R.string.push_validation_reminder_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO
        )
        showMessageNotification(context, notificationMessage)
    }

    fun handleTakeOffNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        Timber.d("WatchActionsNotificationHandler: Handling Take Off notification")
        CrashlyticsLog.log("WatchActionsNotificationHandler: Received take off message")
        if (!currentUser.has("pushTakeOff") || currentUser.getBoolean("pushTakeOff")) {
            val notificationMessage = NotificationMessage(
                context.getString(R.string.push_sensor_text, jsonData.optString("watchName", "")),
                context.getString(R.string.push_sensor_title),
                System.currentTimeMillis(),
                NotificationMessage.TYPE_MOMO)
            showMessageNotification(context, notificationMessage)
        } else {
            Timber.d("WatchActionsNotificationHandler: Take Off notification suppressed by user settings")
        }
    }

    fun handleLowBatteryNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        Timber.d("WatchActionsNotificationHandler: Handling Low Battery notification")
        CrashlyticsLog.log("WatchActionsNotificationHandler:Received low battery message")
        val notificationMessage = NotificationMessage(
            context.getString(R.string.push_low_battery_text, jsonData.optString("watchName", "")),
            context.getString(R.string.push_low_battery_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO)
        showMessageNotification(context, notificationMessage)
    }

    fun handleBatterySavingNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        Timber.d("WatchActionsNotificationHandler: Handling Battery Saving notification")
        CrashlyticsLog.log("WatchActionsNotificationHandler:Received battery saving message")
        val notificationMessage = NotificationMessage(
            context.getString(R.string.push_battery_saving_text, jsonData.optString("watchName", "")),
            context.getString(R.string.push_battery_saving_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO)
        showMessageNotification(context, notificationMessage)
    }

    fun handlePowerOnNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        Timber.d("WatchActionsNotificationHandler: Handling Power On notification")
        CrashlyticsLog.log("WatchActionsNotificationHandler:Received power on message")
        val notificationMessage = NotificationMessage(
            context.getString(R.string.push_power_on_text),
            context.getString(R.string.push_power_on_title, jsonData.optString("watchName", "")),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO)
        showMessageNotification(context, notificationMessage)
    }

    fun handlePowerOffNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        Timber.d("WatchActionsNotificationHandler: Handling Power Off notification")
        CrashlyticsLog.log("WatchActionsNotificationHandler:Received power off message")
        val notificationMessage = NotificationMessage(
            context.getString(R.string.push_power_off_text),
            context.getString(R.string.push_power_off_title, jsonData.optString("watchName", "")),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO)
        showMessageNotification(context, notificationMessage)
    }

    fun handleFirstInteractionNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        Timber.d("WatchActionsNotificationHandler: Handling First Interaction notification")
        CrashlyticsLog.log("WatchActionsNotificationHandler: Received First Interaction message")
        
        // Show notification
        val notificationMessage = NotificationMessage(
            context.getString(
                R.string.push_first_interaction_text,
                jsonData.optString("watchName", "")
            ),
            context.getString(R.string.push_first_interaction_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO
        )
        showMessageNotification(context, notificationMessage)

        // Send broadcast without device ID
        Intent(Constants.ACTION_FIRST_INTERACTION).also { intent ->
            context.sendBroadcast(intent)
            Timber.d("WatchActionsNotificationHandler: Sent first interaction broadcast")
        }
    }

    private fun showMessageNotification(
        context: Context,
        message: NotificationMessage,
        wearerId: String = "",
        notificationSource: String? = null
    ) {
        Timber.d("WatchActionsNotificationHandler: Showing notification - ${message.sender}")
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            if (wearerId.isNotEmpty()) {
                putExtra(Constants.EXTRA_WEARER_ID, wearerId)
            }
            if (!notificationSource.isNullOrEmpty()) {
                putExtra(Constants.EXTRA_NOTIFICATION_SOURCE, notificationSource)
            }
        }
        val requestCode = if (wearerId.isNotEmpty()) wearerId.hashCode() else 0
        val pendingIntent: PendingIntent = PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(context, NotificationChannelCategory.WATCH.id)
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
        Timber.d("WatchActionsNotificationHandler: Notification shown successfully")
    }

    /**
     * SOS payloads may provide ids under different keys depending on backend version.
     */
    private fun extractWearerId(jsonData: JSONObject): String {
        val parsedId = jsonData.optString("wearerId", "")
            .ifBlank { jsonData.optString("watchId", "") }
            .ifBlank { jsonData.optString("objectId", "") }

        Timber.d(
            "WatchActionsNotificationHandler: parsed SOS wearer intent id=$parsedId " +
                "wearerId=${jsonData.optString("wearerId", "")} " +
                "watchId=${jsonData.optString("watchId", "")}"
        )
        return parsedId
    }
}
