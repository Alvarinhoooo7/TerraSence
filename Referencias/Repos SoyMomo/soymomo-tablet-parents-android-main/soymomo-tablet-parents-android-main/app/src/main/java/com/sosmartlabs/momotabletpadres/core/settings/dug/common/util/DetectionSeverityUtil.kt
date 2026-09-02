package com.sosmartlabs.momotabletpadres.core.settings.dug.common.util

import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectorConstants
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.DetectedUnsafeSearch
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.DugFeatureType
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.SeverityLevel
import com.sosmartlabs.momotabletpadres.core.settings.dug.mooddetection.model.MoodDetection

/**
 * Pure utility functions for severity/chip mapping, decoupled from any View binding.
 * Extracted from ConversationDetectionItemHelper, UnsafeSearchItemHelper, and MoodDetectionItemHelper.
 */
object DetectionSeverityUtil {

    /**
     * Computes the overall severity level from profanity and grooming scores.
     * Logic extracted from ConversationDetectionItemHelper.getTotalProfanityLevel().
     */
    fun getProfanityLevel(profanityScore: Double, groomingScore: Double): SeverityLevel {
        var level = SeverityLevel.MILD

        when {
            profanityScore > 0.0 && profanityScore <= DetectorConstants.LOW_PROFANITY_SCORE ->
                level = SeverityLevel.MILD
            profanityScore > DetectorConstants.LOW_PROFANITY_SCORE &&
                    profanityScore <= DetectorConstants.MID_PROFANITY_SCORE ->
                level = SeverityLevel.SERIOUS
            profanityScore > DetectorConstants.MID_PROFANITY_SCORE ->
                level = SeverityLevel.VERY_SERIOUS
        }

        when {
            groomingScore in DetectorConstants.GROOMING_LOW_SCORE_THRESHOLD..DetectorConstants.GROOMING_MID_SCORE_THRESHOLD ->
                level = SeverityLevel.MILD
            groomingScore > DetectorConstants.GROOMING_MID_SCORE_THRESHOLD &&
                    groomingScore <= DetectorConstants.GROOMING_HIGH_SCORE_THRESHOLD -> {
                if (level == SeverityLevel.MILD) level = SeverityLevel.SERIOUS
            }
            groomingScore > DetectorConstants.GROOMING_HIGH_SCORE_THRESHOLD -> {
                if (level != SeverityLevel.VERY_SERIOUS) level = SeverityLevel.VERY_SERIOUS
            }
        }

        return level
    }

    fun hasCyberbullying(profanityScore: Double): Boolean = profanityScore > 0

    fun hasGrooming(groomingScore: Double): Boolean =
        groomingScore >= DetectorConstants.GROOMING_LOW_SCORE_THRESHOLD

    // -- Severity chip resources --

    fun getSeverityChipColorRes(level: SeverityLevel): Int = when (level) {
        SeverityLevel.MILD -> R.color.colorChipLight
        SeverityLevel.SERIOUS -> R.color.colorChipSerious
        SeverityLevel.VERY_SERIOUS -> R.color.colorChipVerySerious
        SeverityLevel.NONE -> R.color.colorChipLight
    }

    fun getSeverityChipStringRes(level: SeverityLevel): Int = when (level) {
        SeverityLevel.MILD -> R.string.dug_detection_low
        SeverityLevel.SERIOUS -> R.string.dug_detection_serious
        SeverityLevel.VERY_SERIOUS -> R.string.dug_detection_very_serious
        SeverityLevel.NONE -> R.string.dug_detection_low
    }

    // -- Unsafe search category resources --

    fun getUnsafeSearchCategoryChip(category: String?): Pair<Int, Int> = when (category) {
        DetectedUnsafeSearch.CATEGORY_VIRAL ->
            Pair(R.color.colorChipViral, R.string.unsafe_search_viral_label)
        DetectedUnsafeSearch.CATEGORY_MOVIE ->
            Pair(R.color.colorChipMoviesSeries, R.string.unsafe_search_movie_label)
        DetectedUnsafeSearch.CATEGORY_CONTENT_CREATOR ->
            Pair(R.color.colorChipSocialMedia, R.string.unsafe_search_social_network_label)
        else ->
            Pair(R.color.colorChipViral, R.string.unsafe_search_viral_label)
    }

    // -- Mood risk factor resources --

    fun getRiskFactorChipStringRes(riskFactor: String): Int = when (riskFactor) {
        MoodDetection.RISK_FACTOR_DRUGS -> R.string.dug_detection_chip_drugs
        MoodDetection.RISK_FACTOR_ALCOHOL -> R.string.dug_detection_chip_alcohol
        MoodDetection.RISK_FACTOR_SMOKING -> R.string.dug_detection_chip_smoking
        MoodDetection.RISK_FACTOR_ALIMENTARY_DISORDER -> R.string.dug_detection_chip_alimentary_disroder
        MoodDetection.RISK_FACTOR_SEXUAL_CURIOSITY -> R.string.dug_detection_chip_porn
        MoodDetection.RISK_FACTOR_SUICIDE_IDEATION -> R.string.dug_detection_chip_suicide
        MoodDetection.RISK_FACTOR_SADNESS -> R.string.dug_detection_chip_sadness
        else -> R.string.dug_detection_chip_concerning
    }

    fun getRiskFactorChipColorRes(riskFactor: String): Int = when (riskFactor) {
        MoodDetection.RISK_FACTOR_DRUGS -> R.color.colorChipDrugs
        MoodDetection.RISK_FACTOR_ALCOHOL -> R.color.colorChipAlcohol
        MoodDetection.RISK_FACTOR_SMOKING -> R.color.colorChipSmoking
        MoodDetection.RISK_FACTOR_ALIMENTARY_DISORDER -> R.color.colorChipEatingDisorder
        MoodDetection.RISK_FACTOR_SEXUAL_CURIOSITY -> R.color.colorChipPorn
        MoodDetection.RISK_FACTOR_SUICIDE_IDEATION -> R.color.colorChipSuicide
        MoodDetection.RISK_FACTOR_SADNESS -> R.color.colorChipSadness
        else -> R.color.colorChipSerious
    }

    fun isHighRiskFactor(riskFactor: String): Boolean =
        riskFactor == MoodDetection.RISK_FACTOR_SUICIDE_IDEATION

    // -- Category accent colors for unified list --

    fun getCategoryAccentColorRes(category: DugFeatureType): Int =
        when (category) {
            DugFeatureType.SMART_DETECTOR -> R.color.dug_menu_card_background
            DugFeatureType.PROFANITY_DETECTOR -> R.color.colorChipSerious
            DugFeatureType.UNSAFE_SEARCH_DETECTOR -> R.color.colorPrimary
            DugFeatureType.MOOD_DETECTOR -> R.color.colorChipPorn
            DugFeatureType.EXPLICIT_MUSIC_DETECTOR -> R.color.colorChipViral
        }

    fun getCategoryLabelRes(category: DugFeatureType): Int =
        when (category) {
            DugFeatureType.SMART_DETECTOR -> R.string.dug_chip_images
            DugFeatureType.PROFANITY_DETECTOR -> R.string.dug_chip_messages
            DugFeatureType.UNSAFE_SEARCH_DETECTOR -> R.string.dug_chip_searches
            DugFeatureType.MOOD_DETECTOR -> R.string.dug_detection_mood_title
            DugFeatureType.EXPLICIT_MUSIC_DETECTOR -> R.string.dug_chip_music
        }

    fun getCategoryIconRes(category: DugFeatureType): Int =
        when (category) {
            DugFeatureType.SMART_DETECTOR -> R.drawable.ic_dug_detection_images
            DugFeatureType.PROFANITY_DETECTOR -> R.drawable.ic_dug_detection_messages
            DugFeatureType.UNSAFE_SEARCH_DETECTOR -> R.drawable.ic_dug_detection_search
            DugFeatureType.MOOD_DETECTOR -> R.drawable.ic_dug_detection_moods
            DugFeatureType.EXPLICIT_MUSIC_DETECTOR -> R.drawable.ic_dug_detection_music
        }
}
