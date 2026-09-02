package com.sosmartlabs.momo.pushnotifications.ui

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.graphics.Color
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.pushnotifications.model.NotificationChannelCategory
import javax.inject.Inject

class NotificationChannelCreator @Inject constructor()  {

    private fun createNotificationChannel(
        context: Context,
        channelId: String,
        nameResId: Int,
        importance: Int,
        enableLights: Boolean,
        lightColor: Int,
        enableVibration: Boolean,
        vibrationPattern: LongArray? = null,
        bypassDnd: Boolean = false,
        soundUri: Uri? = null,
        audioAttributes: AudioAttributes? = null
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val name = context.getString(nameResId)
            val channel = NotificationChannel(channelId, name, importance)

            channel.enableLights(enableLights)
            channel.lightColor = lightColor
            channel.enableVibration(enableVibration)
            channel.vibrationPattern = vibrationPattern
            channel.setBypassDnd(bypassDnd)

            soundUri?.let { uri ->
                audioAttributes?.let { attributes ->
                    channel.setSound(uri, attributes)
                }
            }

            notificationManager.createNotificationChannel(channel)
        }
    }

    @SuppressLint("InlinedApi")
    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val defaultVibrationPattern = longArrayOf(0, 1000, 500, 1000)
        val defaultRingtoneUri: Uri = Settings.System.DEFAULT_RINGTONE_URI
        val audioAttributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_REQUEST).build()

        createNotificationChannel(
            context,
            NotificationChannelCategory.OTHER.id,
            R.string.notification_channel_other_title,
            NotificationManager.IMPORTANCE_DEFAULT,
            true,
            Color.MAGENTA,
            true)

        createNotificationChannel(
            context,
            NotificationChannelCategory.GEOFENCE.id,
            R.string.notification_channel_geofences_title,
            NotificationManager.IMPORTANCE_HIGH,
            true,
            Color.MAGENTA,
            true)

        createNotificationChannel(
            context,
            NotificationChannelCategory.MESSAGES.id,
            R.string.notification_channel_messages_title,
            NotificationManager.IMPORTANCE_HIGH,
            true,
            Color.MAGENTA,
            true)

        createNotificationChannel(
            context,
            NotificationChannelCategory.VIDEOCALL.id,
            R.string.channel_videocall_name,
            NotificationManager.IMPORTANCE_HIGH,
            true,
            Color.MAGENTA,
            true,
            defaultVibrationPattern,
            true,
            defaultRingtoneUri,
            audioAttributes)

        createNotificationChannel(
            context,
            NotificationChannelCategory.WATCH.id,
            R.string.notification_channel_watch_title,
            NotificationManager.IMPORTANCE_HIGH,
            true,
            Color.MAGENTA,
            true)


        createNotificationChannel(
            context,
            NotificationChannelCategory.OWNERSHIP.id,
            R.string.notification_channel_ownership_title,
            NotificationManager.IMPORTANCE_DEFAULT,
            true,
            Color.MAGENTA,
            true)

        createNotificationChannel(
            context,
            NotificationChannelCategory.GROUP_MEMBERSHIP.id,
            R.string.notification_channel_group_membership_title,
            NotificationManager.IMPORTANCE_DEFAULT,
            true,
            Color.MAGENTA,
            false)

        createNotificationChannel(
            context,
            NotificationChannelCategory.SUBSCRIPTION.id,
            R.string.notification_channel_subscription_title,
            NotificationManager.IMPORTANCE_HIGH,
            true,
            Color.MAGENTA,
            true)

        createNotificationChannel(
            context,
            NotificationChannelCategory.MARKETING.id,
            R.string.notification_channel_marketing_title,
            NotificationManager.IMPORTANCE_DEFAULT,
            true,
            Color.MAGENTA,
            true)

        createNotificationChannel(
            context,
            NotificationChannelCategory.LINGO.id,
            R.string.notification_channel_lingo_title,
            NotificationManager.IMPORTANCE_DEFAULT,
            true,
            Color.MAGENTA,
            true)
    }

}