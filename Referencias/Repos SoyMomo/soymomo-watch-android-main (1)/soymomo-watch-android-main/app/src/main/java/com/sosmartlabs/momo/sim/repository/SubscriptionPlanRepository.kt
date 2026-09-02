package com.sosmartlabs.momo.sim.repository

import com.parse.coroutines.callCloudFunction
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.sim.model.MnoProvider
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
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

        Timber.d("SubscriptionPlanRepository: Fetching subscription plans for paymentProvider=$paymentProviderName isQA=$isQA")

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
                "SubscriptionPlanRepository: Error fetching plans for payment provider $paymentProviderName"
            )
            CrashlyticsLog.recordNonFatalError(
                e,
                "Failed to fetch subscription plans for payment provider $paymentProviderName"
            )
            emptyList()
        }
    }

    suspend fun changeSubscriptionPlan(
        iccId: String,
        targetPlanId: String
    ): String {
        val parameters = hashMapOf(
            "iccId" to iccId,
            "targetPlanId" to targetPlanId
        )
        Timber.d("SubscriptionPlanRepository: changeSubscriptionPlan params=$parameters")

        val result = callCloudFunction<HashMap<String, Any>>(
            "changeApioSubscriptionPlan",
            parameters
        )
        val status = (result["status"] as? Number)?.toInt() ?: -1
        val message = result["message"] as? String
        if (status != 200) {
            val errorText = message ?: "Unknown error (status $status)"
            Timber.e("SubscriptionPlanRepository: changeSubscriptionPlan failed status=$status msg=$errorText")
            CrashlyticsLog.recordNonFatalError(
                IllegalStateException(errorText),
                "changeApioSubscriptionPlan returned status $status"
            )
            throw IllegalStateException(errorText)
        }
        Timber.d("SubscriptionPlanRepository: changeSubscriptionPlan succeeded msg=$message")
        return message ?: ""
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
        Timber.d("SubscriptionPlanRepository: Generated QA PIN")
        CrashlyticsLog.log("Daily QA PIN generated successfully")

        return pin
    }
}
