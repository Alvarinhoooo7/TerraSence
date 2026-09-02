package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet

@ParseClassName("SchoolModeSettings")
class ParseSchoolModeSettings : ParseObject() {
    var tablet by ParseDelegate<ParseTablet?>(null)
    var localId by ParseDelegate<String?>(null)
    var enabled by ParseDelegate<Boolean?>(null)
    var from by ParseDelegate<String?>(null)
    var to by ParseDelegate<String?>(null)
    var allowedApps by ParseDelegate<String?>(null)

    // Read-side awareness for the new schedule-days field introduced by the
    // blocking & scheduling audit (P1 #7). Cloud beforeSave defaults missing
    // values to [1,1,1,1,1,0,0] (Mon..Sun, 1=active). The Android UI doesn't
    // yet expose a day picker — when one is added, coordinate the array
    // convention with iOS (which currently rotates per Calendar.firstWeekday;
    // see audit §6½.4 and P1 #16). For now: read-only.
    var days by ParseDelegate<List<Int>?>(null)

    override fun toString(): String {
        return "id $objectId - localId $localId"
    }
}