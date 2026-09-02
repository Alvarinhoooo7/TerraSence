package com.sosmartlabs.momotabletpadres.models

import com.parse.ParseClassName
import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.ParseDelegate

@ParseClassName("RequestTime")
class RequestTime:ParseObject() {
    var state by ParseDelegate<String>()
    var tablet by ParseDelegate<ParseTablet?>()
    var timeToAdd by ParseDelegate<Long?>()
    var localId by ParseDelegate<String>()
}