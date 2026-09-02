package com.sosmartlabs.momotabletpadres.models

import com.parse.ParseClassName
import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.remote.ParseInstalledApp
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.ParseDelegate

@ParseClassName("RequestTimeApp")
class RequestTimeApp:ParseObject() {
    var state by ParseDelegate<String>()
    var tablet by ParseDelegate<ParseTablet?>()
    var app by ParseDelegate<ParseInstalledApp?>()
    var timeToAdd by ParseDelegate<Long?>()
    var timeToLive by ParseDelegate<Long?>()
    var localId by ParseDelegate<String>()
}