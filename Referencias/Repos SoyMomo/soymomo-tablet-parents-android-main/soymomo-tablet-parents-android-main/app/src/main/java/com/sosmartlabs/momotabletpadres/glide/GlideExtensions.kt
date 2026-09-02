package com.sosmartlabs.momotabletpadres.glide

import android.graphics.drawable.Drawable
import com.bumptech.glide.RequestBuilder
import com.bumptech.glide.RequestManager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectedConversationScreenshot
import com.sosmartlabs.momotabletpadres.core.common.dug.smartdetection.model.SmartDetection
import com.sosmartlabs.momotabletpadres.core.settings.dug.smartdetection.model.DisplayedSmartDetection
import com.sosmartlabs.momotabletpadres.encryption.EncryptedMetadata
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tabletsettings.remotescreenshot.model.RemoteScreenshot

/**
 * Extension functions for loading encrypted images with Glide.
 * 
 * These extensions provide a clean, type-safe API for loading encrypted content:
 * 
 * ```kotlin
 * Glide.with(context)
 *     .loadEncrypted(screenshot)
 *     .placeholder(R.drawable.placeholder)
 *     .into(imageView)
 * ```
 */

// ==================== RemoteScreenshot ====================

/**
 * Load an encrypted RemoteScreenshot.
 * Falls back to loading unencrypted URL if no encryption data is available.
 * 
 * @param screenshot The RemoteScreenshot to load
 * @return RequestBuilder that can be further configured (placeholders, transformations, etc.)
 */
fun RequestManager.loadEncrypted(screenshot: RemoteScreenshot): RequestBuilder<Drawable> {
    // Check for encrypted version first
    val encryptedFile = screenshot.encryptedScreenshot
    val metadataMap = screenshot.encryptedScreenshotMetadata
    
    if (encryptedFile != null && metadataMap != null) {
        val metadata = EncryptedMetadata.fromMap(metadataMap)
        if (metadata != null) {
            val model = EncryptedParseFile(
                parseFile = encryptedFile,
                metadata = metadata,
                cacheKey = "screenshot_${screenshot.objectId}"
            )
            return load(model)
        }
    }
    
    // Fall back to unencrypted URL
    return load(screenshot.screenshot?.url)
}

/**
 * Load an encrypted RemoteScreenshot with explicit objectId for caching.
 */
fun RequestManager.loadEncrypted(screenshot: RemoteScreenshot, objectId: String): RequestBuilder<Drawable> {
    val encryptedFile = screenshot.encryptedScreenshot
    val metadataMap = screenshot.encryptedScreenshotMetadata
    
    if (encryptedFile != null && metadataMap != null) {
        val metadata = EncryptedMetadata.fromMap(metadataMap)
        if (metadata != null) {
            val model = EncryptedParseFile(
                parseFile = encryptedFile,
                metadata = metadata,
                cacheKey = "screenshot_$objectId"
            )
            return load(model)
        }
    }
    
    return load(screenshot.screenshot?.url)
}

// ==================== SmartDetection ====================

/**
 * Load an encrypted SmartDetection screenshot.
 * Falls back to loading unencrypted URL if no encryption data is available.
 * 
 * @param detection The SmartDetection to load
 * @return RequestBuilder that can be further configured
 */
fun RequestManager.loadEncrypted(detection: SmartDetection): RequestBuilder<Drawable> {
    if (detection.isEncrypted) {
        val encryptedFile = detection.encryptedScreenshotFile
        val metadata = detection.encryptedMetadata
        
        if (encryptedFile != null && metadata != null) {
            val model = EncryptedParseFile(
                parseFile = encryptedFile,
                metadata = metadata,
                cacheKey = "smart_detection_${detection.objectId}"
            )
            return load(model)
        }
    }
    
    // Fall back to unencrypted URL
    return load(detection.screenshot)
}

/**
 * Load an encrypted DisplayedSmartDetection screenshot.
 * Falls back to loading unencrypted URL if no encryption data is available.
 * 
 * @param detection The DisplayedSmartDetection to load
 * @return RequestBuilder that can be further configured
 */
fun RequestManager.loadEncrypted(detection: DisplayedSmartDetection): RequestBuilder<Drawable> {
    if (detection.isEncrypted) {
        val encryptedFile = detection.encryptedScreenshotFile
        val metadata = detection.encryptedMetadata
        
        if (encryptedFile != null && metadata != null) {
            val model = EncryptedParseFile(
                parseFile = encryptedFile,
                metadata = metadata,
                cacheKey = "displayed_smart_detection_${detection.objectId}"
            )
            return load(model)
        }
    }
    
    // Fall back to unencrypted URL
    return load(detection.screenshot)
}

// ==================== DetectedConversationScreenshot ====================

/**
 * Load an encrypted DetectedConversationScreenshot.
 * Falls back to loading unencrypted URL if no encryption data is available.
 * 
 * @param screenshot The DetectedConversationScreenshot to load
 * @param uniqueId A unique identifier for caching (e.g., timestamp or index)
 * @return RequestBuilder that can be further configured
 */
fun RequestManager.loadEncrypted(
    screenshot: DetectedConversationScreenshot,
    uniqueId: String
): RequestBuilder<Drawable> {
    if (screenshot.isEncrypted) {
        val encryptedFile = screenshot.encryptedScreenshotFile
        val metadata = screenshot.encryptedMetadata
        
        if (encryptedFile != null && metadata != null) {
            val model = EncryptedParseFile(
                parseFile = encryptedFile,
                metadata = metadata,
                cacheKey = "conversation_screenshot_$uniqueId"
            )
            return load(model)
        }
    }
    
    // Fall back to unencrypted URL
    return load(screenshot.screenshot)
}

// ==================== Tablet Profile Picture ====================

/**
 * Load an encrypted Tablet profile picture.
 * Falls back to loading unencrypted profile picture URL if no encryption data is available.
 * 
 * @param tablet The Tablet whose profile picture to load
 * @return RequestBuilder that can be further configured (e.g., circleCrop)
 */
fun RequestManager.loadEncryptedProfilePicture(tablet: Tablet): RequestBuilder<Drawable> {
    if (tablet.hasEncryptedProfilePicture()) {
        val encryptedFile = tablet.encryptedProfilePicture
        val metadata = tablet.encryptedProfilePictureMetadata
        
        if (encryptedFile != null && metadata != null) {
            val model = EncryptedParseFile(
                parseFile = encryptedFile,
                metadata = metadata,
                cacheKey = "profile_${tablet.objectId}"
            )
            return load(model)
        }
    }
    
    // Fall back to unencrypted profile picture
    return load(tablet.profilePicture?.url)
}

