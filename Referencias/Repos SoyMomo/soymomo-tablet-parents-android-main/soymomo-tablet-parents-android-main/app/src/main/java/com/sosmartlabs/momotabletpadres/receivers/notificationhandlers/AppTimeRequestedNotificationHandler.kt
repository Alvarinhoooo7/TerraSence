package com.sosmartlabs.momotabletpadres.receivers.notificationhandlers

import android.content.Context
import android.os.Bundle
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.utils.Constants
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONObject
import javax.inject.Inject

/**
 * Notification handler for app time requested
 * @param context Context for launching notification
 * @param userRepository Repository for users
 * @param tabletRepository Repository for tablets
 */
class AppTimeRequestedNotificationHandler @Inject constructor(@ApplicationContext context: Context,
                                                              userRepository: UserRepository,
                                                              tabletRepository: TabletRepository
):
    TabletActivityNotificationHandler(context, userRepository, tabletRepository) {
    override val notificationId: Int = Constants.notificationRequestTimeApp
    override val notificationDestinationId: Int = R.id.requestTimeAppFragment
    override var notificationContentTitleId: Int = R.string.notification_time_requested_app_title
    override var notificationContextTextId: Int = R.string.notification_time_requested_app_text
    override val notificationErrorText: String = "Error on creating Notification for app TimeRequested Received Instruction"

    override fun getNotificationContentParams(jsonData: JSONObject): Array<String> =
        arrayOf(
            jsonData.optString("tabletName", ""),
            jsonData.optString("appName", "")
        )

    override fun getNotificationsArgsBundle(jsonData: JSONObject): Bundle {
        return super.getNotificationsArgsBundle(jsonData).apply {
            putString("objectId", jsonData.optString("requestId", ""))
            putString("appName", jsonData.optString("appName", ""))
            putString("packageName", jsonData.optString("packageName", ""))
        }
    }
}