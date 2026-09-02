package com.sosmartlabs.momo.watchsettings.model

import com.parse.ParseException
import com.parse.coroutines.callCloudFunction
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject

class WearerRepository @Inject constructor() {
    suspend fun findWearer(params: Map<String, String>): Boolean {
        return try {
            CrashlyticsLog.log("Calling cloud function wFind")
            callCloudFunction<Any?>("wFind", params)
            true
        } catch (e: ParseException) {
            Timber.e(e, "Error finding wearer")
            false
        }
    }

    suspend fun turnOffWearer(params: Map<String, String>): Boolean {
        return try {
            CrashlyticsLog.log("Calling cloud function wPowerOff")
            callCloudFunction<Any?>("wPowerOff", params)
            true
        } catch (e: ParseException) {
            Timber.e(e, "Error turning off wearer")
            false
        }
    }

    suspend fun removeWearer(params: Map<String, String>): Int? {
        return try {
            CrashlyticsLog.log("Calling cloud function removeWatch")
            callCloudFunction("removeWatch", params)
        } catch (e: ParseException) {
            Timber.e(e, "Error removing wearer")
            null
        }
    }
}
