package com.sosmartlabs.momo.nps.subscription.data

import com.parse.ParseCloud
import com.sosmartlabs.momo.nps.subscription.model.SubscriptionNpsScheduler
import timber.log.Timber
import javax.inject.Inject

class ParseSubscriptionNpsDataSource @Inject constructor() : SubscriptionNpsDataSource {

    override suspend fun findNpsScheduler(userId: String): SubscriptionNpsScheduler? {
        Timber.d("ParseSubscriptionNpsDataSource: findNpsScheduler for userId=$userId")

        val params = mapOf("userId" to userId)
        val result = ParseCloud.callFunction<Any?>(FIND_SCHEDULER, params) as? Map<*, *>
            ?: return null

        val schedulerId = result["schedulerId"] as? String ?: return null
        val subscriptionId = result["subscriptionId"] as? String

        return SubscriptionNpsScheduler(
            schedulerId = schedulerId,
            subscriptionId = subscriptionId,
        )
    }

    override suspend fun submitFeedback(
        schedulerId: String,
        score: Int,
        cancellationReasons: List<String>,
        otherReason: String?,
        comment: String?,
        country: String,
        language: String,
    ): Boolean {
        Timber.d(
            "ParseSubscriptionNpsDataSource: submitFeedback schedulerId=$schedulerId score=$score reasons=$cancellationReasons",
        )

        val params = hashMapOf<String, Any>(
            "schedulerId" to schedulerId,
            "score" to score,
            "cancellationReasons" to cancellationReasons,
            "country" to country,
            "language" to language,
            "channel" to "app",
            "platform" to "Android",
        )
        if (otherReason != null) params["otherReason"] = otherReason
        if (comment != null) params["comment"] = comment

        ParseCloud.callFunction<Any>(CREATE_FEEDBACK, params)
        return true
    }

    override suspend fun rejectFeedback(schedulerId: String): Boolean {
        Timber.d("ParseSubscriptionNpsDataSource: rejectFeedback schedulerId=$schedulerId")

        val params = mapOf("schedulerId" to schedulerId)
        ParseCloud.callFunction<Any>(REJECT_FEEDBACK, params)
        return true
    }

    companion object {
        private const val FIND_SCHEDULER = "findSubscriptionNpsScheduler"
        private const val CREATE_FEEDBACK = "createSubscriptionNpsFeedback"
        private const val REJECT_FEEDBACK = "rejectedSubscriptionNpsFeedback"
    }
}
