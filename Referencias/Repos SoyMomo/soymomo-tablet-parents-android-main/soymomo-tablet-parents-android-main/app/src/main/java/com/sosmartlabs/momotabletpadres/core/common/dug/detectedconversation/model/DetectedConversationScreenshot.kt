package com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model

import com.parse.ParseFile
import com.sosmartlabs.momotabletpadres.encryption.EncryptedMetadata

/**
 * Represents a DUG detected conversation screenshot
 * @param screenshot Url for this screenshot (for backward compatibility, empty string if encrypted)
 * @param timestamp Date timestamp for this screenshot
 * @param isEncrypted Whether the screenshot is encrypted
 * @param encryptedScreenshotFile The encrypted file (if encrypted)
 * @param encryptedMetadata The encryption metadata (if encrypted)
 */
data class DetectedConversationScreenshot(
    var screenshot: String,
    var timestamp: Long,
    val isEncrypted: Boolean = false,
    val encryptedScreenshotFile: ParseFile? = null,
    val encryptedMetadata: EncryptedMetadata? = null
)
