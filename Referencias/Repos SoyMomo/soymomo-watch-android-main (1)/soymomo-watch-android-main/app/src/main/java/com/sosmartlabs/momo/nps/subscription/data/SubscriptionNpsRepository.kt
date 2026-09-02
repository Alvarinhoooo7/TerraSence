package com.sosmartlabs.momo.nps.subscription.data

import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.nps.subscription.model.SubscriptionNpsScheduler
import timber.log.Timber
import javax.inject.Inject

class SubscriptionNpsRepository @Inject constructor(
    private val dataSource: SubscriptionNpsDataSource,
) {

    suspend fun findNpsScheduler(userId: String): SubscriptionNpsScheduler? {
        return try {
            dataSource.findNpsScheduler(userId)
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionNpsRepository: findNpsScheduler failed for userId=$userId")
            CrashlyticsLog.recordNonFatalError(e, "SubscriptionNpsRepository: findNpsScheduler failed")
            null
        }
    }

    suspend fun submitFeedback(
        schedulerId: String,
        score: Int,
        cancellationReasons: List<String>,
        otherReason: String?,
        comment: String?,
        country: String,
        language: String,
    ): Boolean {
        return try {
            dataSource.submitFeedback(schedulerId, score, cancellationReasons, otherReason, comment, country, language)
            Timber.d("SubscriptionNpsRepository: submitFeedback success schedulerId=$schedulerId score=$score reasons=$cancellationReasons")
            true
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionNpsRepository: submitFeedback failed schedulerId=$schedulerId")
            CrashlyticsLog.recordNonFatalError(e, "SubscriptionNpsRepository: submitFeedback failed")
            false
        }
    }

    suspend fun rejectFeedback(schedulerId: String) {
        try {
            dataSource.rejectFeedback(schedulerId)
            Timber.d("SubscriptionNpsRepository: rejectFeedback success schedulerId=$schedulerId")
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionNpsRepository: rejectFeedback failed schedulerId=$schedulerId")
            CrashlyticsLog.recordNonFatalError(e, "SubscriptionNpsRepository: rejectFeedback failed")
        }
    }
}
