package com.sosmartlabs.momotabletpadres.model.remote

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate

/**
 * Represents an element from AppIcon collection on Parse database
 */
@ParseClassName("AppIcon")
class ParseAppIcon: ParseObject() {
    /**
     * App package name
     */
    var packageName by ParseDelegate<String>(null)

    /**
     * App icon
     */
    var icon by ParseDelegate<ParseFile>(null)
}