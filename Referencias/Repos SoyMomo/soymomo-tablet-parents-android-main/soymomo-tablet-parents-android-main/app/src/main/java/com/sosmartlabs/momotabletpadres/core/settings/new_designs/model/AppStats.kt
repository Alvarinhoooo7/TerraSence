package com.sosmartlabs.momotabletpadres.core.settings.new_designs.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import java.util.*

/**
 * @author mrg
 * @date 4/6/18
 */

@ParseClassName("AppStats")
class AppStats: ParseObject() {
    var name by ParseDelegate<String?>(null)
    var appName by ParseDelegate<String?>(null)
    var packageName by ParseDelegate<String?>(null)
    var foregroundUsage by ParseDelegate<Int>(null)
    var lastTimeUsed by ParseDelegate<Date?>(null)
    var tablet by ParseDelegate<ParseTablet?>(null)
}