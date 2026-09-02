package com.sosmartlabs.momotabletpadres.core.common.dug.smartdetection.model.remote

import com.parse.ParseObject
import com.parse.ParseQuery
import com.parse.coroutines.callCloudFunction
import com.parse.coroutines.suspendFind
import com.parse.ktx.include
import com.parse.ktx.selectKeys
import com.parse.ktx.whereEqualTo
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import java.util.*
import javax.inject.Inject
import kotlin.reflect.KProperty

/**
 * Data Source for obtaining smart detections from Parse
 */
open class ParseSmartDetectionDataSource @Inject constructor(){

    /**
     * Obtains the smart detections for the given tablet
     * @param tabletId ObjectId for Tablet for find detections
     * @param from Start date for detections considered in query. If null, the query will not filter by date
     * @param fieldsToInclude fields to include in the query response
     * @return List of detected smart detections in the given tablet
     */
    suspend fun getSmartDetections(tabletId: String, from: Date? = null,
                                   limit: Int? = null, skip: Int? = null,
                                   vararg fieldsToInclude: KProperty<Any?>): List<ParseSmartDetection> {
        val tablet = ParseTablet.createWithoutData(tabletId)
        return ParseQuery.getQuery(ParseSmartDetection::class.java)
            .whereEqualTo(ParseSmartDetection::tablet, tablet)
            .orderByDescending("createdAt")
            .apply {
                limit?.let { this.limit = it }
                skip?.let { this.skip = it }
                from?.let { whereGreaterThanOrEqualTo("createdAt", from) }
                if (fieldsToInclude.isNotEmpty()) selectKeys(fieldsToInclude.toSet())
                if (fieldsToInclude.isEmpty() || fieldsToInclude.contains(
                        ParseSmartDetection::screenshot))
                    include(ParseSmartDetection::screenshot)
                // Include encrypted fields if available
                if (fieldsToInclude.isEmpty() || fieldsToInclude.contains(
                        ParseSmartDetection::encryptedScreenshot))
                    include(ParseSmartDetection::encryptedScreenshot)
                if (fieldsToInclude.isEmpty() || fieldsToInclude.contains(
                        ParseSmartDetection::encryptedScreenshotWithBoundingBoxes))
                    include(ParseSmartDetection::encryptedScreenshotWithBoundingBoxes)
            }.suspendFind()
    }

    suspend fun countSmartDetections(tabletId: String, since: java.util.Date? = null): Int {
        val tablet = ParseTablet.createWithoutData(tabletId)
        return ParseQuery.getQuery(ParseSmartDetection::class.java)
            .whereEqualTo(ParseSmartDetection::tablet, tablet)
            .apply { if (since != null) whereGreaterThanOrEqualTo("createdAt", since) }
            .count()
    }

    suspend fun sendDugDetectionFeedback(detectionId: String, isCorrect: Boolean, type: String): ParseObject {
        CrashlyticsLog.log("Calling cloud function dugDetectionFeedback with package name")
        return callCloudFunction("postDugDetectionFeedback", mapOf("detectionId" to detectionId, "isCorrect" to isCorrect, "type" to type))
    }

    suspend fun fetchDugDetectionFeedback(detectionObjectId: String): Boolean {
        CrashlyticsLog.log("Calling cloud function fetchDugDetectionFeedback with detectionObjectId")
        return callCloudFunction("fetchDugDetectionFeedback", mapOf("detectionObjectId" to detectionObjectId))
    }
}