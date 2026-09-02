package com.sosmartlabs.momo.myfriends.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.models.Wearer

/**
 * Class that represent a WatchWearer object in Parse.
 */
@ParseClassName("WatchWearer")
class WatchWearer: ParseObject() {
    /**
     * First watch
     */
    var watch1 by ParseDelegate<Wearer>(null)

    /**
     * Second watch
     */
    var watch2 by ParseDelegate<Wearer>(null)

    /**
     * Indicates if watch 1 was approved
     */
    var isWatch1Approved by ParseDelegate<Boolean>(null)

    /**
     * Indicates if watch 2 was approved
     */
    var isWatch2Approved by ParseDelegate<Boolean>(null)
}
