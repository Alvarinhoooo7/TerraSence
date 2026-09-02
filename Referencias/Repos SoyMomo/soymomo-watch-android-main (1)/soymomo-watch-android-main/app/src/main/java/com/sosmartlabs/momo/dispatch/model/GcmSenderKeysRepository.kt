package com.sosmartlabs.momo.dispatch.model

import com.sosmartlabs.momo.BuildConfig
import javax.inject.Inject

/**
 * Repository for GCM sender keys
 */
class GcmSenderKeysRepository @Inject constructor() {

    /**
     * Obtains a GCM sender key for been used in the app
     */
    val gcmSenderKey: String get() = BuildConfig.gcmSenderKey
}