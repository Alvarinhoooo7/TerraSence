package com.sosmartlabs.momotabletpadres.core.common.dug.smartdetection.model

import com.sosmartlabs.momotabletpadres.core.common.dug.smartdetection.model.remote.ParseSmartDetection
import com.sosmartlabs.momotabletpadres.core.common.dug.smartdetection.model.remote.ParseSmartDetectionDataSource
import com.sosmartlabs.momotabletpadres.encryption.EncryptedMetadata
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import timber.log.Timber
import java.util.Date
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SmartDetectionRepository @Inject constructor(
    private val parseSmartDetectionDataSource: ParseSmartDetectionDataSource
) {
    suspend fun getSmartDetections(tablet: Tablet, from: Date? = null, limit: Int? = null, skip: Int? = null): List<SmartDetection> {
        tablet.objectId?.let { objectId ->
            return parseSmartDetectionDataSource.getSmartDetections(
                objectId,
                from,
                limit,
                skip,
                ParseSmartDetection::screenshot,
                ParseSmartDetection::packageName,
                ParseSmartDetection::appName,
                ParseSmartDetection::screenshotWithBoundingBoxes,
                // Include encrypted fields
                ParseSmartDetection::encryptedScreenshot,
                ParseSmartDetection::encryptedScreenshotMetadata,
                ParseSmartDetection::encryptedScreenshotWithBoundingBoxes,
                ParseSmartDetection::encryptedScreenshotWithBoundingBoxesMetadata
            ).map {
                it.toSmartDetection(tablet)
            }
        }
        return listOf()
    }

    suspend fun countDetections(tablet: Tablet, since: java.util.Date? = null): Int =
        tablet.objectId?.let { parseSmartDetectionDataSource.countSmartDetections(it, since) } ?: 0

    suspend fun sendDugDetectionFeedback(
        detectionId: String, 
        isCorrect: Boolean, 
        type: String
    ): Boolean {
        Timber.d("Calling cloud function dugDetectionFeedback with package name")
        return parseSmartDetectionDataSource.sendDugDetectionFeedback(detectionId, isCorrect, type)
            .objectId == detectionId
    }

    suspend fun fetchDugDetectionFeedback(detectionObjectId: String): Boolean {
        Timber.d("Calling cloud function fetchDugDetectionFeedback with detectionObjectId")
        return parseSmartDetectionDataSource.fetchDugDetectionFeedback(detectionObjectId)
    }

    private fun ParseSmartDetection.toSmartDetection(tablet: Tablet? = null): SmartDetection {
        // Check if encrypted version is available (prefer bounding boxes version)
        val isEncrypted = isEncrypted()
        val encryptedFile = if (has("encryptedScreenshotWithBoundingBoxes") && encryptedScreenshotWithBoundingBoxes != null) {
            encryptedScreenshotWithBoundingBoxes
        } else if (has("encryptedScreenshot") && encryptedScreenshot != null) {
            encryptedScreenshot
        } else {
            null
        }
        
        val encryptedMeta = if (has("encryptedScreenshotWithBoundingBoxesMetadata") && encryptedScreenshotWithBoundingBoxesMetadata != null) {
            EncryptedMetadata.fromMap(encryptedScreenshotWithBoundingBoxesMetadata)
        } else if (has("encryptedScreenshotMetadata") && encryptedScreenshotMetadata != null) {
            EncryptedMetadata.fromMap(encryptedScreenshotMetadata)
        } else {
            null
        }
        
        // For backward compatibility, use unencrypted URL if encryption not available
        val screenshotUrl = if (!isEncrypted) {
            if (has("screenshotWithBoundingBoxes")) 
                screenshotWithBoundingBoxes?.url 
            else 
                screenshot?.url
        } else {
            null // Will use encrypted file instead
        }
        
        return SmartDetection(
            objectId = objectId,
            tablet = tablet,
            screenshot = screenshotUrl,
            appName = if (has("appName")) appName else null,
            packageName = if (has("packageName")) packageName else null,
            category = if (has("category")) category else null,
            confidence = if (has("confidence")) confidence?.toFloat() else null,
            classType = if (has("classType")) classType else null,
            coordinates = if (has("coordinates")) coordinates else null,
            modelVersionName = if (has("modelVersionName")) modelVersionName else null,
            modelSize = if (has("modelSize")) modelSize else null,
            tabletVersionName = if (has("tabletVersionName")) tabletVersionName else null,
            createdAt = createdAt,
            isEncrypted = isEncrypted && encryptedFile != null && encryptedMeta != null,
            encryptedScreenshotFile = encryptedFile,
            encryptedMetadata = encryptedMeta
        )
    }
}