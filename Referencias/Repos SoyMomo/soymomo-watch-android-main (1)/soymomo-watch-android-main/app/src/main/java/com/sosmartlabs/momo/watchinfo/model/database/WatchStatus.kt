package com.sosmartlabs.momo.watchinfo.model.database

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate

/**
 * Class that represents a WatchStatus object from databse
 */
@ParseClassName("WatchStatus")
class WatchStatus: ParseObject() {

    /**
     * Id of device this status belongs
     */
    val deviceId by ParseDelegate<String>(null)

    /**
     * Build info for the device
     */
    val buildInfo by ParseDelegate<String>(null)

    /**
     * Packages info for the device
     */
    val packagesInfo by ParseDelegate<String>(null)

    val info by ParseDelegate<String>(null)
}