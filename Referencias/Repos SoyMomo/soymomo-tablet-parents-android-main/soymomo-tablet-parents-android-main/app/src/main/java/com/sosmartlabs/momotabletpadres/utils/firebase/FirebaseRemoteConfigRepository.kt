package com.sosmartlabs.momotabletpadres.utils.firebase

import com.google.firebase.Firebase
import com.google.firebase.remoteconfig.FirebaseRemoteConfig
import com.google.firebase.remoteconfig.FirebaseRemoteConfigSettings
import com.google.firebase.remoteconfig.remoteConfig
import timber.log.Timber

object FirebaseRemoteConfigRepository {

    private const val FEEDBACK_MINIMUM_RUN_COUNT = "FEEDBACK_MINIMUM_RUN_COUNT"
    private const val FEEDBACK_MINIMUM_USER_ACTIONS = "FEEDBACK_MINIMUM_USER_ACTIONS"
    private const val SIM_CHILE_SKIP_PAYMENT = "SIM_CHILE_SKIP_PAYMENT"
    private const val SIM_GLOBAL_SKIP_PAYMENT = "SIM_WORLD_SKIP_PAYMENT"
    private const val CLIENT_SKIP_SETUP_GLOBAL_ACL = "CLIENT_SKIP_SETUP_GLOBAL_ACL"
    private const val SIM_DISCOUNT_LABEL = "SIM_DISCOUNT_LABEL"
    private const val THRESHOLD_MINUTES_LAST_TKQ = "THRESHOLD_MINUTES_LAST_TKQ"
    private const val SIM_CL_DEFAULT_PAYMENT_PROVIDER = "SIM_CL_DEFAULT_PAYMENT_PROVIDER"
    private const val DISABLE_IPV4_PREFERRED_DNS = "DISABLE_IPV4_PREFERRED_DNS"

    fun initialize() {
        FirebaseRemoteConfig.getInstance().apply {
            val configSettings = FirebaseRemoteConfigSettings.Builder()
                .setMinimumFetchIntervalInSeconds(3600)
                .build()
            setConfigSettingsAsync(configSettings)
            setDefaultsAsync(
                mapOf(
                    FEEDBACK_MINIMUM_RUN_COUNT to 15,
                    FEEDBACK_MINIMUM_USER_ACTIONS to 15,
                    SIM_CHILE_SKIP_PAYMENT to false,
                    SIM_GLOBAL_SKIP_PAYMENT to false,
                    CLIENT_SKIP_SETUP_GLOBAL_ACL to false,
                    SIM_DISCOUNT_LABEL to 25,
                    THRESHOLD_MINUTES_LAST_TKQ to 20,
                    SIM_CL_DEFAULT_PAYMENT_PROVIDER to "Stripe",
                    DISABLE_IPV4_PREFERRED_DNS to false
                )
            )
            fetchAndActivate().addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val updated = task.result
                    Timber.d("Config params updated: $updated")
                } else {
                    Timber.d("Fetch failed ")
                }
            }
        }
    }

    val feedbackMinimumRunCount: Int
        get() = Firebase.remoteConfig.getLong(FEEDBACK_MINIMUM_RUN_COUNT).toInt()
    val feedbackMinimumUserActions: Int
        get() = Firebase.remoteConfig.getLong(FEEDBACK_MINIMUM_USER_ACTIONS).toInt()
    val simChileSkipPayment: Boolean
        get() = Firebase.remoteConfig.getBoolean(SIM_CHILE_SKIP_PAYMENT)
    val simGlobalSkipPayment: Boolean
        get() = Firebase.remoteConfig.getBoolean(SIM_GLOBAL_SKIP_PAYMENT)
    val clientSkipSetupGlobalAcl: Boolean
        get() = Firebase.remoteConfig.getBoolean(CLIENT_SKIP_SETUP_GLOBAL_ACL)
    val simDiscountLabel: Double
        get() = Firebase.remoteConfig.getDouble(SIM_DISCOUNT_LABEL)
    val thresholdMinutesLastTKQ: Long
        get() = Firebase.remoteConfig.getLong(THRESHOLD_MINUTES_LAST_TKQ)
    val simChileDefaultPaymentProvider: String
    get() = Firebase.remoteConfig.getString(SIM_CL_DEFAULT_PAYMENT_PROVIDER)

    /** Kill-switch for the IPv4-preferred Parse DNS (default false = enabled). */
    val disableIpv4PreferredDns: Boolean
        get() = Firebase.remoteConfig.getBoolean(DISABLE_IPV4_PREFERRED_DNS)
}