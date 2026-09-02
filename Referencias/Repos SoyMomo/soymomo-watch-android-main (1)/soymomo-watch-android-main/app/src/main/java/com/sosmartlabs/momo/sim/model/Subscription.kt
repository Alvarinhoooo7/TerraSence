package com.sosmartlabs.momo.sim.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.models.Wearer
import java.util.*
import java.util.concurrent.TimeUnit

@ParseClassName("Subscription")
class Subscription: ParseObject() {
    var iccId by ParseDelegate<String>(null)
    var imei by ParseDelegate<String>(null)
    var subscriber by ParseDelegate<SubscriptionsUserInfo>(null)
    var isActive by ParseDelegate<Boolean>(null)
    var plan by ParseDelegate<SubscriptionPlan>(null)
    var paymentProvider by ParseDelegate<PaymentProvider>(null)
    var watch by ParseDelegate<Wearer>(null)
    var startDate by ParseDelegate<Date>(null)
    var msisdn by ParseDelegate<String?>(null)
    var status by ParseDelegate<String>(null)
    var sim by ParseDelegate<Sim>(null)
    var stripeCredentials by ParseDelegate<StripeCredentials?>(null)
    var apioCredentials by ParseDelegate<ApioCredentials?>(null)
    var activatedAt by ParseDelegate<Date?>(null)
    var terminatedAt by ParseDelegate<Date?>(null)

    private fun isInActivationPeriod(): Boolean {
        if (stripeCredentials != null || apioCredentials != null) {
            return false
        }

        activatedAt?.let { activationDate ->
            val tenMinutesInMillis = TimeUnit.MINUTES.toMillis(10)
            val timeSinceActivation = Date().time - activationDate.time
            return timeSinceActivation <= tenMinutesInMillis
        }

        return false
    }

    fun getPaymentStatus(): PaymentStatus {
        if (isInActivationPeriod()) {
            return PaymentStatus.ACTIVATION_PERIOD
        }

        stripeCredentials?.let {
            return when (it.subscriptionStatus) {
                "incomplete", "incomplete_expired", "past_due", "unpaid" -> PaymentStatus.PENDING
                "trialing", "active" -> PaymentStatus.ACTIVE 
                "canceled" -> PaymentStatus.CANCELED
                else -> PaymentStatus.UNKNOWN
            }
        }

        apioCredentials?.let {
            return when (it.apioSubscriptionStatus) {
                "active", "paused" -> PaymentStatus.ACTIVE
                "failed", "failed attempt 1", "failed attempt 2", "failed attempt 3", "pending" -> PaymentStatus.PENDING
                "canceled" -> PaymentStatus.CANCELED
                else -> PaymentStatus.UNKNOWN
            }
        }

        return PaymentStatus.MISSING_INFORMATION
    }

    fun getSubscriptionStatus(): SubscriptionStatus {
        return when (this.status) {
            "ACTIVATED", "ACTIVATION_GIGS_COMPLETE", "ACTIVATION_ALAI_COMPLETE", "ACTIVATION_TEST_COMPLETE"  -> SubscriptionStatus.ACTIVE
            "ACTIVATION_PENDING", "PREACTIVATED", "PRE-ACTIVATED", "ACTIVATION_GIGS_NO_PHONE", "ACTIVATION_ALAI_ERROR_NO_PHONE" -> SubscriptionStatus.PREACTIVATED
            "CANCELED", "TERMINATED" -> SubscriptionStatus.TERMINATED
            "PAUSED" -> SubscriptionStatus.PAUSED
            "SUSPENDED" -> SubscriptionStatus.SUSPENDED
            else -> SubscriptionStatus.ACTIVE
        }
    }
}