package com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.parse.ktx.delegates.ParseRelationDelegate
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import java.util.Date

/**
 * Represents an element from DetectedConversation collection on Parse database
 */
@ParseClassName("DetectedConversation")
class ParseDetectedConversation: ParseObject() {
    var tablet by ParseDelegate<ParseTablet?>(null)
    var appName by ParseDelegate<String?>(null)
    var date by ParseDelegate<Date?>(null)
    var senderName by ParseDelegate<String?>(null)
    var logEntriesSerialized by ParseDelegate<String?>(null)
    val detectedScreenshots by ParseRelationDelegate<ParseDetectedConversationScreenshot>(null)
    var totalProfanityScore by ParseDelegate<Double?>(null)
    var totalGroomingScore by ParseDelegate<Double?>(null)
    var totalMoodScore by ParseDelegate<Double?>(null)
    var modelVersionName by ParseDelegate<String?>(null)
    var riskFactor by ParseDelegate<String?>(null)
    var modelSize by ParseDelegate<String?>(null)
    var tabletVersionName by ParseDelegate<String?>(null)
    var hasFeedback by ParseDelegate<Boolean?>(null)
    var llmVerified by ParseDelegate<Boolean?>(null)
    var llmCheckResult by ParseDelegate<String?>(null)
    var modelType by ParseDelegate<List<String>?>(null)
}