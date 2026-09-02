package com.sosmartlabs.momo.sim.model

enum class SubscriptionStatus {
    ACTIVE,
    PREACTIVATED,
    PAUSED,

    /**
     * Pending payment with the service already cut; paying restores it.
     * Rendered as an actionable payment problem (Pay Now), never as terminated.
     */
    SUSPENDED,
    TERMINATED
}