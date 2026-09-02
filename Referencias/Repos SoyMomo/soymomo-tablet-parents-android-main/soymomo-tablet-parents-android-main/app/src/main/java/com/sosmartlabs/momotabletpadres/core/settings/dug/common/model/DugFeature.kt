package com.sosmartlabs.momotabletpadres.core.settings.dug.common.model

/**
 * Represents a Dug feature and its state in the tablet
 * @param featureType Feature type
 * @param title Feature title
 * @param iconId Icon for show in Dug features view
 * @param enabled Whether the feature is currently enabled or not
 */
data class DugFeature(
    val featureType: DugFeatureType,
    val title: String,
    val iconId: Int,
    var enabled: Boolean
)

/**
 * Type for the given feature
 */
enum class DugFeatureType {

    /**
     * Smart detector feature type
     */
    SMART_DETECTOR,

    /**
     * Profanity detector feature type
     */
    PROFANITY_DETECTOR,

    /**
     * Unsafe search feature type
     */
    UNSAFE_SEARCH_DETECTOR,

    /**
     * Mood detector feature type
     */
    MOOD_DETECTOR,

    /**
     * Explicit music detector feature type
     */
    EXPLICIT_MUSIC_DETECTOR
}
