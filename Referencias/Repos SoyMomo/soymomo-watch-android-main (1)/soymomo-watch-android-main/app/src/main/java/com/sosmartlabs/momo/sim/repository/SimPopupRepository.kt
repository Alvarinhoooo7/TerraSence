package com.sosmartlabs.momo.sim.repository

import android.content.Context
import com.parse.ParseObject
import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.coroutines.suspendSave
import com.parse.ktx.findAll
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.sim.model.SimDiscountCampaign
import com.sosmartlabs.momo.sim.model.SimOrder
import com.sosmartlabs.momo.sim.model.SimPopupTracking
import com.sosmartlabs.momo.utils.CountryProvider
import kotlinx.coroutines.delay
import timber.log.Timber
import java.util.Date
import kotlin.math.pow

class SimPopupRepository(
    private val appContext: Context
) {

    private val maxRetries: Int = 3
    private val retryDelaySeconds: Double = 1.0

    private suspend fun <T : ParseObject> performSaveWithRetry(
        obj: T,
        operationName: String,
        attempt: Int = 0
    ): T {
        return try {
            obj.suspendSave()
            Timber.d("SimPopupRepository: Saved $operationName")
            obj
        } catch (e: Exception) {
            val attemptNumber = attempt + 1
            Timber.e(e, "SimPopupRepository: Error saving $operationName (attempt $attemptNumber/$maxRetries)")
            CrashlyticsLog.recordNonFatalError(
                e,
                "SimPopupRepository: Error saving $operationName attempt=$attemptNumber"
            )

            if (attempt < maxRetries - 1) {
                val delaySeconds = retryDelaySeconds * 2.0.pow(attempt.toDouble())
                Timber.w("SimPopupRepository: Retrying $operationName in ${delaySeconds}s (attempt ${attemptNumber + 1}/$maxRetries)")
                delay((delaySeconds * 1000).toLong())
                performSaveWithRetry(obj, operationName, attempt + 1)
            } else {
                Timber.e("SimPopupRepository: Max retries reached for $operationName")
                throw e
            }
        }
    }

    suspend fun saveSimPopupTracking(tracking: SimPopupTracking): SimPopupTracking {
        return performSaveWithRetry(
            obj = tracking,
            operationName = "SimPopupTracking",
        )
    }

    suspend fun updatePopupShownAt(tracking: SimPopupTracking): SimPopupTracking {
        tracking.popupShownAt = Date()
        return saveSimPopupTracking(tracking)
    }

    suspend fun updatePopupClosedAt(tracking: SimPopupTracking): SimPopupTracking {
        tracking.popupClosedAt = Date()
        return saveSimPopupTracking(tracking)
    }

    suspend fun updateCtaClickedAt(tracking: SimPopupTracking): SimPopupTracking {
        tracking.ctaClickedAt = Date()
        return saveSimPopupTracking(tracking)
    }

    suspend fun updateFormCompletedAt(tracking: SimPopupTracking): SimPopupTracking {
        tracking.formCompletedAt = Date()
        return saveSimPopupTracking(tracking)
    }

    suspend fun saveSimOrder(order: SimOrder): SimOrder {
        return performSaveWithRetry(
            obj = order,
            operationName = "SimOrder",
        )
    }

    /**
     * All tracking rows for the user scoped to a campaign — the basis for the
     * escalating backoff. Scoping by campaign means a new campaign starts fresh.
     */
    suspend fun getTrackingHistory(user: ParseUser, campaign: SimDiscountCampaign): List<SimPopupTracking> {
        Timber.d("SimPopupRepository: Fetching popup tracking history")

        return try {
            ParseQuery.getQuery(SimPopupTracking::class.java)
                .whereEqualTo("user", user)
                .whereEqualTo("campaign", campaign)
                .addDescendingOrder("createdAt")
                .findAll()
        } catch (e: Exception) {
            Timber.e(e, "SimPopupRepository: Error fetching popup tracking history")
            CrashlyticsLog.recordNonFatalError(e, "SimPopupRepository: getTrackingHistory failed")
            emptyList()
        }
    }

    suspend fun getActiveCampaignForUserRegion(): SimDiscountCampaign? {
        val now = Date()
        val userRegion = CountryProvider.getCountry(appContext)

        Timber.d("SimPopupRepository: Fetching active campaign for region=$userRegion")

        return try {
            val campaigns = ParseQuery.getQuery(SimDiscountCampaign::class.java)
                .whereLessThanOrEqualTo("startDate", now)
                .whereGreaterThanOrEqualTo("endDate", now)
                .include("mnoProvider")
                .include("paymentProvider")
                .addDescendingOrder("createdAt")
                .findAll()

            val matching = campaigns.firstOrNull { campaign ->
                val campaignCountry = campaign.mnoProvider?.country
                campaignCountry != null && campaignCountry.equals(userRegion, ignoreCase = true)
            }

            if (matching != null) {
                Timber.d("SimPopupRepository: Found active campaign for region=$userRegion")
            } else {
                Timber.d("SimPopupRepository: No active campaigns match region=$userRegion (totalActive=${campaigns.size})")
            }

            matching
        } catch (e: Exception) {
            Timber.e(e, "SimPopupRepository: Error fetching active campaigns for region=$userRegion")
            CrashlyticsLog.recordNonFatalError(e, "SimPopupRepository: getActiveCampaignForUserRegion failed region=$userRegion")
            null
        }
    }

    fun getUserCountry(): String {
        return CountryProvider.getCountry(appContext)
    }

    /**
     * Mirrors iOS `resolveSimDiscountForUser`.
     *
     * Returns null if:
     * - user has any redeemed order, OR
     * - no unredeemed order exists, OR
     * - the campaign discount percentage is invalid.
     */
    suspend fun resolveSimDiscountForUser(user: ParseUser): Pair<SimOrder, SimDiscountCampaign>? {
        Timber.d("SimPopupRepository: Resolving SIM discount")

        return try {
            val orders = ParseQuery.getQuery(SimOrder::class.java)
                .whereEqualTo("user", user)
                .include("campaign")
                .include("campaign.mnoProvider")
                .include("campaign.paymentProvider")
                .addDescendingOrder("createdAt")
                .findAll()

            val hasRedeemed = orders.any { it.isRedeemed == true }
            if (hasRedeemed) {
                Timber.d("SimPopupRepository: User not eligible for discount (has redeemed SimOrder)")
                return null
            }

            val unredeemed = orders.firstOrNull { it.isRedeemed == false } ?: run {
                Timber.d("SimPopupRepository: No unredeemed SimOrder found")
                return null
            }

            val campaign = unredeemed.campaign
            val discount = campaign.discountPercentage

            if (discount.isNaN() || discount < 0f || discount > 100f) {
                Timber.w("SimPopupRepository: Invalid campaign discount=$discount")
                CrashlyticsLog.log("SimPopupRepository: Invalid campaign discount=$discount")
                return null
            }

            Timber.d("SimPopupRepository: User eligible for discount=${discount.toInt()}%")
            Pair(unredeemed, campaign)
        } catch (e: Exception) {
            Timber.e(e, "SimPopupRepository: Error resolving SIM discount")
            CrashlyticsLog.recordNonFatalError(e, "SimPopupRepository: resolveSimDiscountForUser failed")
            null
        }
    }
}
