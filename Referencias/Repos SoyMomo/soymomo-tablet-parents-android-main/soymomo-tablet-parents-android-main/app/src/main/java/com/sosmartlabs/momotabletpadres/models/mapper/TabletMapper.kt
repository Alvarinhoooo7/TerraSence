package com.sosmartlabs.momotabletpadres.models.mapper

import android.os.Build
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.core.common.utils.TabletModelUtils
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TabletMapper @Inject constructor(
    val tabletModelUtils: TabletModelUtils
) {

    companion object {

        /**
         * Converts a domain [Tablet] to a [ParseTablet] for **write/update operations only**.
         *
         * **Important:** This method may use [ParseTablet.createWithoutData] when the tablet has an
         * existing objectId, which creates a Parse pointer without fetched data. The returned
         * [ParseTablet] may have [ParseTablet.isDataAvailable] == false for pointer-related fields.
         *
         * **Do NOT use this method for UI read flows** where you need to access fields like
         * `profilePicture`, `profileName`, etc. For UI consumption, use hydrated [ParseTablet]
         * instances obtained from Parse queries with `.include("tablet")`.
         *
         * @param newTablet The domain Tablet to convert.
         * @return A [ParseTablet] suitable for save/update operations.
         */
        fun toParseTablet(newTablet: Tablet): ParseTablet {
            val objectIdInCache = newTablet.objectId
            val parseTablet: ParseTablet = if (!objectIdInCache.isNullOrEmpty() && objectIdInCache != "") {
                ParseTablet.createWithoutData(objectIdInCache)
            } else {
                ParseTablet()
            }

            with(newTablet) {
                parseTablet.let {
                    it.localId = id
                    it.hid = hid
                    it.profileName = profileName
                    it.recoveryEmail = recoveryEmail
                    it.kidBirthday = kidBirthday
                    it.pin = pin
                    it.smartDetectionEnabled = smartDetectionEnabled
                    it.profanityDetectionEnabled = profanityDetectionEnabled
                    it.unsafeSearchDetectionEnabled = unsafeSearchDetectionEnabled
                    it.moodDetectionEnabled = moodDetectionEnabled
                    it.explicitMusicDetectionEnabled = explicitMusicDetectionEnabled
                    it.spotifyBroadcastEnabled = spotifyBroadcastEnabled
                    it.remoteBlocked = remoteBlocked
                    it.browserAllowed = browserAllowed
                    it.appVersionCode = appVersionCode
                    it.versionName = versionName
                    it.hardwareModel = Build.MODEL
                    it.put("hardwareBrand", Build.BRAND)
                    it.put("hardwareManufacturer", Build.MANUFACTURER)
                    it.put("isNotVerified", true)
                    it.put("autoUpdaterEnabled", true)
                    it.batteryPercentage = batteryPercentage
                    it.adBlockerEnabled = adBlockerEnabled
                    it.profilePicture = profilePicture
                    it.lastTKQ = lastTKQ
                    it.currentLocation = currentLocation
                    it.currentLocationTime = currentLocationTime
                    it.currentLocationAccuracy = currentLocationAccuracy
                    it.imei = imei
                    it.phone = phone
                }
            }

            return parseTablet
        }

        /**
         * [Tablet] to [Map<String, Any?>]
         */
        fun toHashMap(newTablet: Tablet, withImportantInfo: Boolean = true): MutableMap<String, Any> {
            Timber.d("toHashMap: $newTablet")
            with (newTablet) {
                val parameters = mutableMapOf<String, Any>(
                    "localId" to localId!!,
                    "hid" to hid!!,
                    "smartDetectionEnabled" to (smartDetectionEnabled?: false),
                    "profanityDetectionEnabled" to (profanityDetectionEnabled?: false),
                    "unsafeSearchDetectionEnabled" to (unsafeSearchDetectionEnabled?: false),
                    "moodDetectionEnabled" to (moodDetectionEnabled?: false),
                    "explicitMusicDetectionEnabled" to (explicitMusicDetectionEnabled?: false),
                    "spotifyBroadcastEnabled" to (spotifyBroadcastEnabled?: false),
                    "remoteBlocked" to (remoteBlocked?: false),
                    "browserAllowed" to (browserAllowed?: false),
                    "inAppPaymentsEnabled" to (inAppPaymentsEnabled?: false),
                    "isNotVerified" to true,
                    "autoUpdaterEnabled" to true,
                    "batteryPercentage" to (batteryPercentage?: 0),
                    "adBlockerEnabled" to adBlockerEnabled,
                    "imei" to (imei ?: ""),
                    "phone" to (phone ?: ""),
                )

                objectId?.let{parameters["objectId"] = it}
                kidBirthday?.let{parameters["kidBirthday"] = it}

                if (withImportantInfo) {
                    recoveryEmail?.let{parameters["recoveryEmail"] = it}
                    pin?.let{parameters["pin"] = it}
                    profileName?.let{parameters["profileName"] = it}
                }

                return parameters
            }
        }
    }
}