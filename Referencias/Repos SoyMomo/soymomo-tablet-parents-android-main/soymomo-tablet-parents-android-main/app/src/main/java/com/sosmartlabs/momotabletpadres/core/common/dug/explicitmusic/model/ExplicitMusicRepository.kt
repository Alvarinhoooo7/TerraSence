package com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model

import com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model.remote.ParseExplicitMusicArtist
import com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model.remote.ParseExplicitMusicDataSource
import com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model.remote.ParseExplicitMusicDetection
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import timber.log.Timber
import java.util.Date
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExplicitMusicRepository @Inject constructor(
    private val parseExplicitMusicDataSource: ParseExplicitMusicDataSource
) {
    suspend fun getDetectedExplicitMusic(tablet: Tablet, from: Date? = null, limit: Int? = null, skip: Int? = null): List<ExplicitMusicDetection> {
        tablet.objectId?.let { objectId ->
            return parseExplicitMusicDataSource.getDetectedExplicitMusic(
                objectId,
                from,
                limit,
                skip,
                ParseExplicitMusicDetection::packageName,
                ParseExplicitMusicDetection::songTitle,
                ParseExplicitMusicDetection::songImage,
                ParseExplicitMusicDetection::detectedArtist,
                ParseExplicitMusicDetection::artist,
                ParseExplicitMusicDetection::detectionDate
            ).map {
                it.toExplicitMusicDetection()
            }
        }
        return listOf()
    }

    suspend fun countDetections(tablet: Tablet, since: java.util.Date? = null): Int =
        tablet.objectId?.let { parseExplicitMusicDataSource.countDetections(it, since) } ?: 0

    suspend fun sendDugDetectionFeedback(
        detectionId: String,
        isCorrect: Boolean,
        type: String,
        tablet: Tablet
    ): ExplicitMusicDetection {
        Timber.d("Calling cloud function dugDetectionFeedback with package name")
        return parseExplicitMusicDataSource.sendDugDetectionFeedback(detectionId, isCorrect, type)
            .map { it.toExplicitMusicDetection() }
            .first()
    }

    suspend fun fetchDugDetectionFeedback(detectionObjectId: String): Boolean {
        Timber.d("Calling cloud function fetchDugDetectionFeedback with detectionObjectId")
        return parseExplicitMusicDataSource.fetchDugDetectionFeedback(detectionObjectId)
    }

    private fun ParseExplicitMusicDetection.toExplicitMusicDetection(): ExplicitMusicDetection = 
        ExplicitMusicDetection(
            objectId = objectId,
            packageName = packageName!!,
            songTitle = songTitle!!,
            songImage = songImage!!,
            detectedArtist = detectedArtist ?: artist.fetchIfNeeded<ParseExplicitMusicArtist>().name!!,
            artist = artist.fetchIfNeeded<ParseExplicitMusicArtist>().toExplicitMusicArtist(),
            detectionDate = detectionDate!!,
            hasFeedback = if (has("hasFeedback")) hasFeedback else false
        )

    private fun ParseExplicitMusicArtist.toExplicitMusicArtist(): ExplicitMusicArtist = 
        ExplicitMusicArtist(
            name = name!!,
            explicitScore = explicitScore!!.toDouble()
        )
}