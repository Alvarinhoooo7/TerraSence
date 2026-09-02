package com.sosmartlabs.momotabletpadres.core.common.dug.smartdetection.model

import com.parse.ParseFile
import com.sosmartlabs.momotabletpadres.encryption.EncryptedMetadata
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import java.util.*

/**
 * Class that represents a Dug Image Smart Detection
 */
data class SmartDetection(
    val objectId: String,
    val tablet: Tablet?,
    val screenshot: String?,
    val appName: String?,
    val packageName: String?,
    val category: Int?,
    val confidence: Float?,
    val classType: String?,
    val coordinates: String?,
    val modelVersionName: String?,
    val modelSize: String?,
    val tabletVersionName: String?,
    val createdAt: Date,
    // Encryption fields
    val isEncrypted: Boolean = false,
    val encryptedScreenshotFile: ParseFile? = null,
    val encryptedMetadata: EncryptedMetadata? = null
)
