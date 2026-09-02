package com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.helpers

import android.content.Context
import androidx.core.content.ContextCompat
import com.google.android.material.chip.ChipGroup
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.glide.loadAppIcon
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.databinding.DugChipBinding
import com.sosmartlabs.momotabletpadres.databinding.ItemOnappDetectionBinding
import com.sosmartlabs.momotabletpadres.core.settings.dug.mooddetection.model.MoodDetection

/**
 * Helper class for populating [ItemOnappDetectionBinding] with a [MoodDetection]
 */
object MoodDetectionItemHelper {

    /**
     * Sets a [MoodDetection] to this [ItemOnappDetectionBinding]
     * @param detection [MoodDetection] to set to this view binding
     */
    fun ItemOnappDetectionBinding.setMoodDetection(detection: MoodDetection) {
        val context = root.context
        addRiskFactorChips(context, detection.riskFactors, detection.totalMoodScore!!, detectionChipGroup, true)
        detectionIcon.loadAppIcon(detection.appIcon, detection.appName)
        detectionTitle.text = detection.appName
        with(detectionDescription) {
            text = detection.text
        }
        detectionDate.text = DateUtil.getFormattedDateTime(detection.date)
    }

    /**
     * Adds risk factor chips to this view
     * @param riskFactors List of risk factors to be added to this view
     * @param moodScore Total mood score for the detection
     */
    fun addRiskFactorChips(context: Context, riskFactors: List<String>, moodScore: Double, chipGroup : ChipGroup, swap : Boolean) {
        with(chipGroup) {
            removeAllViews()
            riskFactors.forEach {
                addView(
                    DugChipBinding.inflate(
                        android.view.LayoutInflater.from(context), this, false).apply {
                        with(root) {
                            setText(when(it) {
                                MoodDetection.RISK_FACTOR_DRUGS -> R.string.dug_detection_chip_drugs
                                MoodDetection.RISK_FACTOR_ALCOHOL -> R.string.dug_detection_chip_alcohol
                                MoodDetection.RISK_FACTOR_SMOKING -> R.string.dug_detection_chip_smoking
                                MoodDetection.RISK_FACTOR_ALIMENTARY_DISORDER -> R.string.dug_detection_chip_alimentary_disroder
                                MoodDetection.RISK_FACTOR_SEXUAL_CURIOSITY -> R.string.dug_detection_chip_porn
                                MoodDetection.RISK_FACTOR_SUICIDE_IDEATION -> R.string.dug_detection_chip_suicide
                                MoodDetection.RISK_FACTOR_SADNESS -> R.string.dug_detection_chip_sadness
                                else -> R.string.dug_detection_chip_concerning
                            })
                            setChipBackgroundColorResource(when(it) {
                                MoodDetection.RISK_FACTOR_DRUGS -> R.color.colorChipDrugs
                                MoodDetection.RISK_FACTOR_ALCOHOL -> R.color.colorChipAlcohol
                                MoodDetection.RISK_FACTOR_SMOKING -> R.color.colorChipSmoking
                                MoodDetection.RISK_FACTOR_ALIMENTARY_DISORDER -> R.color.colorChipEatingDisorder
                                MoodDetection.RISK_FACTOR_SEXUAL_CURIOSITY -> R.color.colorChipPorn
                                MoodDetection.RISK_FACTOR_SUICIDE_IDEATION -> R.color.colorChipSuicide
                                MoodDetection.RISK_FACTOR_SADNESS -> R.color.colorChipSadness
                                else -> R.color.colorChipSerious
                            })
                            scaleX = if (swap) (-1).toFloat() else (1).toFloat()
                            chipMinHeight = 32f * context.resources.displayMetrics.density
                            textSize = 12f
                        }
                        root.chipIcon = ContextCompat.getDrawable(context, R.drawable.ic_danger)
                        root.chipIconSize = 14f
                        root.chipStartPadding = 8f
                        if (it == MoodDetection.RISK_FACTOR_SUICIDE_IDEATION) {
                            root.isChipIconEnabled = true
                        }
                    }.root
                )
            }
        }
    }
}