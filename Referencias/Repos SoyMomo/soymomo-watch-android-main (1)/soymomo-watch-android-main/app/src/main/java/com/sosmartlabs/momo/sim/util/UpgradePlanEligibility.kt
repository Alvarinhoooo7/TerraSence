package com.sosmartlabs.momo.sim.util

import com.sosmartlabs.momo.sim.model.BillingPeriod
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionPlan

object UpgradePlanEligibility {

    // Mirrors cloud STATUS_CODES.activated — see soymomo-watch-cloud/app/cloud/utils/status-codes.js
    private const val STATUS_ACTIVATED = "ACTIVATED"
    private const val PAYMENT_PROVIDER_APIO = "Apio"

    fun isSubscriptionEligibleForUpgrade(subscription: Subscription): Boolean {
        return subscription.status == STATUS_ACTIVATED &&
            subscription.paymentProvider.name == PAYMENT_PROVIDER_APIO &&
            subscription.plan.billingPeriodType == BillingPeriod.MONTHLY.key &&
            subscription.plan.isQA != true
    }

    /**
     * Note: `isQA` is intentionally NOT checked here — the QA gate applies to the user's
     * own subscription only.
     */
    fun isUpgradeCandidate(plan: SubscriptionPlan, subscription: Subscription): Boolean {
        val currentPlan = subscription.plan
        val subscriptionMnoProvider = subscription.sim.mnoProvider
        val subscriptionPaymentProvider = subscription.paymentProvider

        return plan.isActive &&
            plan.objectId != currentPlan.objectId &&
            plan.price > currentPlan.price &&
            plan.billingPeriodType == BillingPeriod.MONTHLY.key &&
            plan.mnoProvider.objectId == subscriptionMnoProvider.objectId &&
            plan.paymentProvider.objectId == subscriptionPaymentProvider.objectId
    }
}
