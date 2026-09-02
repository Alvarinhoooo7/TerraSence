package com.sosmartlabs.momotabletpadres.core.common.dug.smartdetection.model.remote

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet

@ParseClassName("SmartDetection")
class ParseSmartDetection: ParseObject() {

    var tablet by ParseDelegate<ParseTablet?>(null)
    var screenshot by ParseDelegate<ParseFile?>(null)
    var appName by ParseDelegate<String?>(null)
    var packageName by ParseDelegate<String?>(null)
    var category by ParseDelegate<Int?>(null)
    var confidence by ParseDelegate<Double?>(null)
    var classType by ParseDelegate<String?>(null)
    var coordinates by ParseDelegate<String?>(null)
    var modelVersionName by ParseDelegate<String?>(null)
    var modelSize by ParseDelegate<String?>(null)
    var tabletVersionName by ParseDelegate<String?>(null)
    var screenshotWithBoundingBoxes by ParseDelegate<ParseFile?>(null)
    
    // Encryption fields - used when screenshot is encrypted
    var encryptedScreenshot by ParseDelegate<ParseFile?>(null)
    var encryptedScreenshotMetadata by ParseDelegate<Map<String, Any?>?>(null)
    var encryptedScreenshotWithBoundingBoxes by ParseDelegate<ParseFile?>(null)
    var encryptedScreenshotWithBoundingBoxesMetadata by ParseDelegate<Map<String, Any?>?>(null)
    
    /**
     * Check if this smart detection has encrypted screenshot data
     */
    fun isEncrypted(): Boolean {
        return encryptedScreenshotMetadata != null && encryptedScreenshot != null
    }
}