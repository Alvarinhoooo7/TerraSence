package com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.model

import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectedConversationScreenshot

/**
 * Holder for screenshots associated to a given detection
 * @param previousScreenshot Screenshot previous to main detection, used for giving context to detection
 * @param mainScreenshot Main detection screenshot
 * @param nextScreenshot  Screenshot posterior to main detection, used for giving context to detection
 */
data class DetectionScreenshots(val previousScreenshot: DetectedConversationScreenshot?,
                                val mainScreenshot: DetectedConversationScreenshot,
                                val nextScreenshot: DetectedConversationScreenshot?)
