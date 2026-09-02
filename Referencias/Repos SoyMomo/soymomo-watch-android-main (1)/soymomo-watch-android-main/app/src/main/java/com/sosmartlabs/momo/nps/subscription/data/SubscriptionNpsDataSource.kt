package com.sosmartlabs.momo.nps.subscription.data

import com.sosmartlabs.momo.nps.subscription.model.SubscriptionNpsScheduler

interface SubscriptionNpsDataSource {

    suspend fun findNpsScheduler(userId: String): SubscriptionNpsScheduler?

    suspend fun submitFeedback(
        schedulerId: String,
        score: Int,
        cancellationReasons: List<String>,
        otherReason: String?,
        comment: String?,
        country: String,
        language: String,
    ): Boolean

    suspend fun rejectFeedback(schedulerId: String): Boolean
}
