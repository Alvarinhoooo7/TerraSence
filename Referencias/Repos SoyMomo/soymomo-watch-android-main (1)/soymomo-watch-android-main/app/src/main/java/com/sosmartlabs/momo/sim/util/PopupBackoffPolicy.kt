package com.sosmartlabs.momo.sim.util

import java.util.Calendar
import java.util.Date

/**
 * Shared escalating-backoff policy for promotional popups (Request SIM, Upgrade Plan).
 *
 * Decides whether a popup may show again based on how many times the user has
 * already interacted with (dismissed/engaged) the *same* offer:
 *
 *   - 1st interaction -> wait 7 days before showing again
 *   - 2nd interaction -> wait 21 days before showing again
 *   - 3rd interaction -> retire (never show again for this offer)
 *
 * A *new* offer resets [interactionCount] to 0. That reset is handled by the
 * caller, which scopes its tracking query to the current offer (campaign /
 * upgrade plan) — a new offer simply has no matching rows, so the count is 0.
 */
object PopupBackoffPolicy {

    /**
     * Days to wait after the Nth interaction before the popup may show again.
     * Index 0 applies after the 1st interaction, index 1 after the 2nd.
     * Once [interactionCount] exceeds this list's size, the popup is retired.
     */
    val snoozeDays: List<Int> = listOf(7, 21)

    /**
     * @param interactionCount number of prior interactions with this offer
     *   (dismissals for Request SIM; dismissals + CTA taps for Upgrade).
     * @param lastInteractionAt timestamp of the most recent interaction, if any.
     * @param now injected for testing; defaults to the current date.
     * @return true if the popup may be shown now.
     */
    fun shouldShow(
        interactionCount: Int,
        lastInteractionAt: Date?,
        now: Date = Date(),
    ): Boolean {
        if (interactionCount <= 0) return true                  // never interacted -> show
        if (interactionCount > snoozeDays.size) return false    // retired
        val last = lastInteractionAt ?: return true
        val wait = snoozeDays[interactionCount - 1]
        val nextEligible = Calendar.getInstance().apply {
            time = last
            add(Calendar.DAY_OF_YEAR, wait)
        }.time
        return !now.before(nextEligible)
    }
}
