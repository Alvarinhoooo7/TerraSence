package com.sosmartlabs.momotabletpadres.tabletsettings.remotescreenshot.model

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.ParseDelegate

@ParseClassName("Screenshot")
class RemoteScreenshot: ParseObject() {

    var tablet by ParseDelegate<ParseTablet?>()
    var user by ParseDelegate<ParseUser?>()
    var screenshot by ParseDelegate<ParseFile?>()
    var hasReachedTablet by ParseDelegate<Boolean?>()
    
    // Encryption fields - used when screenshot is encrypted
    var encryptedScreenshot by ParseDelegate<ParseFile?>()
    var encryptedScreenshotMetadata by ParseDelegate<Map<String, Any?>?>()

    /**
     * Check if this screenshot has encrypted data available.
     */
    fun isEncrypted(): Boolean {
        return encryptedScreenshotMetadata != null && encryptedScreenshot != null
    }
}