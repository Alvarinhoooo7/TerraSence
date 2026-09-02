package com.sosmartlabs.momotabletpadres.core.common.utils

import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.NotificationType

object SafeWalkingHelper {

    /**
     * Gets the notification id for the given [NotificationType]
     * @param notificationType [NotificationType] to map into its notification id
     * @return NotificationType id
     */
    fun fromNotificationType(notificationType: NotificationType): Int {
        return when (notificationType) {
            NotificationType.BANNER -> 1
            NotificationType.WINDOW -> 2
            NotificationType.FULL_SCREEN -> 3
            else -> 0
        }
    }
}