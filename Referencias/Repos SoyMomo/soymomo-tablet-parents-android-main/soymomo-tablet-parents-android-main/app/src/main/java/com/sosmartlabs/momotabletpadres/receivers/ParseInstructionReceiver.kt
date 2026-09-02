package com.sosmartlabs.momotabletpadres.receivers

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import com.parse.ParsePushBroadcastReceiver
import com.sosmartlabs.momotabletpadres.BuildConfig
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class ParseInstructionReceiver : ParsePushBroadcastReceiver() {

    companion object {
        const val CHANNEL_ID = "parse_instruction_channel"
    }

    private val coroutineScope = CoroutineScope(Dispatchers.IO)

    @Inject
    lateinit var tabletRepository: TabletRepository

    @Inject
    lateinit var notificationHandlerProvider: NotificationHandlerProvider

    override fun onReceive(context: Context?, intent: Intent?) {
        try {
            super.onReceive(context, intent)
        } catch (e: Exception) {
            Timber.e(e, "ParseInstructionReceiver: Error processing received Parse instruction")
            CrashlyticsLog.recordNonFatalError(e, "Error on receive")
        }
    }

    override fun onPushReceive(context: Context, intent: Intent?) {
        Timber.d("ParseInstructionReceiver: Processing push notification")

        coroutineScope.launch {
            try {
                createNotificationChannel(context)

                val pushData = intent?.getStringExtra(KEY_PUSH_DATA)
                    ?: run {
                        Timber.w("ParseInstructionReceiver: Push data is null")
                        return@launch
                    }
                val jsonData = JSONObject(pushData)
                val code = jsonData.optInt("code", -1)

                Timber.d("ParseInstructionReceiver: Received notification with code $code")

                notificationHandlerProvider.getNotificationHandler(code)?.let { handler ->
                    Timber.d("ParseInstructionReceiver: Processing notification with handler for code $code")
                    handler.handleNotification(jsonData)
                    return@launch
                }

                Timber.d("ParseInstructionReceiver: No handler found for code $code, delegating to super")
                super.onPushReceive(context, intent)

            } catch (e: Exception) {
                Timber.e(e, "ParseInstructionReceiver: Error processing push notification")
                if(BuildConfig.DEBUG) {
                    Timber.e(e, "ParseInstructionReceiver: Throwing error in debug mode")
                    throw e
                } else {
                    CrashlyticsLog.recordNonFatalError(e, "Error on push receive")
                }
            }
        }
    }

    private fun createNotificationChannel(context: Context) {
        val name = context.applicationInfo.loadLabel(context.packageManager).toString()
        val importance  = NotificationManager.IMPORTANCE_HIGH
        val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
            this.description = description
        }
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        notificationManager.createNotificationChannel(channel)
    }
}