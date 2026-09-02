package com.sosmartlabs.momotabletpadres.tablet.model

import android.os.Parcelable
import com.parse.ParseFile
import com.parse.ParseGeoPoint
import com.sosmartlabs.momotabletpadres.encryption.EncryptedMetadata
import kotlinx.parcelize.Parcelize
import java.util.Date

/**
 * Represents a Tablet and its configurations
 */
@Parcelize
data class Tablet(
    val id: String?,
    var objectId: String?,
    val hid: String?,
    val localId: String?,
    var appVersionCode: Int?,
    var versionName: String?,
    var pin: String?,
    var kidBirthday: Date?,
    var recoveryEmail: String?,
    var profileName: String?,
    var profileImagePath: String?,
    var browserAllowed: Boolean?,
    var smartDetectionEnabled: Boolean?,
    var profanityDetectionEnabled: Boolean?,
    var unsafeSearchDetectionEnabled: Boolean?,
    var moodDetectionEnabled: Boolean?,
    var explicitMusicDetectionEnabled: Boolean?,
    var spotifyBroadcastEnabled: Boolean?,
    var remoteBlocked: Boolean?,
    var inAppPaymentsEnabled: Boolean?,
    val model: TabletModel?,
    val updatedAt: Date?,
    val batteryPercentage: Int?,
    var color: String?,
    val adBlockerEnabled: Boolean,
    var profilePicture: ParseFile?,
    var encryptedProfilePicture: ParseFile? = null,
    var encryptedProfilePictureMetadata: EncryptedMetadata? = null,
    var lastTKQ: Date?,
    var currentLocation: ParseGeoPoint?,
    var currentLocationTime: Date?,
    var currentLocationAccuracy: Double?,
    var imei: String?,
    var phone: String?
): Parcelable {
    /**
     * Check if the profile picture is encrypted
     */
    fun hasEncryptedProfilePicture(): Boolean {
        return encryptedProfilePicture != null && encryptedProfilePictureMetadata != null
    }
}
