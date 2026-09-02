package com.sosmartlabs.momo.sim.repository

import com.parse.ParseObject
import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.coroutines.suspendSave
import com.parse.ktx.findAll
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.sim.model.UpgradePopupTracking
import kotlinx.coroutines.delay
import timber.log.Timber
import java.util.Date
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.pow

@Singleton
class UpgradePopupRepository @Inject constructor() {

    private val maxRetries: Int = 3
    private val retryDelaySeconds: Double = 1.0

    private suspend fun <T : ParseObject> performSaveWithRetry(
        obj: T,
        operationName: String,
        attempt: Int = 0
    ): T {
        return try {
            obj.suspendSave()
            Timber.d("UpgradePopupRepository: Saved $operationName")
            obj
        } catch (e: Exception) {
            val attemptNumber = attempt + 1
            Timber.e(e, "UpgradePopupRepository: Error saving $operationName (attempt $attemptNumber/$maxRetries)")
            CrashlyticsLog.recordNonFatalError(
                e,
                "UpgradePopupRepository: Error saving $operationName attempt=$attemptNumber"
            )

            if (attempt < maxRetries - 1) {
                val delaySeconds = retryDelaySeconds * 2.0.pow(attempt.toDouble())
                delay((delaySeconds * 1000).toLong())
                performSaveWithRetry(obj, operationName, attempt + 1)
            } else {
                Timber.e("UpgradePopupRepository: Max retries reached for $operationName")
                throw e
            }
        }
    }

    /**
     * All upgrade-popup tracking rows for the user (across every target plan) — the
     * basis for the escalating backoff. Scoped to the user, never to a specific plan,
     * so a plan change does not reset the backoff.
     */
    suspend fun getTrackingHistory(user: ParseUser): List<UpgradePopupTracking> {
        Timber.d("UpgradePopupRepository: Fetching tracking history")

        return try {
            ParseQuery.getQuery(UpgradePopupTracking::class.java)
                .whereEqualTo("user", user)
                .addDescendingOrder("createdAt")
                .findAll()
        } catch (e: Exception) {
            Timber.e(e, "UpgradePopupRepository: Error fetching tracking history")
            CrashlyticsLog.recordNonFatalError(e, "UpgradePopupRepository: getTrackingHistory failed")
            emptyList()
        }
    }

    suspend fun createTracking(
        user: ParseUser,
        subscription: Subscription,
        plan: SubscriptionPlan
    ): UpgradePopupTracking {
        val tracking = UpgradePopupTracking().apply {
            this.user = user
            this.subscription = subscription
            this.plan = plan
            this.popupShownAt = Date()
        }
        return performSaveWithRetry(tracking, "UpgradePopupTracking.shown")
    }

    suspend fun updatePopupClosedAt(tracking: UpgradePopupTracking): UpgradePopupTracking {
        tracking.popupClosedAt = Date()
        return performSaveWithRetry(tracking, "UpgradePopupTracking.closed")
    }

    suspend fun updateCtaClickedAt(tracking: UpgradePopupTracking): UpgradePopupTracking {
        tracking.ctaClickedAt = Date()
        return performSaveWithRetry(tracking, "UpgradePopupTracking.cta")
    }
}
