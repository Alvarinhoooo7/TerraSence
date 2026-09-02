package com.sosmartlabs.momotabletpadres.models

import com.parse.ParseClassName
import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.ParseDelegate

@ParseClassName("AdBlockerSettings")
class AdBlockerSettings: ParseObject() {
    var tablet by ParseDelegate<ParseTablet>()
//    var localId by ParseDelegate<String>() // just for tablet usage
    var enabled by ParseDelegate<Boolean>()
    var summary by ParseDelegate<String>()
}
