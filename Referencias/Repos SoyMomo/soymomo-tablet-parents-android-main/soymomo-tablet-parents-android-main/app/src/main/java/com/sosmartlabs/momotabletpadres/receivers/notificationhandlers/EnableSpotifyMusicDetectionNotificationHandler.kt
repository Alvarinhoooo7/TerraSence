package com.sosmartlabs.momotabletpadres.receivers.notificationhandlers

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Parcelable
import androidx.core.app.TaskStackBuilder
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.SettingsConstants
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.TabletActivity
import com.sosmartlabs.momotabletpadres.tabletsettings.dug.music_detection.steps.EnableSpotifyMusicDetectorActivity
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONObject
import javax.inject.Inject

/**
 * Notification handler for app time requested
 * @param context Context for launching notification
 * @param userRepository Repository for users
 * @param tabletRepository Repository for tablets
 */
class EnableSpotifyMusicDetectionNotificationHandler @Inject constructor(@ApplicationContext context: Context,
                                                                         userRepository: UserRepository,
                                                                         private val tabletRepository: TabletRepository
):
    NotificationHandler(context, userRepository) {
    override val notificationId: Int = 18
    override var notificationContentTitleId: Int = R.string.notification_explicit_music_detection_config_title
    override var notificationContextTextId: Int = R.string.notification_explicit_music_detection_config_text
    override val notificationErrorText: String = "Error on launching notification for explicit music detection config"

    override fun getNotificationContentParams(jsonData: JSONObject): Array<String> =
        arrayOf()

    override fun getNotificationsArgsBundle(jsonData: JSONObject): Bundle {
        val tabletHid = jsonData.optString("tabletHid", "")
        val tablet = tabletRepository.getTabletListByUser(userRepository.getCurrentParseUser()!!)
            .first{ it.hid == tabletHid }
        return super.getNotificationsArgsBundle(jsonData).apply {
            putParcelable(SettingsConstants.TABLET_OBJECT_EXTRA, tablet)
        }
    }

    override fun getNotificationPendingIntent(args: Bundle): PendingIntent {
        val parentIntent = Intent(context, TabletActivity::class.java).apply {
            putExtra(SettingsConstants.TABLET_OBJECT_EXTRA,
                args.getParcelable(SettingsConstants.TABLET_OBJECT_EXTRA) as Parcelable?)
        }
        val resultIntent = Intent(context, EnableSpotifyMusicDetectorActivity::class.java)
        return TaskStackBuilder.create(context).run {
            addNextIntentWithParentStack(parentIntent)
            addNextIntent(resultIntent)
            getPendingIntent(0,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )!!
        }
    }
}