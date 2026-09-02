package com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model

import java.util.*

/**
 * Represents a DUG detected conversation
 */
data class DetectedConversation(var objectId: String, var appName: String?, var date: Date?,
                                var senderName: String?,
                                var logEntries: List<DetectedConversationLogEntry>,
                                var screenshots: List<DetectedConversationScreenshot>,
                                var totalProfanityScore: Double?, var totalGroomingScore: Double?,
                                var totalMoodScore: Double?, var modelVersionName: String?,
                                var riskFactor: String?, var modelSize: String?, var hasFeedback: Boolean?)