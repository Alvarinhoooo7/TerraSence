package com.sosmartlabs.momotabletpadres.receivers.notificationhandlers

import android.content.Context
import android.os.Bundle
import androidx.navigation.NavDeepLinkBuilder
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.SettingsConstants
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.TabletActivity
import org.json.JSONObject
import timber.log.Timber

/**
 * Base class for notifications that redirects to a fragment on [TabletActivity]
 * @param context Context for launching notifications
 * @param userRepository Repository for users
 * @param tabletRepository Repository for tablets
 */
abstract class TabletActivityNotificationHandler(context: Context,
                                                 userRepository: UserRepository,
                                                 private val tabletRepository: TabletRepository
)
    : NotificationHandler(context, userRepository) {

    /**
     * Id for the destination of the notification created
     */
    protected abstract val notificationDestinationId: Int

    /**
     * Creates a [Bundle] for been sent with a notification.
     * Note: TabletActivityNotificationHandler notifications include the "tabletHid" and
     * "TABLET_OBJECT_EXTRA" fields, so it shouldn't be added here: you should override this
     * function and call super() before adding more arguments.
     * @param jsonData Data for this notification
     * @return [Bundle] for been used with this notification
     */
    override fun getNotificationsArgsBundle(jsonData: JSONObject): Bundle {
        Timber.d("TabletActivityNotificationHandler: Creating args bundle")
        val tabletHid = jsonData.optString("tabletHid", "")
        Timber.d("TabletActivityNotificationHandler: Tablet HID: $tabletHid")
        val tablet = tabletRepository.getTabletListByUser(userRepository.getCurrentParseUser()!!)
            .first{ it.hid == tabletHid }

        Timber.d("TabletActivityNotificationHandler: Tablet found: ${tablet.hid}")

        return Bundle().apply {
            putString("tabletHid", tabletHid)
            putString("tabletId", tablet.objectId)
            putParcelable(SettingsConstants.TABLET_OBJECT_EXTRA, tablet)
        }
    }

    override fun getNotificationPendingIntent(args: Bundle) =
        NavDeepLinkBuilder(context)
            .setComponentName(TabletActivity::class.java)
            .setGraph(R.navigation.new_nav_graph)
            .setDestination(notificationDestinationId)
            .setArguments(args)
            .createPendingIntent()
}