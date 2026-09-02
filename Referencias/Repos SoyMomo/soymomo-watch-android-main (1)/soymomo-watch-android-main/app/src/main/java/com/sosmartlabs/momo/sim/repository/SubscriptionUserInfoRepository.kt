package com.sosmartlabs.momo.sim.repository

import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.coroutines.suspendSave
import com.sosmartlabs.momo.sim.model.SubscriptionsUserInfo
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject

class SubscriptionUserInfoRepository @Inject constructor() {

    /**
     * Retrieves the existing subscription user info for a given user and country.
     *
     * @param user The [ParseUser] whose subscription info is to be retrieved.
     * @param country The two-letter country code (default is "CL").
     * @return The [SubscriptionsUserInfo] if found, or null otherwise.
     */
    suspend fun getSubscriptionUserInfo(
        user: ParseUser,
        country: String = "CL"
    ): SubscriptionsUserInfo? {
        Timber.d("SubscriptionUserInfoRepository: getSubscriptionUserInfo() - Searching in country $country")
        CrashlyticsLog.log("Getting subscription info in $country")

        return try {
            val query = ParseQuery.getQuery<SubscriptionsUserInfo?>("SubscriptionsUserInfo")
                .whereEqualTo("user", user)
                .whereEqualTo("country", country)
                .include("mnoProvider")

            val result = query.first

            if (result != null) {
                Timber.d("SubscriptionUserInfoRepository: getSubscriptionUserInfo() - Found subscription info")
                CrashlyticsLog.log("Found subscription info")
                result
            } else {
                Timber.d("SubscriptionUserInfoRepository: getSubscriptionUserInfo() - No subscription info found")
                CrashlyticsLog.log("No subscription info found")
                null
            }
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionUserInfoRepository: getSubscriptionUserInfo() - Failed to fetch subscription info")
            CrashlyticsLog.recordNonFatalError(e, "Failed to fetch subscription info")
            null
        }
    }

    /**
     * Creates a new [SubscriptionsUserInfo] record or returns an existing one for the user.
     *
     * @param params Map of parameters for creating the subscription user info.
     * @param country Two-letter country code, defaults to "CL".
     * @return Created or existing [SubscriptionsUserInfo].
     * @throws IllegalArgumentException if required params are missing or invalid.
     */
    suspend fun createSubscriptionUserInfo(
        params: MutableMap<String, Any>,
        country: String = "CL"
    ): SubscriptionsUserInfo {
        Timber.d("SubscriptionUserInfoRepository: createSubscriptionUserInfo() - Starting with ${params.size} fields")
        CrashlyticsLog.log("Creating subscription user info")

        // 1. Reuse the record for this user and country; the form can edit what it holds
        val currentUser = ParseUser.getCurrentUser()
        val existingInfo = getSubscriptionUserInfo(currentUser, country)

        // 2. Helper functions for param validation
        fun getRequiredString(key: String): String {
            val value = (params[key] as? String)?.takeIf { it.isNotBlank() }
            if (value == null) {
                Timber.e("SubscriptionUserInfoRepository: createSubscriptionUserInfo() - Required parameter validation failed")
                CrashlyticsLog.log("Required parameter validation failed")
                throw IllegalArgumentException("Missing or invalid required parameter: $key")
            }
            return value
        }

        fun getOptionalString(key: String): String? =
            (params[key] as? String)?.takeIf { it.isNotBlank() }

        // 3. Validate and assign required fields first, then optional fields in logical order
        val email = getRequiredString("email").also {
            require(android.util.Patterns.EMAIL_ADDRESS.matcher(it).matches()) {
                Timber.e("SubscriptionUserInfoRepository: createSubscriptionUserInfo() - Invalid email format")
                CrashlyticsLog.log("Invalid email format provided")
                "Invalid email format"
            }
        }
        val name = getRequiredString("name")
        val lastname = getRequiredString("lastname")
        val phone = getRequiredString("phone")

        // Optional: only the Gigs activation payload ever read it.
        val birthday = getOptionalString("birthday")
        val personalId = getOptionalString("personalId")
        val state = getOptionalString("state")
        val city = getOptionalString("city")
        val address = getOptionalString("address")
        val optionalAddress = getOptionalString("optionalAddress")
        val postalCode = getOptionalString("postalCode")
        val countryValue = getOptionalString("country") ?: country

        // 4. Create, or update in place, then save. Blank params never clear a stored value.
        return (existingInfo ?: SubscriptionsUserInfo()).apply {
            Timber.d("SubscriptionUserInfoRepository: createSubscriptionUserInfo() - ${if (existingInfo == null) "Creating new record" else "Updating existing record"}")
            this.user = currentUser
            this.email = email
            this.name = name
            this.lastname = lastname
            this.phone = phone
            this.country = countryValue
            birthday?.let { this.birthday = it }
            personalId?.let { this.personalId = it }
            state?.let { this.state = it }
            city?.let { this.city = it }
            address?.let { this.address = it }
            optionalAddress?.let { this.optionalAddress = it }
            postalCode?.let { this.postalCode = it }

            suspendSave().also {
                Timber.d("SubscriptionUserInfoRepository: createSubscriptionUserInfo() - Saved record")
                CrashlyticsLog.log("Saved subscription info")
            }
        }
    }
}
