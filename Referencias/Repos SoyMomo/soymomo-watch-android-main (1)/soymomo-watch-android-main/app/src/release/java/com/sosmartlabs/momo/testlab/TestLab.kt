package com.sosmartlabs.momo.testlab

import com.sosmartlabs.momo.addfirstwatch.model.WatchAvailabilityResult
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.sim.model.Sim
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.sim.model.SubscriptionsUserInfo

/**
 * RELEASE no-op twin of the debug-only Test Lab (see src/debug). Every hook is inert so the
 * production APK contains no test paths; R8 removes the dead branches at the call sites.
 */
object TestLab {

    const val isAvailable: Boolean = false

    fun mockWatchAvailability(deviceId: String): WatchAvailabilityResult? = null

    fun mockAddWatchResult(deviceId: String): Int? = null

    fun isTestSim(iccId: String?): Boolean = false

    fun mockSim(iccId: String): Sim? = null

    fun mockIsSimInUse(sim: Sim): Boolean? = null

    fun mockSubscriptionPlans(sim: Sim): List<SubscriptionPlan>? = null

    fun mockActivatedSubscription(
        watch: Wearer?,
        sim: Sim?,
        plan: SubscriptionPlan?,
        subscriber: SubscriptionsUserInfo?,
    ): Subscription? = null

    fun shouldSkipPayment(iccId: String?): Boolean = false

    fun toggleSkipPayment(): Boolean = false
}
