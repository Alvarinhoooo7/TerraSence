package com.sosmartlabs.momotabletpadres.tablet.model

import java.util.Date

/**
 * UI-facing connection state for a tablet/phone, shown as the status pill on
 * the tablet info screen (TabletInitialMenuFragment).
 *
 * Mirrors the iOS parents app (ConnectionStatus.State): the primary source is
 * the `getTabletPresence` cloud function (Pushy presence); when that is
 * unavailable we fall back to a 10-minute staleness check on the tablet's
 * `lastTKQ` timestamp. See [com.sosmartlabs.momotabletpadres.tablet.TabletViewModel.loadTabletPresence].
 */
sealed class TabletPresenceState {

    /** Waiting for the first presence result. */
    object Loading : TabletPresenceState()

    /** Device is currently connected. */
    data class Online(val batteryPercentage: Int?) : TabletPresenceState()

    /** Device is offline; [date] is when it was last seen. */
    data class LastSeen(val date: Date, val batteryPercentage: Int?) : TabletPresenceState()

    /** Device is offline with no known last-active time. */
    object Disconnected : TabletPresenceState()

    /** Presence couldn't be determined (no token, no lastTKQ, error). */
    object Unknown : TabletPresenceState()

    /**
     * The PARENT's own device has no internet, so we can't reach the backend.
     * This says nothing about the child's device — never present it as the
     * tablet being offline.
     */
    object NoInternet : TabletPresenceState()
}
