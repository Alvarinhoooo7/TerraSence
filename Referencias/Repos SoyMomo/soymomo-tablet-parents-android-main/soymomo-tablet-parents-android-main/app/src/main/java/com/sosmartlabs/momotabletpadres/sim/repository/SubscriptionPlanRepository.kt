package com.sosmartlabs.momotabletpadres.sim.repository

import com.parse.coroutines.callCloudFunction
import com.sosmartlabs.momotabletpadres.sim.model.MnoProvider
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionPlan
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject

class SubscriptionPlanRepository @Inject constructor() {

    /**
     * Fetches subscription plans from the cloud function based on MNO provider and payment provider.
     *
     * @param mnoProvider The MNO provider for which to fetch subscription plans.
     * @param paymentProviderName The name of the payment provider.
     * @param isQA Whether to fetch QA environment plans.
     * @return A list of available subscription plans, or an empty list if an error occurs.
     */
    suspend fun getSubscriptionPlans(
        mnoProvider: MnoProvider,
        paymentProviderName: String,
        isQA: Boolean = false
    ): List<SubscriptionPlan> {
        val parameters = hashMapOf(
            "mnoProviderId" to mnoProvider.objectId,
            "paymentProviderName" to paymentProviderName,
            "isQA" to isQA
        )

        Timber.d(
            "SubscriptionPlanRepository: Fetching subscription plans with parameters: $parameters"
        )

        return try {
            val plans = callCloudFunction<List<SubscriptionPlan>>(
                "getSubscriptionPlans",
                parameters
            )
            Timber.d("SubscriptionPlanRepository: Retrieved ${plans.size} subscription plans")
            plans
        } catch (e: Exception) {
            Timber.e(
                e,
                "SubscriptionPlanRepository: Error fetching plans for MNO ${mnoProvider.objectId} and payment provider $paymentProviderName"
            )
            CrashlyticsLog.recordNonFatalError(
                e,
                "Failed to fetch subscription plans for MNO ${mnoProvider.objectId} and payment provider $paymentProviderName"
            )
            emptyList()
        }
    }

    /**
     * Generates a daily 4-digit PIN to access QA features.
     * The PIN is derived from a SHA-256 hash of the current UTC date (yyyy-MM-dd, UTC).
     * This ensures the PIN changes daily but remains consistent throughout the day.
     *
     * @return A 4-digit PIN as a String
     */
    fun calculateDailyQaPin(): String {
        // 1. Get current date in UTC, formatted as yyyy-MM-dd
        val utcDateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val currentDate = utcDateFormat.format(Date())
        Timber.d("SubscriptionPlanRepository: Using current UTC date as seed: $currentDate")

        // 2. Hash the date string with SHA-256
        val hashBytes = MessageDigest.getInstance("SHA-256")
            .digest(currentDate.toByteArray(Charsets.UTF_8))
        val hashString = hashBytes.joinToString("") { "%02x".format(it) }

        // 3. Extract the first 4 digits from the hash, pad with zeros if less than 4
        val pin = hashString.filter { it.isDigit() }.take(4).padEnd(4, '0')

        // 4. Log and return
        Timber.d("SubscriptionPlanRepository: Generated QA PIN: $pin")
        CrashlyticsLog.log("Daily QA PIN generated successfully")

        return pin
    }
}