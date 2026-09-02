package com.sosmartlabs.momo.pushnotifications.ui.handlers

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import androidx.core.app.NotificationCompat
import androidx.core.app.TaskStackBuilder
import androidx.core.content.ContextCompat
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.db.ContactRequest
import com.sosmartlabs.momo.db.MomoDatabase
import com.sosmartlabs.momo.main.MainActivity
import com.sosmartlabs.momo.pushnotifications.model.NotificationChannelCategory
import com.sosmartlabs.momo.pushnotifications.model.NotificationMessage
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.watchrequests.WatchRequestActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import org.json.JSONException
import org.json.JSONObject
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

class WatchOwnershipNotificationHandler @Inject constructor() {

    @Inject
    lateinit var ioContext: CoroutineContext

    @Inject
    lateinit var externalScope: CoroutineScope

    fun handleOwnershipTransferNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("Received admin ownership transfer message")
        val notificationMessage = NotificationMessage(
            context.getString(R.string.push_admin_text, jsonData.optString("previousOwner", ""), jsonData.optString("watchName", "")),
            context.getString(R.string.push_admin_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_USER)
        showMessageNotification(context, notificationMessage)
    }

    fun handleAddRequestNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("Received new add request message")
        val notificationMessage = NotificationMessage(
            context.getString(R.string.push_new_request_text, jsonData.optString("requestedBy", ""), jsonData.optString("watchName", "")),
            context.getString(R.string.push_new_request_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_REQUEST)
        val watchId = jsonData.optString("watchId", "")
        val contentIntent = if (watchId.isNotBlank()) {
            watchRequestPendingIntent(context, watchId)
        } else {
            null
        }
        showMessageNotification(context, notificationMessage, contentIntent)
    }

    /**
     * Deep-links the "new request" notification straight to the watch's request screen,
     * with MainActivity beneath it so Back returns to the app home. The watchId comes
     * from the push payload and matches Constants.EXTRA_WEARER_ID (the Wearer objectId).
     */
    private fun watchRequestPendingIntent(context: Context, watchId: String): PendingIntent? {
        val mainIntent = Intent(context, MainActivity::class.java)
        val requestIntent = Intent(context, WatchRequestActivity::class.java).apply {
            putExtra(Constants.EXTRA_WEARER_ID, watchId)
        }
        return TaskStackBuilder.create(context)
            .addNextIntent(mainIntent)
            .addNextIntent(requestIntent)
            .getPendingIntent(
                watchId.hashCode(),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
    }

    fun handleAddAcceptRequestNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("Received request accepted message")
        if (jsonData.has("watchId")) {
            externalScope.launch(ioContext) {
                try {
                    MomoDatabase.getDatabase(context).contactRequestModel().addContactRequest(
                        ContactRequest(jsonData.getString("watchId"))
                    )
                } catch (e: JSONException) {
                    with(Firebase.crashlytics) {
                        log("Error adding contact request")
                        recordException(e)
                    }
                    Timber.e(e)
                }
            }
        }
        val notificationMessage = NotificationMessage(
            context.getString(R.string.push_accepted_request_text, jsonData.optString("watchName", "")),
            context.getString(R.string.push_accepted_request_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_USER)
        showMessageNotification(context, notificationMessage)
    }

    fun handleAddRejectRequestNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("Received request rejected message")
        val notificationMessage = NotificationMessage(
            context.getString(R.string.push_rejected_request_text, jsonData.optString("watchName", "")),
            context.getString(R.string.push_rejected_request_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_USER)
        showMessageNotification(context, notificationMessage)
    }

    fun handleUserRemovedNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("Received user removed message")
        val notificationMessage = NotificationMessage(
            context.getString(R.string.push_user_removed_text, jsonData.optString("userInCharge", ""), jsonData.optString("watchName", "")),
            context.getString(R.string.push_user_removed_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_USER)
        showMessageNotification(context, notificationMessage)
    }

    fun handleNewFriendNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        CrashlyticsLog.log("Received new friend message")
        val notificationMessage = NotificationMessage(
            context.getString(R.string.push_new_friend_text, jsonData.optString("watchName", "")),
            context.getString(R.string.push_new_friend_title),
            System.currentTimeMillis(),
            NotificationMessage.TYPE_MOMO)
        showMessageNotification(context, notificationMessage)
    }

    private fun showMessageNotification(
        context: Context,
        message: NotificationMessage,
        contentIntent: PendingIntent? = null
    ) {
        val pendingIntent: PendingIntent = contentIntent ?: run {
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        }

        val notification = NotificationCompat.Builder(context, NotificationChannelCategory.OWNERSHIP.id)
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