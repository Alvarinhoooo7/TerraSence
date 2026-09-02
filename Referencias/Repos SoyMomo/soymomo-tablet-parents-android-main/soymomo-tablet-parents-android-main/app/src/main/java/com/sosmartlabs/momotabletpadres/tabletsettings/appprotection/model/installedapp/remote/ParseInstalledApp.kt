package com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet

/**
 * Represents an element from InstalledApp collection on Parse database
 */
@ParseClassName("InstalledApp")
class ParseInstalledApp: ParseObject() {
    var appName by ParseDelegate<String?>(null)
    var packageName by ParseDelegate<String?>(null)
    var category by ParseDelegate<String?>(null)
    var allowed by ParseDelegate<Boolean?>(null)
    var installed by ParseDelegate<Boolean?>(null)
    var tablet by ParseDelegate<ParseTablet?>(null)
    var limit by ParseDelegate<Int?>(null)
    var dugAnalysis by ParseDelegate<String?>(null)

    override fun toString(): String {
        return "objectId: $objectId, appName: $appName, packageName: $packageName, " +
                "category: $category, allowed: $allowed, installed: $installed, " +
                "tabletId: ${tablet?.objectId}, limit: $limit, dugAnalysis: $dugAnalysis"
    }
}