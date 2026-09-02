package com.sosmartlabs.momo.models

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate

/**
 * @author mrg
 * @date 6/7/18
 */
@ParseClassName("WatchSettings")
class WatchSettings: ParseObject(){
    var GPSMode by ParseDelegate<Int>(null)
    var gpsFrequencySeconds by ParseDelegate<Int>(null)
    var autoAnswer by ParseDelegate<Boolean>(null)
    var soundMode by ParseDelegate<Int>(null)
    var timeZone by ParseDelegate<String>(null)
    var amPm by ParseDelegate<Boolean>(null)
    var batterySaveEnabled by ParseDelegate<Boolean>(null)
    var dialpadEnabled by ParseDelegate<Boolean>(null)
    var language by ParseDelegate<String>(null)

    var isInEurope: Boolean = false
}