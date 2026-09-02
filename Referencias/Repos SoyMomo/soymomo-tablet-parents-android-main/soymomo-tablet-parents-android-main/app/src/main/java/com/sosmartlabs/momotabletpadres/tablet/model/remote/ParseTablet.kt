package com.sosmartlabs.momotabletpadres.tablet.model.remote

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ParseGeoPoint
import com.parse.ktx.delegates.ParseDelegate
import java.util.*

/**
 * Represents an element from Tablet collection on Parse database
 * Important: objectId is null unless Tablet Object connects to internet.
 */ //TODO("create explicit setter and getter of id. Remove ObjectId usages")
@ParseClassName("Tablet")
class ParseTablet: ParseObject() {
    var hid by ParseDelegate<String?>(null)
    var localId by ParseDelegate<String?>(null)
    var pin by ParseDelegate<String?>(null)
    var recoveryEmail by ParseDelegate<String?>(null)
    var profileName by ParseDelegate<String?>(null)
    var browserAllowed by ParseDelegate<Boolean?>(null)
    var isNotVerified by ParseDelegate<Boolean?>(null)
    var smartDetectionEnabled by ParseDelegate<Boolean?>(null)
    var remoteBlocked by ParseDelegate<Boolean?>(null)
    var autoUpdaterEnabled by ParseDelegate<Boolean?>(null)
    var profanityDetectionEnabled by ParseDelegate<Boolean?>(null)
    var unsafeSearchDetectionEnabled by ParseDelegate<Boolean?>(null)
    var moodDetectionEnabled by ParseDelegate<Boolean?>(null)
    var explicitMusicDetectionEnabled by ParseDelegate<Boolean?>(null)
    var spotifyBroadcastEnabled by ParseDelegate<Boolean?>(null)
    var inAppPaymentsEnabled by ParseDelegate<Boolean?>(null)
    var kidBirthday by ParseDelegate<Date?>(null)
    var appVersionCode by ParseDelegate<Int?>(null)
    var versionName by ParseDelegate<String?>(null)
    var model by ParseDelegate<Int?>(null)
    var color by ParseDelegate<String?>(null)
    var hardwareModel by ParseDelegate<String?>(null)
    var pushy by ParseDelegate<String?>(null)
    var batteryPercentage by ParseDelegate<Int?>(null)
    var profilePicture by ParseDelegate<ParseFile?>(null)
    var encryptedProfilePicture by ParseDelegate<ParseFile?>(null)
    var encryptedProfilePictureMetadata by ParseDelegate<Map<String, Any?>?>(null)
    var adBlockerEnabled by ParseDelegate<Boolean?>(null)
    var lastTKQ by ParseDelegate<Date?>(null)
    var currentLocation by ParseDelegate<ParseGeoPoint?>(null)
    var currentLocationTime by ParseDelegate<Date?>(null)
    var currentLocationAccuracy by ParseDelegate<Number?>(null)
    var imei by ParseDelegate<String?>(null)
    var phone by ParseDelegate<String?>(null)

    companion object {
        /**
         * Creates a reference to an existing [ParseTablet] for use in creating associations between ParseObjects.
         * Calling [isDataAvailable] on this object will return false until [fetchIfNeeded] or
         * [fetch] has been called. No network request will be made.
         * @param objectId The object id for the referenced object.
         * @return A [ParseTablet] without data.
         */
        fun createWithoutData(objectId: String): ParseTablet =
            createWithoutData(ParseTablet::class.java, objectId)
    }

    override fun toString(): String {
        return "\nTablet():\n" +
                "- hid: $hid\n" +
                "- objectId: $objectId\n" +
                "- model: $model\n" +
                "- isNotVerified :$isNotVerified\n" +
                "- pin: $pin\n" +
                "- profileName: $profileName\n" +
                "- email: $recoveryEmail\n" +
                "- smartDetectionEnabled: ${this.smartDetectionEnabled}\n" +
                "- remoteBlocked: ${this.remoteBlocked}\n" +
                "- profanityDetectionEnabled: ${this.profanityDetectionEnabled}\n" +
                "- unsafeSearchDetectionEnabled: ${this.unsafeSearchDetectionEnabled}\n" +
                "- moodDetectionEnabled: ${this.moodDetectionEnabled}\n" +
                "- explicitMusicDetectionEnabled: ${this.explicitMusicDetectionEnabled}\n" +
                "- spotifyBroadcastEnabled: ${this.spotifyBroadcastEnabled}\n" +
                "- inAppPaymentsEnabled: ${this.inAppPaymentsEnabled}\n" +
                "- createdAt: ${this.createdAt}\n" +
                "- updatedAt: ${this.updatedAt}\n" +
                "- pushyToken: ${this.pushy}\n" +
                "- adBlockerEnabled: ${this.adBlockerEnabled}\n" +
                "- color: ${this.color}\n" +
                "- batteryPercentage: ${this.batteryPercentage}\n" +
                "- lastTKQ: ${this.lastTKQ}\n" +
                "- currentLocation: ${this.currentLocation}\n" +
                "- currentLocationTime: ${this.currentLocationTime}\n" +
                "- currentLocationAccuracy: ${this.currentLocationAccuracy}" +
                "- imei: ${this.imei}\n" +
                "- phone: ${this.phone}\n"
    }
}
