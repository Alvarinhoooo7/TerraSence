package com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.remote

import com.parse.ParseObject
import com.parse.ParseQuery
import com.parse.coroutines.callCloudFunction
import com.parse.coroutines.suspendFind
import com.parse.ktx.orderByDescending
import com.parse.ktx.selectKeys
import com.parse.ktx.whereEqualTo
import com.parse.ktx.whereExists
import com.parse.ktx.whereGreaterThan
import com.parse.ktx.whereGreaterThanOrEqualTo
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import org.json.JSONObject
import timber.log.Timber
import java.util.Date
import javax.inject.Inject
import kotlin.reflect.KProperty

/**
 * Data source for detected conversations from DetectedConversation collection on Parse database
 */
open class ParseDetectedConversationDataSource @Inject constructor() {

    /**
     * Obtains the base query for [ParseDetectedConversation]
     * @param tabletId Id for the tablet to query
     * @param from Start date for conversations considered in query. If null, the query will not filter by date
     * @param fieldsToInclude fields to include in the query response
     * @return [ParseQuery] for [ParseDetectedConversation] for the given parameters
     */
    private fun getBaseDetectedConversationsQuery(tabletId: String, from: Date? = null, vararg fieldsToInclude: KProperty<Any?>): ParseQuery<ParseDetectedConversation> {
        val tablet = ParseTablet.createWithoutData(tabletId)
        val query = ParseQuery(ParseDetectedConversation::class.java)
            .whereEqualTo(ParseDetectedConversation::tablet, tablet)
            .apply {
                if (from != null) whereGreaterThanOrEqualTo(ParseDetectedConversation::date, from)
                if (fieldsToInclude.isNotEmpty()) selectKeys(fieldsToInclude.toList())
            }
            .orderByDescending(ParseDetectedConversation::date)

        return query
    }

    /**
     * Obtains the detected conversations that contains mood score for a tablet
     * @param tabletId Id for the tablet to query
     * @param from Start date for conversations considered in query. If null, the query will not filter by date
     * @param fieldsToInclude fields to include in the query response
     * @return List of [ParseDetectedConversation] for the given parameters
     */
    suspend fun getDetectedConversationWithMoodScore(tabletId: String, from: Date? = null, limit: Int? = null, skip: Int? = null, vararg fieldsToInclude: KProperty<Any?>): List<ParseDetectedConversation> {
        val tablet = ParseTablet.createWithoutData(tabletId)

        val llmVerifiedQuery = ParseQuery(ParseDetectedConversation::class.java)
            .whereEqualTo(ParseDetectedConversation::tablet, tablet)
            .whereExists(ParseDetectedConversation::totalMoodScore)
            .whereGreaterThan(ParseDetectedConversation::totalMoodScore, 0)
            .whereEqualTo(ParseDetectedConversation::llmVerified, true)
            .apply {
                if (from != null) whereGreaterThanOrEqualTo(ParseDetectedConversation::date, from)
            }

        val modelTypeQuery = ParseQuery(ParseDetectedConversation::class.java)
            .whereEqualTo(ParseDetectedConversation::tablet, tablet)
            .whereExists(ParseDetectedConversation::totalMoodScore)
            .whereGreaterThan(ParseDetectedConversation::totalMoodScore, 0)
            .whereContainsAll(ParseDetectedConversation::modelType.name, listOf("DICTIONARY"))
            .apply {
                if (from != null) whereGreaterThanOrEqualTo(ParseDetectedConversation::date, from)
            }

        val orQuery = ParseQuery.or(listOf(llmVerifiedQuery, modelTypeQuery))
            .orderByDescending(ParseDetectedConversation::date)
            .apply {
                limit?.let { this.limit = it }
                skip?.let { this.skip = it }
                if (fieldsToInclude.isNotEmpty()) selectKeys(fieldsToInclude.toList())
            }

        val conversations = orQuery.suspendFind()

        return conversations.filter { conversation ->
            if (!conversation.getBoolean("llmVerified") || conversation.getList<String>("modelType")?.contains("DICTIONARY") == true) return@filter true
            val llmResponse = conversation.getString("llmCheckResult")
            llmResponse?.let {
                val response = JSONObject(it)
                response.getString("label") != "no-detection"
            } ?: false
        }
    }

    /**
     * Obtains the detected conversations that doesn't contain mood score for a tablet
     * @param tabletId Id for the tablet to query
     * @param from Start date for conversations considered in query. If null, the query will not filter by date
     * @param fieldsToInclude fields to include in the query response
     * @return List of [ParseDetectedConversation] for the given parameters
     */
    suspend fun getDetectedConversationsWithoutMoodScore(tabletId: String, from: Date? = null, limit: Int? = null, skip: Int? = null, vararg fieldsToInclude: KProperty<Any?>): List<ParseDetectedConversation> {
        Timber.d("getDetectedConversationsWithoutMoodScore: tabletId: $tabletId, from: $from, fieldsToInclude: $fieldsToInclude")
        val tablet = ParseTablet.createWithoutData(tabletId)

        val llmVerifiedQuery = ParseQuery(ParseDetectedConversation::class.java)
            .whereEqualTo(ParseDetectedConversation::tablet, tablet)
            .whereEqualTo(ParseDetectedConversation::totalMoodScore, 0)
            .whereEqualTo(ParseDetectedConversation::llmVerified, true)
            .apply {
                if (from != null) whereGreaterThanOrEqualTo(ParseDetectedConversation::date, from)
            }

        val modelTypeQuery = ParseQuery(ParseDetectedConversation::class.java)
            .whereEqualTo(ParseDetectedConversation::tablet, tablet)
            .whereEqualTo(ParseDetectedConversation::totalMoodScore, 0)
            .whereContainsAll(ParseDetectedConversation::modelType.name, listOf("DICTIONARY"))
            .apply {
                if (from != null) whereGreaterThanOrEqualTo(ParseDetectedConversation::date, from)
            }

        val orQuery = ParseQuery.or(listOf(llmVerifiedQuery, modelTypeQuery))
            .orderByDescending(ParseDetectedConversation::date)
            .apply {
                limit?.let { this.limit = it }
                skip?.let { this.skip = it }
                if (fieldsToInclude.isNotEmpty()) selectKeys(fieldsToInclude.toList())
            }

        val conversations = orQuery.suspendFind()

        return conversations.filter { conversation ->
            if (!conversation.getBoolean("llmVerified") || conversation.getList<String>("modelType")?.contains("DICTIONARY") == true) return@filter true
            val llmResponse = conversation.getString("llmCheckResult")
            llmResponse?.let {
                val response = JSONObject(it)
                response.getString("label") != "no-detection"
            } ?: false
        }
    }

    suspend fun countConversationsWithoutMoodScore(tabletId: String, since: java.util.Date? = null): Int {
        val tablet = ParseTablet.createWithoutData(tabletId)
        val q1 = ParseQuery(ParseDetectedConversation::class.java)
            .whereEqualTo(ParseDetectedConversation::tablet, tablet)
            .whereEqualTo(ParseDetectedConversation::totalMoodScore, 0)
            .whereEqualTo(ParseDetectedConversation::llmVerified, true)
            .apply { if (since != null) whereGreaterThanOrEqualTo("createdAt", since) }
        val q2 = ParseQuery(ParseDetectedConversation::class.java)
            .whereEqualTo(ParseDetectedConversation::tablet, tablet)
            .whereEqualTo(ParseDetectedConversation::totalMoodScore, 0)
            .whereContainsAll(ParseDetectedConversation::modelType.name, listOf("DICTIONARY"))
            .apply { if (since != null) whereGreaterThanOrEqualTo("createdAt", since) }
        return ParseQuery.or(listOf(q1, q2)).count()
    }

    suspend fun countConversationsWithMoodScore(tabletId: String, since: java.util.Date? = null): Int {
        val tablet = ParseTablet.createWithoutData(tabletId)
        val q1 = ParseQuery(ParseDetectedConversation::class.java)
            .whereEqualTo(ParseDetectedConversation::tablet, tablet)
            .whereExists(ParseDetectedConversation::totalMoodScore)
            .whereGreaterThan(ParseDetectedConversation::totalMoodScore, 0)
            .whereEqualTo(ParseDetectedConversation::llmVerified, true)
            .apply { if (since != null) whereGreaterThanOrEqualTo("createdAt", since) }
        val q2 = ParseQuery(ParseDetectedConversation::class.java)
            .whereEqualTo(ParseDetectedConversation::tablet, tablet)
            .whereExists(ParseDetectedConversation::totalMoodScore)
            .whereGreaterThan(ParseDetectedConversation::totalMoodScore, 0)
            .whereContainsAll(ParseDetectedConversation::modelType.name, listOf("DICTIONARY"))
            .apply { if (since != null) whereGreaterThanOrEqualTo("createdAt", since) }
        return ParseQuery.or(listOf(q1, q2)).count()
    }

    /**
     * Get the screenshots for the given detectedConversation.
     * @param detectedConversation [ParseDetectedConversation] to query screenshots
     * @return List with [ParseDetectedConversationScreenshot] associated to the given detection
     */
    suspend fun getDetectedConversationScreenshots(detectedConversation: ParseDetectedConversation) =
        detectedConversation.detectedScreenshots
            .query
            .suspendFind()

    suspend fun sendDugDetectionFeedback(detectionId: String, isCorrect: Boolean, type: String): ParseObject {
        CrashlyticsLog.log("Calling cloud function dugDetectionFeedback with package name")
        return callCloudFunction("postDugDetectionFeedback", mapOf("detectionId" to detectionId, "isCorrect" to isCorrect, "type" to type))
    }

    suspend fun fetchDugDetectionFeedback(detectionObjectId: String): Boolean {
        CrashlyticsLog.log("Calling cloud function fetchDugDetectionFeedback with detectionObjectId")
        return callCloudFunction("fetchDugDetectionFeedback", mapOf("detectionObjectId" to detectionObjectId))
    }
}