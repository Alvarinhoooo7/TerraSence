package com.sosmartlabs.momotabletpadres.dispatch.repository

import com.sosmartlabs.momotabletpadres.BuildConfig
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GcmSenderKeyRepository @Inject constructor() {

    /**
     * Obtains a GCM sender key for use in the app, with detailed logging.
     */
    val gcmSenderKey: String
        get() {
            Timber.d("GcmSenderKeyRepository: Attempting to obtain GCM sender key")
            CrashlyticsLog.log("GcmSenderKeyRepository: Attempting to obtain GCM sender key")
            val key = BuildConfig.gcmSenderKey
            if (key.isNullOrBlank()) {
                Timber.e("GcmSenderKeyRepository: GCM sender key is null or blank")
                CrashlyticsLog.log("GcmSenderKeyRepository: GCM sender key is null or blank")
            } else {
                Timber.d("GcmSenderKeyRepository: Successfully obtained GCM sender key")
                CrashlyticsLog.log("GcmSenderKeyRepository: Successfully obtained GCM sender key")
            }
            return key
        }
}