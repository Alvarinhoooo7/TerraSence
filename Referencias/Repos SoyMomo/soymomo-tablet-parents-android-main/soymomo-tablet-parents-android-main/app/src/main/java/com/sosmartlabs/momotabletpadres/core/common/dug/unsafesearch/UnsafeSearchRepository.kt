package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch

import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.DetectedUnsafeSearch
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.remote.ParseDetectedUnsafeSearch
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.remote.ParseUnsafeSearchDataSource
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import timber.log.Timber
import java.util.Date
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UnsafeSearchRepository @Inject constructor(
    private val unsafeSearchDataSource: ParseUnsafeSearchDataSource
) {
    suspend fun getDetectedUnsafeSearch(
        tablet: Tablet,
        from: Date? = null,
        limit: Int? = null,
        skip: Int? = null
    ): List<DetectedUnsafeSearch> {
        tablet.objectId?.let {
            return unsafeSearchDataSource.getDetectedUnsafeSearch(
                tablet.objectId!!,
                from,
                limit,
                skip,
                ParseDetectedUnsafeSearch::searchText,
                ParseDetectedUnsafeSearch::date,
                ParseDetectedUnsafeSearch::category,
                ParseDetectedUnsafeSearch::packageName
            ).map { it.toDetectedUnsafeSearch(tablet) }
        }
        return listOf()
    }

    suspend fun countDetections(tablet: Tablet, since: java.util.Date? = null): Int =
        tablet.objectId?.let { unsafeSearchDataSource.countDetections(it, since) } ?: 0

    suspend fun sendDugDetectionFeedback(
        detectionId: String,
        isCorrect: Boolean,
        type: String,
        tablet: Tablet
    ): DetectedUnsafeSearch {
        Timber.d("Calling cloud function dugDetectionFeedback with package name")
        return unsafeSearchDataSource.sendDugDetectionFeedback(detectionId, isCorrect, type)
            .map { it.toDetectedUnsafeSearch(tablet) }
            .first()
    }

    suspend fun fetchDugDetectionFeedback(detectionObjectId: String): Boolean {
        Timber.d("Calling cloud function fetchDugDetectionFeedback with detectionObjectId")
        return unsafeSearchDataSource.fetchDugDetectionFeedback(detectionObjectId)
    }

    private fun ParseDetectedUnsafeSearch.toDetectedUnsafeSearch(tablet: Tablet): DetectedUnsafeSearch =
        DetectedUnsafeSearch(
            objectId = objectId,
            tablet = tablet,
            searchText = if (has("searchText")) searchText else null,
            detection = if (has("detection")) detection else null,
            packageName = if (has("packageName")) packageName else null,
            date = if (has("date")) date else null,
            category = if (has("category")) category else null,
            referenceId = if (has("referenceId")) referenceId else null,
            hasFeedback = if (has("hasFeedback")) hasFeedback else false
        )
}