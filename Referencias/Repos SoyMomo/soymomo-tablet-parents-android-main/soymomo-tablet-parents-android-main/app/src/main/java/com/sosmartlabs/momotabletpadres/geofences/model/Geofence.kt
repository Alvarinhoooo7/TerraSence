package com.sosmartlabs.momotabletpadres.geofences.model

import com.parse.ParseClassName
import com.parse.ParseGeoPoint
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate
import kotlin.math.roundToInt

@ParseClassName("Geofence")
class Geofence: ParseObject(){
    var user by ParseDelegate<ParseUser>(null)
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

    override fun toString(): String {
        return "Geofence(id=$objectId, name=$name, address=$address, " +
               "center=${center.latitude},${center.longitude}, " +
               "radius=${radius}m, enabled=$enabled)"
    }
}