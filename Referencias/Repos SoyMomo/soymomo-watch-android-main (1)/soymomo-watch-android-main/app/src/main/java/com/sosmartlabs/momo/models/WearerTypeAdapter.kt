package com.sosmartlabs.momo.models
import com.google.gson.Gson
import com.google.gson.TypeAdapter
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonWriter
import com.parse.ParseFile
import com.parse.ParseGeoPoint
import com.parse.ParseRelation
import com.parse.ParseUser
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.watchcontacts.model.Contact
import java.util.Date

data class WearerSerializable(
    var objectId: String,
    var deviceId: String,
    var firstName: String,
    var lastName: String,
    var lastKnownLocation: ParseGeoPoint?,
    var settings: WatchSettings,
    var userInCharge: ParseUser,
    var hardwareModel: String?,
    var batteryPercentage: Int,
    var steps: Int,
    var hearts: Int,
    var GPSMode: Int,
    var phone: String,
    var imei: String,
    var contacts: ParseRelation<Contact>,
    var accuracy: Int,
    var image: ParseFile?,
    var birthday: Date,
    var weight: Int?,
    var height: Int?,
    var watchColor: String?,
    var mobileNetworkOperator: MobileNetworkOperator?,
    var firstInteractionNotified: Boolean,
    var profileModified: Boolean,
)

class WearerTypeAdapter : TypeAdapter<Wearer>() {
    private val gson = Gson()

    override fun write(out: JsonWriter, wearer: Wearer) {
        val wearerSerializable = WearerSerializable(
            objectId = wearer.objectId,
            deviceId = wearer.deviceId,
            firstName = wearer.firstName,
            lastName = wearer.lastName,
            lastKnownLocation = wearer.lastKnownLocation,
            settings = wearer.settings,
            userInCharge = wearer.userInCharge,
            hardwareModel = wearer.hardwareModel,
            batteryPercentage = wearer.batteryPercentage,
            steps = wearer.steps,
            hearts = wearer.hearts,
            GPSMode = wearer.GPSMode,
            phone = wearer.phone,
            imei = wearer.imei,
            contacts = wearer.contacts,
            accuracy = wearer.accuracy,
            image = wearer.image,
            birthday = wearer.birthday,
            weight = wearer.weight,
            height = wearer.height,
            watchColor = wearer.watchColor,
            mobileNetworkOperator = wearer.mobileNetworkOperator,
            firstInteractionNotified = wearer.firstInteractionNotified,
            profileModified = wearer.profileModified,
        )
        gson.toJson(wearerSerializable, WearerSerializable::class.java, out)
    }

    override fun read(input: JsonReader): Wearer {
        val wearerSerializable = gson.fromJson<WearerSerializable>(input, WearerSerializable::class.java)

        return Wearer().apply {
            objectId = wearerSerializable.objectId
            deviceId = wearerSerializable.deviceId
            firstName = wearerSerializable.firstName
            lastName = wearerSerializable.lastName
            lastKnownLocation = wearerSerializable.lastKnownLocation
            settings = wearerSerializable.settings
            userInCharge = wearerSerializable.userInCharge
            wearerSerializable.hardwareModel?.let { hardwareModel = it }
            batteryPercentage = wearerSerializable.batteryPercentage
            steps = wearerSerializable.steps
            hearts = wearerSerializable.hearts
            GPSMode = wearerSerializable.GPSMode
            phone = wearerSerializable.phone
            imei = wearerSerializable.imei
            contacts = wearerSerializable.contacts
            accuracy = wearerSerializable.accuracy
            image = wearerSerializable.image
            birthday = wearerSerializable.birthday
            weight = wearerSerializable.weight
            height = wearerSerializable.height
            watchColor = wearerSerializable.watchColor
            mobileNetworkOperator = wearerSerializable.mobileNetworkOperator
            firstInteractionNotified = wearerSerializable.firstInteractionNotified
            profileModified = wearerSerializable.profileModified
        }
    }
}
