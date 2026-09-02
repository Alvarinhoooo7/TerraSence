package com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.remote

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.remote.ParseDetectedConversation

/**
 * Represents an element from DetectedConversationScreenshot collection on Parse database
 */
@ParseClassName("DetectedConversationScreenshot")
class ParseDetectedConversationScreenshot: ParseObject() {
    var screenshot by ParseDelegate<ParseFile?>(name=null)
    var timestamp by ParseDelegate<Long?>(name=null)
    var detectedConversationPointer by ParseDelegate<ParseDetectedConversation?>(name=null)
    
    // Encryption fields - used when screenshot is encrypted
    var encryptedScreenshot by ParseDelegate<ParseFile?>(null)
    var encryptedScreenshotMetadata by ParseDelegate<Map<String, Any?>?>(null)
    
    /**
     * Check if this screenshot is encrypted
     */
    fun isEncrypted(): Boolean {
        return encryptedScreenshotMetadata != null && encryptedScreenshot != null
    }
}