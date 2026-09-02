package com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.helpers

import android.content.Context
import android.view.View
import androidx.appcompat.content.res.AppCompatResources
import com.google.android.material.chip.Chip
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectorConstants
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.model.DisplayedDetectedConversation
import com.sosmartlabs.momotabletpadres.core.settings.dug.mooddetection.model.MoodDetection
import com.sosmartlabs.momotabletpadres.databinding.ItemDetectedConversationBinding
import com.sosmartlabs.momotabletpadres.databinding.ItemOnappDetectionBinding
import com.sosmartlabs.momotabletpadres.databinding.MoodDetectionSearchItemBinding
import timber.log.Timber

/**
 * Helper class for populating [MoodDetectionSearchItemBinding] with a [MoodDetection]
 */
object ConversationDetectionItemHelper {

    /**
     * Name of some applications for DUG purposes
     */
    const val WHATSAPP_NAME = "WhatsApp"
    const val INSTAGRAM_NAME = "Instagram"
    const val MESSENGER_LITE_NAME = "MessengerLite"
    const val MESSENGER_NAME = "Messenger"

    /**
     * Profanity level detected for a conversation
     */
    private enum class ProfanityLevel { LOW, MID, HIGH }

    /**
     * Display the information contained in a [DisplayedDetectedConversation] item on a
     * [ItemDetectedConversationBinding].
     * @param context Activity context
     * @param conversation Conversation to display
     * @param binding ItemDetectedConversationBinding to write
     */
    fun setItemDetectedConversationCardBinding(context: Context,
                                               conversation: DisplayedDetectedConversation,
                                               binding: ItemOnappDetectionBinding
    ) {
        with (binding) {
            detectionTitle.text = getTitle(conversation)
            detectionDescription.text = getDescription(conversation)
            detectionDate.text = getDateText(context, conversation)
            cyberbullyingChip.visibility = getCyberbullyingChipVisibility(conversation)
            groomingChip.visibility = getGroomingChipVisibility(conversation)

            val profanityLevel = getTotalProfanityLevel(conversation)
            with (detectionChip) {
                setText(getProfanityLevelChipStringRes(profanityLevel))
                setChipBackgroundColorResource(getProfanityLevelChipBackgroundColorRes(profanityLevel))
                chipIcon = getResources().getDrawable(R.drawable.ic_danger)
                chipIconSize = 8.toFloat()
                setChipIconEnabled(true)
                chipStartPadding = 8.toFloat()
            }

            detectionIcon.setImageDrawable(
                getAppIcon(context, conversation,
                detectionTitle.text.toString())
            )
        }
    }

    /**
     * Obtains a formatted title for the conversation
     */
    private fun getTitle(conversation: DisplayedDetectedConversation): String {
        return conversation.name ?: conversation.detectedConversation.appName!!
    }

    private fun getDescription(conversation: DisplayedDetectedConversation): String {
        Timber.d("getDescription: ${conversation.detectedConversation.logEntries}")
        if (conversation.detectedConversation.logEntries.isEmpty()) {
            return ""
        }
        return "\"${conversation.detectedConversation.logEntries[0].message}\""
    }

    fun showTotalProfanityLevel(conversation: DisplayedDetectedConversation): String {
        return getTotalProfanityLevel(conversation).toString()
    }

    fun setDetectionChip(chip: Chip, profanity: String) {
        var thisProfanityLevel : ProfanityLevel = ProfanityLevel.LOW
        when(profanity) {
            "LOW" -> {
                thisProfanityLevel = ProfanityLevel.LOW
            }
            "MID" -> {
                thisProfanityLevel = ProfanityLevel.MID
            }
            "HIGH" -> {
                thisProfanityLevel = ProfanityLevel.HIGH
            }
        }
        with (chip) {
            setText(getProfanityLevelChipStringRes(thisProfanityLevel))
            setChipBackgroundColorResource(getProfanityLevelChipBackgroundColorRes(thisProfanityLevel))
            setChipIconEnabled(false)
        }
    }

    /**
     * Obtains a formatted date for the conversation
     */
    private fun getDateText(context: Context, conversation: DisplayedDetectedConversation) =
        context.getString(
            R.string.search_detected_at,
            DateUtil.getFormattedDateTime(conversation.detectedConversation.date!!))

    /**
     * Obtains the visibility status for the Cyberbullying chip in view
     */
    fun getCyberbullyingChipVisibility(conversation: DisplayedDetectedConversation) =
        if (conversation.detectedConversation.totalProfanityScore!! > 0) View.VISIBLE
        else View.GONE

    /**
     * Obtains the visibility status for the Grooming chip in view
     */
    fun getGroomingChipVisibility(conversation: DisplayedDetectedConversation) =
        if (conversation.detectedConversation.totalGroomingScore!!
            >= DetectorConstants.GROOMING_LOW_SCORE_THRESHOLD) View.VISIBLE
        else View.GONE

    /**
     * Obtains the total profanity level for this conversation
     */
    private fun getTotalProfanityLevel(conversation: DisplayedDetectedConversation): ProfanityLevel {
        var profanityLevel = ProfanityLevel.LOW

        val totalProfanityScore = conversation.detectedConversation.totalProfanityScore!!
        when {
            isInMinOpenRange(totalProfanityScore, 0.0, DetectorConstants.LOW_PROFANITY_SCORE) -> {
                profanityLevel = ProfanityLevel.LOW
            }
            isInMinOpenRange(totalProfanityScore, DetectorConstants.LOW_PROFANITY_SCORE, DetectorConstants.MID_PROFANITY_SCORE) -> {
                profanityLevel = ProfanityLevel.MID
            }
            totalProfanityScore > DetectorConstants.MID_PROFANITY_SCORE -> {
                profanityLevel = ProfanityLevel.HIGH
            }
        }

        val totalGroomingScore = conversation.detectedConversation.totalGroomingScore!!
        when {
            totalGroomingScore in DetectorConstants.GROOMING_LOW_SCORE_THRESHOLD..DetectorConstants.GROOMING_MID_SCORE_THRESHOLD -> {
                profanityLevel = ProfanityLevel.LOW
            }
            isInMinOpenRange(totalGroomingScore, DetectorConstants.GROOMING_MID_SCORE_THRESHOLD, DetectorConstants.GROOMING_HIGH_SCORE_THRESHOLD) -> {
                if (profanityLevel == ProfanityLevel.LOW)
                    profanityLevel = ProfanityLevel.MID
            }

            totalGroomingScore > DetectorConstants.GROOMING_HIGH_SCORE_THRESHOLD -> {
                if (profanityLevel != ProfanityLevel.HIGH)
                    profanityLevel = ProfanityLevel.HIGH
            }
        }

        return profanityLevel
    }

    /**
     * Detects if a number is in a range with an open minimum valie (i.e., the range does not
     * include it) and a close maximum (does include it).
     * @param number Number to check if is in the range
     * @param min Minimum value for the range, not included in it
     * @param max Maximum value for the range, included in it
     * @return True if the number is contained in the range, false if it isn't.
     */
    private fun isInMinOpenRange(number: Double, min: Double, max: Double) =
        min < number && number <= max

    /**
     * Obtains the appropriated string resource for a given Profanity Level
     */
    private fun getProfanityLevelChipStringRes(profanityLevel: ProfanityLevel) = when (profanityLevel) {
        ProfanityLevel.LOW -> R.string.dug_detection_low
        ProfanityLevel.MID -> R.string.dug_detection_serious
        ProfanityLevel.HIGH -> R.string.dug_detection_very_serious
    }

    /**
     * Obtains the appropriated color resource for a given Profanity Level
     */
    private fun getProfanityLevelChipBackgroundColorRes(profanityLevel: ProfanityLevel) = when (profanityLevel) {
        ProfanityLevel.LOW -> R.color.colorChipLight
        ProfanityLevel.MID -> R.color.colorChipSerious
        ProfanityLevel.HIGH -> R.color.colorChipVerySerious
    }

    /**
     * Gets the app icon for an app name
     */
    private fun getAppIcon(context: Context, conversation: DisplayedDetectedConversation, appName: String) =
        conversation.icon ?: when (appName) {
            WHATSAPP_NAME -> AppCompatResources.getDrawable(context, R.drawable.whatsapp_logo)
            INSTAGRAM_NAME -> AppCompatResources.getDrawable(context, R.drawable.instagram_logo)
            MESSENGER_NAME -> AppCompatResources.getDrawable(context, R.drawable.messenger_logo)
            MESSENGER_LITE_NAME -> AppCompatResources.getDrawable(context, R.drawable.messenger_logo)
            else -> null
        }
}