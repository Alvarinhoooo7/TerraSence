package com.sosmartlabs.momo.watchrequests.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate

@ParseClassName("UserPermission")
class UserPermission: ParseObject() {
    var call by ParseDelegate<Boolean>(null)
    var videocall by ParseDelegate<Boolean>(null)
    var location by ParseDelegate<Boolean>(null)
    var edit by ParseDelegate<Boolean>(null)
    var messages by ParseDelegate<Boolean>(null)
}