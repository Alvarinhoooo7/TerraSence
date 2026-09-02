package com.sosmartlabs.momotabletpadres.receivers.notificationhandlers.dug

import android.content.Context
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.receivers.notificationhandlers.TabletActivityNotificationHandler
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository

/**
 * Base class for dug-related Notification handlers
 * @param context Context for launching notification
 * @param userRepository Repository for users
 * @param tabletRepository Repository for tablets
 */
abstract class DugNotificationHandler(context: Context, userRepository: UserRepository,
                             tabletRepository: TabletRepository
):
    TabletActivityNotificationHandler(context, userRepository, tabletRepository) {

    override val notificationSmallIconId = R.drawable.ic_action_smart_detection
    override val notificationLargeIconId: Int = R.drawable.ic_action_smart_detection
}