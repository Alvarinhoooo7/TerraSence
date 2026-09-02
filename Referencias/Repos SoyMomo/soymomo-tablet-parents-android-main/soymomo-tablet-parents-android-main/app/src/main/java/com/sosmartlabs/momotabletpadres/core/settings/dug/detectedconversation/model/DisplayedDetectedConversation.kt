package com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.model

import android.graphics.drawable.Drawable
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectedConversation

/**
 * Detected conversation displayed to user
 */
data class DisplayedDetectedConversation(val name: String?, val icon: Drawable?,
                                         val detectedConversation: DetectedConversation,
                                         var screenshots: DetectionScreenshots? = null)
