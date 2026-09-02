package com.sosmartlabs.momotabletpadres.locationhistory.model.remote

import com.parse.ParseClassName
import com.parse.ParseGeoPoint
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import java.util.Date

@ParseClassName("LocationHistory")
class ParseLocationHistory : ParseObject() {
    var tablet by ParseDelegate<ParseTablet?>(null)
    var location by ParseDelegate<ParseGeoPoint?>(null)
    var accuracy by ParseDelegate<Int?>(null)
    var battery by ParseDelegate<Int?>(null)
    var provider by ParseDelegate<String?>(null)
    var time by ParseDelegate<Date?>(null)

    override fun toString(): String {
        return "ParseLocationHistory(" +
                "tablet=${tablet?.objectId}, " +
                "location=(${location?.latitude}, ${location?.longitude}), " +
                "accuracy=$accuracy, " +
                "battery=$battery%, " +
                "provider=$provider, " +
                "time=$time)"
    }
}