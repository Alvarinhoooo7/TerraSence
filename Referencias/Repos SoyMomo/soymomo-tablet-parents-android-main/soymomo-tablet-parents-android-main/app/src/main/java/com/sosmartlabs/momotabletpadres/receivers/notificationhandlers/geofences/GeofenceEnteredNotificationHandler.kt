package com.sosmartlabs.momotabletpadres.receivers.notificationhandlers.geofences

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.SettingsConstants
import com.sosmartlabs.momotabletpadres.main.MainActivity
import com.sosmartlabs.momotabletpadres.receivers.notificationhandlers.NotificationHandler
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONObject
import javax.inject.Inject

class GeofenceEnteredNotificationHandler @Inject constructor(@ApplicationContext context: Context,
                                                       userRepository: UserRepository,
                                                       private val tabletRepository: TabletRepository
):
    NotificationHandler(context, userRepository) {
    override val notificationId: Int = 24
    override var notificationContentTitleId: Int = R.string.notification_geofence_entered_title
    override var notificationContextTextId: Int = R.string.notification_geofence_entered_text
    override val notificationErrorText: String = "Error on launching notification for entered geofence"

    override fun getNotificationContentParams(jsonData: JSONObject): Array<String> =
        arrayOf(
            jsonData.optString("tabletName", ""),
            jsonData.optString("placeName", "")
        )

    override fun getNotificationsArgsBundle(jsonData: JSONObject): Bundle {
        val tabletHid = jsonData.optString("tabletHid", "")
        val tablet = tabletRepository.getTabletListByUser(userRepository.getCurrentParseUser()!!)
            .first{ it.hid == tabletHid }
        return super.getNotificationsArgsBundle(jsonData).apply {
            putParcelable(SettingsConstants.TABLET_OBJECT_EXTRA, tablet)
        }
    }

    override fun getNotificationPendingIntent(args: Bundle): PendingIntent {
        val intent = Intent(context, MainActivity::class.java)
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }
}