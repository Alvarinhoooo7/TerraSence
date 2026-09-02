package com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model

object DetectorConstants {
    /**
     * Profanity Scores for highlighting messages in notification
     */
    const val MID_PROFANITY_SCORE = 100.0       // 30 to 100
    const val LOW_PROFANITY_SCORE = 30.0        // 0 to 30

    /**
     * Grooming score values for notifying users
     */
    const val GROOMING_LOW_SCORE_THRESHOLD = 25.0
    const val GROOMING_MID_SCORE_THRESHOLD = 50.0
    const val GROOMING_HIGH_SCORE_THRESHOLD = 75.0
}