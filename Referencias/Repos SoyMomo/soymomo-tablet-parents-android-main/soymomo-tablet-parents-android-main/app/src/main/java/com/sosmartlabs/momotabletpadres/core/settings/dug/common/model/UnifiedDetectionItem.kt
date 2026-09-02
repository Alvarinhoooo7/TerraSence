package com.sosmartlabs.momotabletpadres.core.settings.dug.common.model

import com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.model.DisplayedDetectedConversation
import com.sosmartlabs.momotabletpadres.core.settings.dug.explicitmusic.model.DisplayedExplicitMusicDetection
import com.sosmartlabs.momotabletpadres.core.settings.dug.mooddetection.model.MoodDetection
import com.sosmartlabs.momotabletpadres.core.settings.dug.smartdetection.model.DisplayedSmartDetection
import com.sosmartlabs.momotabletpadres.core.settings.dug.unsafesearch.model.DisplayedDetectedUnsafeSearch
import java.util.Date

enum class DetectionFilter {
    ALL, IMAGES, MESSAGES, SEARCHES, MOOD, MUSIC
}

enum class SeverityLevel {
    MILD, SERIOUS, VERY_SERIOUS, NONE
}

sealed class UnifiedDetectionItem(
    open val id: String,
    open val category: DugFeatureType,
    open val appIconUrl: String?,
    open val appName: String?,
    open val contentPreview: String,
    open val severity: SeverityLevel,
    open val timestamp: Date,
    open val riskChips: List<String>
) {

    data class ImageDetection(
        override val id: String,
        override val appIconUrl: String?,
        override val appName: String?,
        override val contentPreview: String,
        override val timestamp: Date,
        val detections: List<DisplayedSmartDetection>,
        val groupCount: Int
    ) : UnifiedDetectionItem(id, DugFeatureType.SMART_DETECTOR, appIconUrl, appName, contentPreview, SeverityLevel.NONE, timestamp, emptyList())

    data class MessageDetection(
        override val id: String,
        override val appIconUrl: String?,
        override val appName: String?,
        override val contentPreview: String,
        override val severity: SeverityLevel,
        override val timestamp: Date,
        val conversation: DisplayedDetectedConversation,
        val hasCyberbullying: Boolean,
        val hasGrooming: Boolean
    ) : UnifiedDetectionItem(id, DugFeatureType.PROFANITY_DETECTOR, appIconUrl, appName, contentPreview, severity, timestamp, emptyList())

    data class SearchDetection(
        override val id: String,
        override val appIconUrl: String?,
        override val appName: String?,
        override val contentPreview: String,
        override val timestamp: Date,
        val search: DisplayedDetectedUnsafeSearch,
        val searchCategory: String?
    ) : UnifiedDetectionItem(id, DugFeatureType.UNSAFE_SEARCH_DETECTOR, appIconUrl, appName, contentPreview, SeverityLevel.NONE, timestamp, emptyList())

    data class MoodItem(
        override val id: String,
        override val appIconUrl: String?,
        override val appName: String?,
        override val contentPreview: String,
        override val timestamp: Date,
        override val riskChips: List<String>,
        val moodDetection: MoodDetection
    ) : UnifiedDetectionItem(id, DugFeatureType.MOOD_DETECTOR, appIconUrl, appName, contentPreview, SeverityLevel.NONE, timestamp, riskChips)

    data class MusicItem(
        override val id: String,
        override val appIconUrl: String?,
        override val appName: String?,
        override val contentPreview: String,
        override val timestamp: Date,
        val musicDetection: DisplayedExplicitMusicDetection
    ) : UnifiedDetectionItem(id, DugFeatureType.EXPLICIT_MUSIC_DETECTOR, appIconUrl, appName, contentPreview, SeverityLevel.NONE, timestamp, emptyList())
}
