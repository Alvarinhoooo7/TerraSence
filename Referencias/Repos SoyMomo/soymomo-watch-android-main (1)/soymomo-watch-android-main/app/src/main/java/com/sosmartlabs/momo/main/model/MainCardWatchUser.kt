package com.sosmartlabs.momo.main.model

import com.sosmartlabs.momo.models.WatchUser

/**
 * [WatchUser] wrapper for adding extra data required in Main cards.
 * @param watchUser WatchUser wrapped.
 */
data class MainCardWatchUser(
    val watchUser: WatchUser,
) {

    /**
     * Checks if the contents of this card are the same as another card.
     * @param otherCard The other MainCardWatchUser to compare with.
     * @return True if contents are the same, false otherwise.
     */
    fun areContentsTheSame(otherCard: MainCardWatchUser): Boolean {

        fun <T> isEqual(oldItem: T, newItem: T, field: (T) -> Any?) =
            field(oldItem) == field(newItem)

        val oldWatchUser = this.watchUser
        val newWatchUser = otherCard.watchUser
        val oldWatch = oldWatchUser.watch
        val newWatch = newWatchUser.watch

        if (!oldWatchUser.active && !newWatchUser.active) return true
        if (oldWatch == null || newWatch == null) return oldWatch == newWatch

        return isEqual(oldWatchUser, newWatchUser) { it.active }
                && isEqual(oldWatchUser, newWatchUser) { it.watch?.name() }
                && isEqual(oldWatchUser, newWatchUser) { it.has("active") && it.active }
                && isEqual(oldWatchUser, newWatchUser) { it.watch?.image?.url }
                && isEqual(oldWatch, newWatch) { it.batteryPercentage }
                && isEqual(oldWatch, newWatch) { it.has("pushy") }
                && isEqual(oldWatch, newWatch) { it.image?.url }
                && isEqual(oldWatchUser, newWatchUser) { it.userPermission.call }
                && isEqual(oldWatchUser, newWatchUser) { it.userPermission.videocall }
                && isEqual(oldWatchUser, newWatchUser) { it.userPermission.messages }
                && isEqual(oldWatchUser, newWatchUser) { it.userPermission.location }
                && isEqual(oldWatch, newWatch) { it.has("batterySaveInUse") && it.getBoolean("batterySaveInUse") }
                && isEqual(this, otherCard) { it.watchUser.watch?.showBatteryWarning }
                && isEqual(this, otherCard) { it.watchUser.watch?.isConnected() }
                && !newWatch.profileModified
    }
}