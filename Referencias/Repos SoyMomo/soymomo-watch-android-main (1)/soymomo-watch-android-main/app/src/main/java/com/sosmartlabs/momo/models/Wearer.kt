package com.sosmartlabs.momo.models

import com.parse.*
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.firebase.FirebaseRemoteConfigRepository
import com.sosmartlabs.momo.watchcontacts.model.Contact
import timber.log.Timber
import java.util.*
import java.util.concurrent.TimeUnit
import kotlin.io.path.Path

@ParseClassName("Wearer")
class Wearer : ParseObject() {
    var deviceId by ParseDelegate<String>(null)
    var firstName by ParseDelegate<String>(null)
    var lastName by ParseDelegate<String>(null)
    var lastKnownLocation by ParseDelegate<ParseGeoPoint?>(null)
    var settings by ParseDelegate<WatchSettings>(null)
    var userInCharge by ParseDelegate<ParseUser>(null)
    var hardwareModel by ParseDelegate<String>(null)
    var batteryPercentage by ParseDelegate<Int>(null)
    var steps by ParseDelegate<Int>(null)
    var hearts by ParseDelegate<Int>(null)
    var GPSMode by ParseDelegate<Int>(null)
    var phone by ParseDelegate<String>(null)
    var imei by ParseDelegate<String>(null)
    var contacts by ParseDelegate<ParseRelation<Contact>>(null)
    var accuracy by ParseDelegate<Int>(null)
    var image by ParseDelegate<ParseFile?>(null)
    var birthday by ParseDelegate<Date>(null)
    var weight by ParseDelegate<Int?>(null)
    var height by ParseDelegate<Int?>(null)
    var watchColor by ParseDelegate<String?>(null)
    var mobileNetworkOperator by ParseDelegate<MobileNetworkOperator?>(null)
    var firstInteractionNotified by ParseDelegate<Boolean>(null)
    var lastLocationTime by ParseDelegate<Date?>(null)

    var profileModified: Boolean = false

    val model by lazy {
        when (modelInt) {
            0 -> Original
            1 -> H2OChile
            2 -> H2OSpain
            3 -> H2OEurope
            4 -> H2OChileAmPm
            5 -> Space1
            6 -> Space2
            7 -> Lite1
            8 -> Space3
            9 -> Space4
            else -> {
                Timber.w("Wearer: $deviceId unknown model int: $modelInt, defaulting to Original")
                Original
            }
        }
    }

    val modelInt: Int
        get() = if (has("model")) getInt("model") else {
            Timber.d("Wearer: $deviceId model not set, defaulting to Space 2.0 (6)")
            6 // Defaults to Space 2.0.
        }

    val showBatteryWarning: Boolean
        get() = if (has("GPSMode")) {
            when (modelInt) {
                0, 1, 2, 3, 4 -> GPSMode in 2..3
                5, 6, 7 -> GPSMode == 4
                8, 9 -> false // Space 3.0 and Space 4.0: skip GPS mode warnings
                else -> {
                    Timber.w("Wearer: $deviceId unknown model int for battery warning: $modelInt")
                    false
                }
            }
        } else {
            Timber.d("Wearer: $deviceId GPSMode not set, battery warning disabled")
            false
        }

    // Last connection state this instance logged. isConnected() runs on every card
    // bind, selector highlight, and DiffUtil content check, so it logs only when
    // the computed state changes instead of on every call.
    private var lastLoggedConnectionState: Boolean? = null

    fun isConnected(): Boolean {
        if (!has("lastTKQ")) {
            if (lastLoggedConnectionState != false) {
                lastLoggedConnectionState = false
                Timber.d("Wearer: $deviceId lastTKQ not set, considering as disconnected")
            }
            return false
        }
        val timeSinceLastTKQInMillis = System.currentTimeMillis() - getDate("lastTKQ")!!.time
        val thresholdLastTKQInMillis = TimeUnit.MINUTES.toMillis(FirebaseRemoteConfigRepository.thresholdMinutesLastTKQ)
        val isConnected = timeSinceLastTKQInMillis <= thresholdLastTKQInMillis
        if (lastLoggedConnectionState != isConnected) {
            lastLoggedConnectionState = isConnected
            Timber.d(
                "Wearer: $deviceId connection status: $isConnected (last TKQ ${TimeUnit.MILLISECONDS.toMinutes(timeSinceLastTKQInMillis)}min ago, threshold ${TimeUnit.MILLISECONDS.toMinutes(thresholdLastTKQInMillis)}min)"
            )
        }
        return isConnected
    }

    /**
     * The last check-in the backend saw, or null if the column is absent.
     *
     * This is the same value [isConnected] thresholds on, so anything shown to the user as
     * "last seen" is derived from the fact that decided they are offline in the first place.
     */
    fun lastCheckInAt(): Date? = if (has("lastTKQ")) getDate("lastTKQ") else null

    /**
     * Last reported charge, or null when the column is absent. Note this is the reading on
     * the way down, not the level now — a disconnected watch has been silent since.
     */
    fun reportedBatteryPercentage(): Int? = if (has("batteryPercentage")) batteryPercentage else null

    /**
     * Whether a disconnect should be attributed to a flat battery rather than lost signal.
     *
     * Read by the disconnected banner, the wearer card and the chat card, so that all three
     * name the same cause for the same watch — they previously disagreed, and one screen
     * could show a flat-battery icon and a no-SIM icon at the same time.
     *
     * An absent reading returns false: with no number on record there is no evidence the
     * battery died, and "it ran out of charge" is not a claim to make on a missing column.
     */
    fun ranOutOfBattery(): Boolean {
        val percentage = reportedBatteryPercentage() ?: return false
        return percentage < DEAD_BATTERY_THRESHOLD_PERCENT
    }

    fun hasVideocall(): Boolean {
        // First we check by model if the videocall capability is supported
        val model = this.model
        val modelSupportsVideoCalls = model.hasVideoCalls()
        Timber.d("Wearer: $deviceId model ${model.javaClass.simpleName} (modelInt: $modelInt) supports video calls: $modelSupportsVideoCalls")
        
        if (!modelSupportsVideoCalls) { 
            Timber.d("Wearer: $deviceId videocall capability: false (model does not support video calls)")
            return false 
        }
        
        // Second we check that the object has the necessary pushy token to receive push notifications
        val hasPushyToken = has("pushy")
        val hasVideocall = hasPushyToken
        Timber.d("Wearer: $deviceId pushy token present: $hasPushyToken")
        Timber.d("Wearer: $deviceId videocall capability: $hasVideocall (model supports: $modelSupportsVideoCalls, pushy token: $hasPushyToken)")
        return hasVideocall
    }

    fun name(): String = when {
        has("firstName") && has("lastName") -> "$firstName $lastName"
        has("firstName") -> firstName
        has("lastName") -> lastName
        has("deviceId") -> deviceId
        else -> {
            Timber.w("Wearer: $deviceId no identifying information found, using objectId")
            objectId
        }
    }

    fun imei(): String = when {
        has("imei") -> imei
        has("deviceId") -> {
            Timber.d("Wearer: $deviceId IMEI not found, using deviceId as fallback")
            deviceId
        }
        else -> {
            Timber.w("Wearer: $deviceId No IMEI or deviceId found, using objectId")
            objectId
        }
    }

    fun deviceId(): String = when {
        has("deviceId") -> deviceId
        has("imei") -> {
            Timber.d("Wearer: $deviceId DeviceId not found, using IMEI as fallback")
            imei
        }
        else -> {
            Timber.w("Wearer: $deviceId No deviceId or IMEI found, using objectId")
            objectId
        }
    }

    fun modelName(): String = when (model) {
        Original -> "SoyMomo Original"
        H2OChile, H2OChileAmPm, H2OEurope, H2OSpain -> "SoyMomo H2O"
        Space1 -> "SoyMomo Space 1.0"
        Space2 -> "SoyMomo Space 2.0"
        Space3 -> "SoyMomo Space 3.0"
        Space4 -> "SoyMomo Space 4.0"
        Lite1 -> "SoyMomo Space Lite 1.0"
        else -> {
            Timber.w("Wearer: $deviceId Unknown model: $model")
            "Unknown model"
        }
    }

    fun shortModelName(): String = when (model) {
        Original -> "Original"
        H2OChile, H2OChileAmPm, H2OEurope, H2OSpain -> "H2O"
        Space1 -> "Space 1.0"
        Space2 -> "Space 2.0"
        Space3 -> "Space 3.0"
        Space4 -> "Space 4.0"
        Lite1 -> "Space Lite 1.0"
        else -> {
            Timber.w("Wearer: $deviceId Unknown model for short name: $model")
            "Unknown model"
        }
    }

    fun hasSuccessfulFirstInteraction(): Boolean {
        if (!has("firstInteractionNotified")) {
            Timber.d("Wearer: $deviceId firstInteraction not set, returning false")
            return false
        }
        Timber.d("Wearer: $deviceId has first interaction: $firstInteractionNotified")
        return firstInteractionNotified
    }

    fun hasUnlimitedMessageLength(): Boolean {
        // Models Space 2.0 (6) and Space 3.0 (8) have unlimited message length
        return model == Space2 || model == Space3 || model == Space4
    }

    fun isSpace4OrNewer(): Boolean {
        return modelInt >= 9
    }

    fun isSpace3OrNewer(): Boolean {
        return modelInt >= 8
    }

    init {
        Timber.d("Wearer: Wearer initialized")
    }

    companion object {
        /**
         * Below this last-reported charge, a disconnect is attributed to the battery having
         * run out; at or above it the charge was healthy when the watch last checked in, so
         * the disconnect is attributed to lost signal.
         *
         * Lives on the model because more than one surface has to agree on it: the
         * disconnected banner on the main map and the wearer card underneath it both pick
         * their glyph and their copy from this split, and when they disagreed the same
         * screen showed a flat-battery icon and a no-SIM icon for one watch.
         */
        const val DEAD_BATTERY_THRESHOLD_PERCENT = 10
    }
}