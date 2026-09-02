package com.sosmartlabs.momo.alarms.model

import com.parse.ParseObject
import com.parse.ParseQuery
import com.parse.coroutines.suspendFind
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import javax.inject.Inject

class AlarmsRepository @Inject constructor() {
    suspend fun getAlarms(watch: Wearer): List<ParseObject> {
        CrashlyticsLog.log("Querying to getAlarms from wearer")
        return ParseQuery.getQuery<ParseObject>("Alarm")
            .whereEqualTo("watch", watch)
            .orderByAscending("time").suspendFind()
    }
}