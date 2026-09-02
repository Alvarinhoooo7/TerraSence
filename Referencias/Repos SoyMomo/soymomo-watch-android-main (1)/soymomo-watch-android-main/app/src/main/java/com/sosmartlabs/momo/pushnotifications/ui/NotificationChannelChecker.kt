package com.sosmartlabs.momo.pushnotifications.ui

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS
import android.provider.Settings.EXTRA_APP_PACKAGE
import android.provider.Settings.EXTRA_CHANNEL_ID
import androidx.annotation.RequiresApi
import androidx.core.app.NotificationManagerCompat
import javax.inject.Inject


class NotificationChannelChecker @Inject constructor() {

    fun isNotificationChannelEnabled(context: Context, channelId: String?): Boolean {
        return when {
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !channelId.isNullOrEmpty() ->
                isChannelEnabledOnOreoAndAbove(context, channelId)
            Build.VERSION.SDK_INT < Build.VERSION_CODES.O ->
                NotificationManagerCompat.from(context).areNotificationsEnabled()
            else -> false
        }
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun isChannelEnabledOnOreoAndAbove(context: Context, channelId: String): Boolean {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = manager.getNotificationChannel(channelId)
        return channel.importance != NotificationManager.IMPORTANCE_NONE
    }

    fun openAppNotificationSettings(context: Context, channelId: String?) {
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            createIntentForOreoAndAbove(context, channelId)
        } else {
            createIntentForBelowOreo(context)
        }

        context.startActivity(intent)
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun createIntentForOreoAndAbove(context: Context, channelId: String?): Intent {
        return Intent(ACTION_APP_NOTIFICATION_SETTINGS).apply {
            putExtra(EXTRA_APP_PACKAGE, context.packageName)
            channelId?.let {
                if (it.isNotBlank()) {
                    putExtra(EXTRA_CHANNEL_ID, it)
                }
            }
        }
    }

    private fun createIntentForBelowOreo(context: Context): Intent {
        return Intent("android.settings.APP_NOTIFICATION_SETTINGS").apply {
            putExtra("app_package", context.packageName)
            putExtra("app_uid", context.applicationInfo.uid)
        }
    }
}