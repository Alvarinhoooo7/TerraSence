package com.sosmartlabs.momotabletpadres.receivers.notificationhandlers

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.os.Bundle
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.sosmartlabs.momotabletpadres.BuildConfig
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.receivers.ParseInstructionReceiver
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import org.json.JSONObject
import timber.log.Timber

/**
 * Base class for notification handling
 * @param context Context for launching notification
 * @param userRepository Repository for users
 */
abstract class NotificationHandler (protected val context: Context,
                                    protected val userRepository: UserRepository) {

    /**
     * Id for the notification to be launched
     */
    protected abstract val notificationId: Int

    /**
     * Small icon Id for notification
     */
    protected open val notificationSmallIconId = R.drawable.ic_soymomo_silohuette

    /**
     * Large icon Id for notification
     */
    protected open val notificationLargeIconId = R.drawable.ic_soymomo_silohuette

    /**
     * Id for notification title text
     */
    protected abstract var notificationContentTitleId: Int

    /**
     * Id for notification content text.
     * Can be a text with placeholders, that should be provided by [getNotificationContentParams] function
     */
    protected abstract var notificationContextTextId: Int

    /**
     * Text for logging error on Firebase
     */
    protected abstract val notificationErrorText: String

    /**
     * Creates a [Bundle] for been sent with a notification.
     * By default, returns an empty [Bundle]. Must be overridden for add extra information
     * @param jsonData Data for this notification
     * @return [Bundle] for this notification with all their required data
     */
    protected open fun getNotificationsArgsBundle(jsonData: JSONObject): Bundle = Bundle()

    /**
     * Obtain the notification content text arguments for been used with [notificationContextTextId]
     * @param jsonData Data for this notification
     */
    protected abstract fun getNotificationContentParams(jsonData: JSONObject): Array<String>

    /**
     * Loads the pending intent for include with this notification
     * @param args Arguments to include with this pending intent
     */
    protected abstract fun getNotificationPendingIntent(args: Bundle): PendingIntent

    /**
     * Handles the received notification
     * @param jsonData Data for this notification
     */
    open suspend fun handleNotification(jsonData: JSONObject) {
        val currentUser = userRepository.getCurrentParseUser()!!

        onNotificationLaunch(jsonData)

        if (!currentUser.has("pushRequests") || currentUser.getBoolean("pushRequests")) {
            try{
                val pendingIntent = getNotificationPendingIntent(getNotificationsArgsBundle(jsonData))

                val builder = NotificationCompat.Builder(context, ParseInstructionReceiver.CHANNEL_ID)
                    .setSmallIcon(notificationSmallIconId)
                    .setLargeIcon(BitmapFactory.decodeResource(context.resources, notificationLargeIconId))
                    .setContentTitle(context.getString(notificationContentTitleId))
                    .setContentText(context.getString(notificationContextTextId,
                        *getNotificationContentParams(jsonData)))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent)

                with(NotificationManagerCompat.from(context)) {
                    if (ActivityCompat.checkSelfPermission(
                            context,
                            Manifest.permission.POST_NOTIFICATIONS
                        ) != PackageManager.PERMISSION_GRANTED
                    ) {
                        return
                    }
                    notify(notificationId, builder.build())
                }
            }catch (e: Exception){
                Timber.e(e, notificationErrorText)
                if(BuildConfig.DEBUG){
                    throw java.lang.Exception("$notificationErrorText: $e")
                }
                else CrashlyticsLog.recordNonFatalError(e, notificationErrorText)
            }
        }
    }

    /**
     * Method called when a notification is been launched
     * @param jsonData Data for this notification
     */
    protected open fun onNotificationLaunch(jsonData: JSONObject) {
        // Override on child classes if necessary
    }
}