package com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model

import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.remote.ParseDetectedConversation
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.remote.ParseDetectedConversationDataSource
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.remote.ParseDetectedConversationScreenshot
import com.sosmartlabs.momotabletpadres.encryption.EncryptedMetadata
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import timber.log.Timber
import java.util.Date
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DetectedConversationsRepository @Inject constructor(
    private val detectedConversationDataSource: ParseDetectedConversationDataSource
) {
    private val parseDetectedConversationsMap = mutableMapOf<String, ParseDetectedConversation>()
    private val detectedConversationsMap = mutableMapOf<String, DetectedConversation>()

    /**
     * Get a list of detected conversations for a given tablet without include mood detection conversations
     * @param tabletId ObjectId for the tablet to query conversations
     * @param from Start date to query conversations. Can be null for no start date limit.
     * @return List of [DetectedConversation] for the given tablet
     */
    open suspend fun getDetectedConversationsWithoutMoodDetections(
        tabletId: String?,
        from: Date? = null,
        limit: Int? = null,
        skip: Int? = null
    ): List<DetectedConversation> {
        tabletId?.let { objectId ->
            return detectedConversationDataSource.getDetectedConversationsWithoutMoodScore(
                objectId, from, limit, skip,
                ParseDetectedConversation::appName, ParseDetectedConversation::date,
                ParseDetectedConversation::logEntriesSerialized,
                ParseDetectedConversation::detectedScreenshots,
                ParseDetectedConversation::totalProfanityScore,
                ParseDetectedConversation::totalGroomingScore,
                ParseDetectedConversation::llmVerified,
                ParseDetectedConversation::llmCheckResult,
                ParseDetectedConversation::modelType
            )
                .onEach {
                    parseDetectedConversationsMap[it.objectId] = it
                }
                .map {
                    it.toDetectedConversation(false)
                }
        }
        return listOf()
    }

    /**
     * Get a list of mood detected conversations
     * @param tabletId ObjectId for the tablet to query conversations
     * @param from Start date to query conversations. Can be null for no start date limit.
     * @return List of [DetectedConversation] for the given tablet
     */
    open suspend fun getMoodDetectedConversations(
        tabletId: String?,
        from: Date? = null,
        limit: Int? = null,
        skip: Int? = null
    ): List<DetectedConversation> {
        tabletId?.let { objectId ->
            return detectedConversationDataSource.getDetectedConversationWithMoodScore(
                objectId, from, limit, skip,
                ParseDetectedConversation::appName, ParseDetectedConversation::date,
                ParseDetectedConversation::logEntriesSerialized,
                ParseDetectedConversation::totalMoodScore, ParseDetectedConversation::riskFactor,
                ParseDetectedConversation::llmVerified,
                ParseDetectedConversation::llmCheckResult,
                ParseDetectedConversation::modelType
            )
                .onEach {
                    parseDetectedConversationsMap[it.objectId] = it
                }
                .map {
                    it.toDetectedConversation(false)
                }
        }
        return listOf()
    }

    suspend fun countConversationsWithoutMood(tabletId: String?, since: java.util.Date? = null): Int =
        tabletId?.let { detectedConversationDataSource.countConversationsWithoutMoodScore(it, since) } ?: 0

    suspend fun countMoodConversations(tabletId: String?, since: java.util.Date? = null): Int =
        tabletId?.let { detectedConversationDataSource.countConversationsWithMoodScore(it, since) } ?: 0

    /**
     * Load the screenshots associated to a detected conversation
     * @param detectedConversation Detected conversation to load screenshots
     * @return List of [DetectedConversationScreenshot] for the given detection
     */
    suspend fun loadDetectedConversationScreenshots(detectedConversation: DetectedConversation) {
        Timber.d("Loading screenshots for detected conversation ${detectedConversation.objectId}")
        Timber.d("Screenshots: ${detectedConversationsMap.keys}")
        detectedConversation.screenshots =
            detectedConversationDataSource
                .getDetectedConversationScreenshots(parseDetectedConversationsMap[detectedConversation.objectId]!!)
                .map { it.toDetectedConversationScreenshot() }
    }

    suspend fun sendDugDetectionFeedback(
        detectionId: String,
        isCorrect: Boolean,
        type: String,
        tablet: Tablet
    ): Boolean {
        Timber.d("Calling cloud function dugDetectionFeedback with package name")
        return if (detectedConversationDataSource.sendDugDetectionFeedback(
                detectionId,
                isCorrect,
                type
            ) != null
        ) {
            true
        } else {
            false
        }
    }

    suspend fun fetchDugDetectionFeedback(detectionObjectId: String): Boolean {
        Timber.d("Calling cloud function fetchDugDetectionFeedback with detectionObjectId")
        return detectedConversationDataSource.fetchDugDetectionFeedback(detectionObjectId)
    }

    /**
     * Creates a [DetectedConversation] instance with the data of this [ParseDetectedConversation]
     * @param includeScreenshots Whether the screenshots associated with this detection must be included or not.
     * If false, [DetectedConversation.screenshots] will be empty
     * @return [DetectedConversation] instance
     */
    suspend fun ParseDetectedConversation.toDetectedConversation(includeScreenshots: Boolean): DetectedConversation {
        Timber.d("Received logEntries $logEntriesSerialized for detected conversation $objectId")
        val logEntries = if (logEntriesSerialized != null)
            DetectedConversationLogEntry.fromJsonArray(logEntriesSerialized!!)
        else listOf()
        Timber.d("Converted logEntries: $logEntries")
        return DetectedConversation(
            objectId = objectId,
            appName = if (has("appName")) appName else null,
            date = if (has("date")) date else null,
            senderName = if (has("senderName")) senderName else null,
            logEntries = logEntries,
            screenshots = if (includeScreenshots)
                detectedConversationDataSource.getDetectedConversationScreenshots(this)
                    .map { it.toDetectedConversationScreenshot() }
            else listOf(),
            totalProfanityScore = logEntries.sumOf { it.profanityScore },
            totalGroomingScore = logEntries.sumOf { it.groomingScore },
            totalMoodScore = logEntries.sumOf { it.moodScore },
            modelVersionName = if (has("modelVersionName")) modelVersionName else null,
            riskFactor = if (has("riskFactor")) riskFactor else null,
            modelSize = if (has("modelSize")) modelSize else null,
            hasFeedback = if (has("hasFeedback")) hasFeedback else false
        )
    }

    /**
     * Creates a [DetectedConversationScreenshot] instance from this [ParseDetectedConversationScreenshot]
     * @return [DetectedConversationScreenshot] instance
     */
    private fun ParseDetectedConversationScreenshot.toDetectedConversationScreenshot(): DetectedConversationScreenshot {
        val isEncrypted = isEncrypted()
        val encryptedMeta = if (isEncrypted && encryptedScreenshotMetadata != null) {
            EncryptedMetadata.fromMap(encryptedScreenshotMetadata)
        } else {
            null
        }
        
        return DetectedConversationScreenshot(
            screenshot = if (!isEncrypted) screenshot?.url ?: "" else "",
            timestamp = timestamp ?: 0L,
            isEncrypted = isEncrypted && encryptedScreenshot != null && encryptedMeta != null,
            encryptedScreenshotFile = if (isEncrypted) encryptedScreenshot else null,
            encryptedMetadata = encryptedMeta
        )
    }
}