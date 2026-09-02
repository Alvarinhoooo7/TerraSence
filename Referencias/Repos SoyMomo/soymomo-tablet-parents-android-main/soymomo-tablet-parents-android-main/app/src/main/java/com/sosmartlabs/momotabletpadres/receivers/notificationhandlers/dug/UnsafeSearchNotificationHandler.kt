package com.sosmartlabs.momotabletpadres.receivers.notificationhandlers.dug

import android.content.Context
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.utils.Constants
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONObject
import javax.inject.Inject

/**
 * Notification handler for unsafe searches
 * @param context Context for launching notification
 * @param userRepository Repository for users
 * @param tabletRepository Repository for tablets
 */
class UnsafeSearchNotificationHandler @Inject constructor(@ApplicationContext context: Context,
                                                         userRepository: UserRepository,
                                                         tabletRepository: TabletRepository
):
    DugNotificationHandler(context, userRepository, tabletRepository) {
    override val notificationId: Int = Constants.notificationUnsafeSearchDetection
    override val notificationDestinationId: Int = R.id.tabletFragmentDugUnified
    override var notificationContentTitleId: Int = R.string.notification_unsafe_search_title
    override var notificationContextTextId: Int = R.string.notification_unsafe_search_text
    override val notificationErrorText: String = "Error on creating notification for unsafe search received instruction"

    override fun getNotificationContentParams(jsonData: JSONObject): Array<String> =
        arrayOf(jsonData.optString("tabletName", ""))
}