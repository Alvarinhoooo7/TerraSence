package com.sosmartlabs.momotabletpadres.repositories

import com.parse.ParseCloud
import com.parse.ParseQuery
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.models.RequestTime
import com.sosmartlabs.momotabletpadres.models.RequestTimeApp
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RequestTimeRepository @Inject constructor() {

    fun getRequestTimeByObjectId(requestId: String): RequestTime {
        CrashlyticsLog.log("Querying to get request time by objectId")
        return ParseQuery.getQuery(RequestTime::class.java)
            .whereEqualTo("objectId", requestId)
            .first
    }

    fun getRequestTimeAppByObjectId(requestId: String): RequestTimeApp {
        CrashlyticsLog.log("Querying to get request time app by objectId")
        return ParseQuery.getQuery(RequestTimeApp::class.java)
            .whereEqualTo("objectId", requestId)
            .first
    }

    fun updateRequestTime(requestId: String, tablet: Tablet, state: String, timeToAdd: Long) {
        val parameters = HashMap<String, Any?>().apply {
            put("hid", tablet.hid)
            put("tabletId", tablet.objectId)
            put("objectId", requestId)
            put("timeToAdd", timeToAdd)
        }

        CrashlyticsLog.log("Calling cloud function accept_RequestTime")
        ParseCloud.callFunctionInBackground<RequestTime>("accept_RequestTime", parameters) { _, error ->
            error?.let { Timber.e("Error with cloud function. $it") }
        }
    }

    fun updateRequestTimeApp(requestId: String, tablet: Tablet, timeToAdd: Long) {
        val parameters = HashMap<String, Any?>().apply {
            put("hid", tablet.hid)
            put("tabletId", tablet.objectId)
            put("objectId", requestId)
            put("timeToAdd", timeToAdd)
        }

        CrashlyticsLog.log("Calling cloud function accept_RequestTimeApp")
        ParseCloud.callFunctionInBackground<RequestTimeApp>("accept_RequestTimeApp", parameters) { _, error ->
            error?.let { Timber.e("Error with cloud function. $it") }
        }
    }

    fun deleteRequestTime(requestId: String, tablet: Tablet) {
        val parameters = HashMap<String, Any?>().apply {
            put("hid", tablet.hid)
            put("tabletId", tablet.objectId)
            put("objectId", requestId)
        }

        CrashlyticsLog.log("Calling cloud function reject_RequestTime")
        ParseCloud.callFunctionInBackground<RequestTime>("reject_RequestTime", parameters) { _, error ->
            error?.let { Timber.e("Error with cloud function. $it") }
        }
    }

    fun deleteRequestTimeApp(requestId: String, tablet: Tablet) {
        val parameters = HashMap<String, Any?>().apply {
            put("hid", tablet.hid)
            put("tabletId", tablet.objectId)
            put("objectId", requestId)
        }

        CrashlyticsLog.log("Calling cloud function reject_RequestTimeApp")
        ParseCloud.callFunctionInBackground<RequestTimeApp>("reject_RequestTimeApp", parameters) { _, error ->
            error?.let { Timber.e("Error with cloud function. $it") }
        }
    }
}