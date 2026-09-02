package com.sosmartlabs.momotabletpadres.core.settings.dug.mooddetection.model

import android.graphics.drawable.Drawable
import com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.model.DetectionScreenshots
import java.util.*

/**
 * Class for handling mood detection information
 * @param objectId objectId on remote database
 * @param appName Application name to show
 * @param appIcon Application icon to show
 * @param date Detection date
 * @param text Detection text
 * @param totalMoodScore Total score for this detection
 * @param riskFactors List of risk factors found on this detection
 * @param screenshots Screenshots associated to this detection
 */
data class MoodDetection(
    val objectId: String, val appName: String, val packageName: String? = null, val appIcon: Drawable?, val date: Date,
    val text: String, val totalMoodScore: Double?, val riskFactors: List<String>, var screenshots: DetectionScreenshots? = null, var hasFeedback: Boolean?) {
    companion object {
        /**
         * Label for drugs risk factor in detection
         */
        const val RISK_FACTOR_DRUGS = "DRUGS"

        /**
         * Label for alcohol risk factor in detection
         */
        const val RISK_FACTOR_ALCOHOL = "ALCOHOL"

        /**
         * Label for smoking risk factor in detection
         */
        const val RISK_FACTOR_SMOKING = "SMOKING"

        /**
         * Label for alimentary disorder risk factor in detection
         */
        const val RISK_FACTOR_ALIMENTARY_DISORDER = "ALIMENTARY_DISORDER"

        /**
         * Label for sexual curiosity risk factor in detection
         */
        const val RISK_FACTOR_SEXUAL_CURIOSITY = "PORN"

        /**
         * Label for suicidal ideation risk factor in detection
         */
        const val RISK_FACTOR_SUICIDE_IDEATION = "SUICIDE_IDEATION"

        /**
         * Label for sadness risk factor in detection
         */
        const val RISK_FACTOR_SADNESS = "SADNESS"

        /**
         * Label for concerning detection
         */
        const val RISK_FACTOR_CONCERNING = "CONCERNING"
    }
}