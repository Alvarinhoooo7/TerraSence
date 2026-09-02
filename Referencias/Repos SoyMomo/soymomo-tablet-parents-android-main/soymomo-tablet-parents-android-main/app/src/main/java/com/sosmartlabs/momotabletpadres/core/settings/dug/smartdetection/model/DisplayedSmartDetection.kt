package com.sosmartlabs.momotabletpadres.core.settings.dug.smartdetection.model

import android.graphics.drawable.Drawable
import com.parse.ParseFile
import com.sosmartlabs.momotabletpadres.encryption.EncryptedMetadata
import java.util.*

data class DisplayedSmartDetection(
    val objectId: String?,
    val screenshot: String?,
    val appIcon: Drawable?,
    val appName: String?,
    val createdAt: Date,
    // Encryption fields
    val isEncrypted: Boolean = false,
    val encryptedScreenshotFile: ParseFile? = null,
    val encryptedMetadata: EncryptedMetadata? = null
)