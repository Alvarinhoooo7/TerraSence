package com.sosmartlabs.momo.geofences.model

import com.parse.ParseClassName
import com.parse.ParseGeoPoint
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import kotlin.math.roundToInt

@ParseClassName("Geofence")
class Geofence: ParseObject(){
    var center by ParseDelegate<ParseGeoPoint>(null)
    var name by ParseDelegate<String>(null)
    var enabled by ParseDelegate<Boolean>(null)
    var address by ParseDelegate<String>(null)

    var radius: Int
        get() {
            return (getDouble("radiusInKm") * 1000).roundToInt()
        }
        set(value) {
            put("radiusInKm", value / 1000.0)
        }

    fun isNew(): Boolean = (objectId == null)
}