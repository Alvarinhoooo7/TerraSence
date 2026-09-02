package com.sosmartlabs.momotabletpadres.dispatch.repository

import com.parse.ParseConfig
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ParseConfigRepository @Inject constructor() {

    /**
     * Obtains the Parse config
     * @return Parse config
     */
    fun getParseConfig(): ParseConfig? {
        Timber.d("ParseConfigRepository: Attempting to obtain ParseConfig")
        CrashlyticsLog.log("ParseConfigRepository: Attempting to obtain ParseConfig")
        val config = try {
            ParseConfig.get()
        } catch (e: Exception) {
            Timber.e(e, "ParseConfigRepository: Error obtaining ParseConfig")
            CrashlyticsLog.recordNonFatalError(e, "ParseConfigRepository: Error obtaining ParseConfig")
            null
        }
        if (config == null) {
            Timber.w("ParseConfigRepository: ParseConfig is null")
            CrashlyticsLog.log("ParseConfigRepository: ParseConfig is null")
        } else {
            Timber.d("ParseConfigRepository: Successfully obtained ParseConfig")
            CrashlyticsLog.log("ParseConfigRepository: Successfully obtained ParseConfig")
        }
        return config
    }
}