package com.sosmartlabs.momo.models

import com.parse.ParseClassName
import com.parse.ParseGeoPoint
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate

@ParseClassName("UserWifi")
class UserWifi: ParseObject(){
    var accuracy by ParseDelegate<Int>(null)
    var mac by ParseDelegate<String>(null)
    var ssid by ParseDelegate<String?>(null)
    var level by ParseDelegate<Int?>(null)
    var location by ParseDelegate<ParseGeoPoint>(null)
    var user by ParseDelegate<ParseUser?>(null)
}