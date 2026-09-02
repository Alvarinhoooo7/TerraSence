package com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model.remote

import com.parse.ParseQuery
import com.parse.coroutines.callCloudFunction
import com.parse.coroutines.suspendFind
import com.parse.ktx.*
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import java.util.*
import javax.inject.Inject
import kotlin.reflect.KProperty

/**
 * Data source for explicit music from ExplicitMusic collection on Parse database
 */
open class ParseExplicitMusicDataSource @Inject constructor() {

    /**
     * Obtains the detected explicit music for the given tablet
     * @param tabletId ObjectId for Tablet for find detections
     * @param from Start date for detections considered in query. If null, the query will not filter by date
     * @param fieldsToInclude fields to include in the query response
     * @return List of detected explicit music in the given tablet
     */
    suspend fun getDetectedExplicitMusic(tabletId: String, from: Date? = null,
                                         limit: Int? = null, skip: Int? = null,
                                         vararg fieldsToInclude: KProperty<Any?>): List<ParseExplicitMusicDetection> {
        val tablet = ParseTablet.createWithoutData(tabletId)
        return ParseQuery.getQuery(ParseExplicitMusicDetection::class.java)
            .whereEqualTo(ParseExplicitMusicDetection::tablet, tablet)
            .orderByDescending(ParseExplicitMusicDetection::detectionDate)
            .apply {
                limit?.let { this.limit = it }
                skip?.let { this.skip = it }
                from?.let { whereGreaterThanOrEqualTo(ParseExplicitMusicDetection::detectionDate, from) }
                if (fieldsToInclude.isNotEmpty()) selectKeys(fieldsToInclude.toSet())
                if (fieldsToInclude.isEmpty() || fieldsToInclude.contains(
                        ParseExplicitMusicDetection::artist))
                    include(ParseExplicitMusicDetection::artist)
            }.suspendFind()
    }

    suspend fun countDetections(tabletId: String, since: java.util.Date? = null): Int {
        val tablet = ParseTablet.createWithoutData(tabletId)
        return ParseQuery.getQuery(ParseExplicitMusicDetection::class.java)
            .whereEqualTo(ParseExplicitMusicDetection::tablet, tablet)
            .apply { if (since != null) whereGreaterThanOrEqualTo("createdAt", since) }
            .count()
    }

    suspend fun sendDugDetectionFeedback(detectionId: String, isCorrect: Boolean, type: String): List<ParseExplicitMusicDetection> {
        CrashlyticsLog.log("Calling cloud function dugDetectionFeedback with package name")
        return callCloudFunction("postDugDetectionFeedback", mapOf("detectionId" to detectionId, "isCorrect" to isCorrect, "type" to type))
    }

    suspend fun fetchDugDetectionFeedback(detectionObjectId: String): Boolean {
        CrashlyticsLog.log("Calling cloud function fetchDugDetectionFeedback with detectionObjectId")
        return callCloudFunction("fetchDugDetectionFeedback", mapOf("detectionObjectId" to detectionObjectId))
    }
}