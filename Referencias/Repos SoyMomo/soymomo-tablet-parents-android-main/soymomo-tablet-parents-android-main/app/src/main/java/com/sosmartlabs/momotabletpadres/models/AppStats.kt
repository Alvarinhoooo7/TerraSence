package com.sosmartlabs.momotabletpadres.models

import com.parse.ParseClassName
import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.remote.ParseInstalledApp
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.ParseDelegate
import java.util.*

/**
 * @author mrg
 * @date 4/6/18
 */

@ParseClassName("AppStats")
class AppStats: ParseObject() {
    var name by ParseDelegate<String?>()
    var appName by ParseDelegate<String?>()
    var packageName by ParseDelegate<String?>()
    var foregroundUsage by ParseDelegate<Int>()
    var lastTimeUsed by ParseDelegate<Date?>()
    var tablet by ParseDelegate<ParseTablet?>()
    var installedApp by ParseDelegate<ParseInstalledApp?>()
}