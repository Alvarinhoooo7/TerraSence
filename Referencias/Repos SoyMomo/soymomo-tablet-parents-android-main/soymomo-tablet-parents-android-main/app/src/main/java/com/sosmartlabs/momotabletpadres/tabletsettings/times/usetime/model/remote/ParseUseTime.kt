package com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.model.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet

@ParseClassName("UseTime")
class ParseUseTime:ParseObject() {
    var localId by ParseDelegate<String?>(null)
    var days by ParseDelegate<List<Int>?>(null)
    var from by ParseDelegate<String?>(null)
    var to by ParseDelegate<String?>(null)
    var limit by ParseDelegate<Int?>(null)
    var tablet by ParseDelegate<ParseTablet?>(null)
    var isRange by ParseDelegate<Boolean?>(null)

    override fun toString(): String {
        return "UseTime:\n localId: $localId objectId: $objectId days: $days\n from $from\n to $to\n limit $limit \n isRange: $isRange \n"
    }
}
