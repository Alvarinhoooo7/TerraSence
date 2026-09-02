package com.sosmartlabs.momo.watchlock.model

import com.parse.ParseObject
import com.parse.ParseQuery
import com.parse.coroutines.suspendFind
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import javax.inject.Inject

class SilenceTimeRepository @Inject constructor() {
    suspend fun getWatchSilenceTimes(watch: Wearer): List<ParseObject> {
        CrashlyticsLog.log("Querying watch silence time by watch in list parse object")
        return ParseQuery.getQuery<ParseObject>("SilenceTime")
            .whereEqualTo("watch", watch)
            .orderByAscending("startTime")
            .suspendFind()
    }
}