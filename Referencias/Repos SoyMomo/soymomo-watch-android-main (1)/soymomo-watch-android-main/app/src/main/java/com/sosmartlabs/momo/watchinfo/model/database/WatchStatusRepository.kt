package com.sosmartlabs.momo.watchinfo.model.database

import com.parse.ParseQuery
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import javax.inject.Inject

/**
 * Repository for working with WatchStatus on database
 */
class WatchStatusRepository @Inject constructor() {

    /**
     * Obtains the watch status from the database
     */
    fun getWatchStatus(deviceId: String): WatchStatus {
        CrashlyticsLog.log("Querying watch status by deviceId")
        return ParseQuery.getQuery(WatchStatus::class.java)
            .whereEqualTo("deviceId", deviceId)
            .first
    }
}