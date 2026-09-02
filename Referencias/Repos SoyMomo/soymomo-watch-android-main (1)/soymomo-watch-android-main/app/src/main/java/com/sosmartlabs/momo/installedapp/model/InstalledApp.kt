package com.sosmartlabs.momo.installedapp.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.models.Wearer

@ParseClassName("InstalledApp")
class InstalledApp : ParseObject() {
    var versionName by ParseDelegate<String>(null)
    var versionCode by ParseDelegate<Int>(null)
    var allowed by ParseDelegate<Boolean>(null)
    var installed by ParseDelegate<Boolean>(null)
    var dailyMinutesLimit by ParseDelegate<Int?>(null)
    var appName by ParseDelegate<String>(null)
    var packageName by ParseDelegate<String>(null)
    var deviceId by ParseDelegate<String>(null)
    var watch by ParseDelegate<Wearer>(null)
}