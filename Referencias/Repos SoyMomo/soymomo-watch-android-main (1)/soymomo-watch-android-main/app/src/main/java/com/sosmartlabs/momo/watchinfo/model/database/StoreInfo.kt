package com.sosmartlabs.momo.watchinfo.model.database

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate

/**
 * Class that represents a WatchStatus object from database
 */
@ParseClassName("StoreInfo")
class StoreInfo: ParseObject() {
    /**
     * App name
     */
    val name by ParseDelegate<String>(null)

    /**
     * App package name
     */
    val packageName by ParseDelegate<String>(null)

    /**
     * App locale
     */
    val locale by ParseDelegate<String>(null)

    /**
     * App image
     */
    val image by ParseDelegate<ParseFile>(null)

    /**
     * App description
     */
    val description by ParseDelegate<String>(null)
}