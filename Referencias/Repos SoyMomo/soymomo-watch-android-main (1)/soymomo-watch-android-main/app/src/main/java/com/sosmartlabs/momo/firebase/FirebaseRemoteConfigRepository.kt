package com.sosmartlabs.momo.firebase

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
    private const val FORCE_USE_IPV4_PARSE_SDK = "FORCE_USE_IPV4_PARSE_SDK"
    private const val CHAT_GROUP_LIST_IS_HIDDEN = "CHAT_GROUP_LIST_IS_HIDDEN"

    fun initialize() {
        Timber.d("FirebaseRemoteConfigRepository: Starting initialization")
        CrashlyticsLog.log("FirebaseRemoteConfigRepository: Starting initialization")
        
        FirebaseRemoteConfig.getInstance().apply {
            Timber.d("FirebaseRemoteConfigRepository: Configuring remote config settings")
            val configSettings = FirebaseRemoteConfigSettings.Builder()
                .setMinimumFetchIntervalInSeconds(3600)
                .build()
            
            setConfigSettingsAsync(configSettings)
            
            Timber.d("FirebaseRemoteConfigRepository: Setting default values")
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
                    FORCE_USE_IPV4_PARSE_SDK to true,
                    CHAT_GROUP_LIST_IS_HIDDEN to true
                )
            )
            
            Timber.d("FirebaseRemoteConfigRepository: Fetching and activating remote config")
            CrashlyticsLog.log("FirebaseRemoteConfigRepository: Fetching and activating remote config")
            
            fetchAndActivate().addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val updated = task.result
                    Timber.d("FirebaseRemoteConfigRepository: Config params updated: $updated")
                    CrashlyticsLog.log("FirebaseRemoteConfigRepository: Config params updated successfully")
                } else {
                    // Breadcrumb only, never a non-fatal: a failed fetch is the user's
                    // network, not a defect, and setDefaultsAsync above already covers
                    // every key. Recording these produced ~38k events across 7 Crashlytics
                    // issues in a single week.
                    Timber.e("FirebaseRemoteConfigRepository: Fetch failed: ${task.exception?.message}")
                    CrashlyticsLog.log(
                        "FirebaseRemoteConfigRepository: Failed to fetch remote config, " +
                            "using defaults: ${task.exception?.message}"
                    )
                }
            }
        }
    }

    val feedbackMinimumRunCount: Int
        get() {
            val value = Firebase.remoteConfig.getLong(FEEDBACK_MINIMUM_RUN_COUNT).toInt()
            Timber.v("FirebaseRemoteConfigRepository: Retrieved feedbackMinimumRunCount = $value")
            return value
        }
        
    val feedbackMinimumUserActions: Int
        get() {
            val value = Firebase.remoteConfig.getLong(FEEDBACK_MINIMUM_USER_ACTIONS).toInt()
            Timber.v("FirebaseRemoteConfigRepository: Retrieved feedbackMinimumUserActions = $value")
            return value
        }
        
    val simChileSkipPayment: Boolean
        get() {
            val value = Firebase.remoteConfig.getBoolean(SIM_CHILE_SKIP_PAYMENT)
            Timber.v("FirebaseRemoteConfigRepository: Retrieved simChileSkipPayment = $value")
            return value
        }
        
    val simGlobalSkipPayment: Boolean
        get() {
            val value = Firebase.remoteConfig.getBoolean(SIM_GLOBAL_SKIP_PAYMENT)
            Timber.v("FirebaseRemoteConfigRepository: Retrieved simGlobalSkipPayment = $value")
            return value
        }
        
    val clientSkipSetupGlobalAcl: Boolean
        get() {
            val value = Firebase.remoteConfig.getBoolean(CLIENT_SKIP_SETUP_GLOBAL_ACL)
            Timber.v("FirebaseRemoteConfigRepository: Retrieved clientSkipSetupGlobalAcl = $value")
            return value
        }
        
    val simDiscountLabel: Double
        get() {
            val value = Firebase.remoteConfig.getDouble(SIM_DISCOUNT_LABEL)
            Timber.v("FirebaseRemoteConfigRepository: Retrieved simDiscountLabel = $value")
            return value
        }
        
    val thresholdMinutesLastTKQ: Long
        get() {
            val value = Firebase.remoteConfig.getLong(THRESHOLD_MINUTES_LAST_TKQ)
            Timber.v("FirebaseRemoteConfigRepository: Retrieved thresholdMinutesLastTKQ = $value")
            return value
        }
        
    val simChileDefaultPaymentProvider: String
        get() {
            val value = Firebase.remoteConfig.getString(SIM_CL_DEFAULT_PAYMENT_PROVIDER)
            Timber.v("FirebaseRemoteConfigRepository: Retrieved simChileDefaultPaymentProvider = $value")
            return value
        }
        
    val forceUseIpv4ParseSdk: Boolean
        get() {
            val value = Firebase.remoteConfig.getBoolean(FORCE_USE_IPV4_PARSE_SDK)
            Timber.v("FirebaseRemoteConfigRepository: Retrieved forceUseIpv4ParseSdk = $value")
            return value
        }
        
    val chatGroupListIsHidden: Boolean
        get() {
            val value = Firebase.remoteConfig.getBoolean(CHAT_GROUP_LIST_IS_HIDDEN)
            Timber.v("FirebaseRemoteConfigRepository: Retrieved chatGroupListIsHidden = $value")
            return value
        }
}
