package com.sosmartlabs.momotabletpadres.models.entity

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate
import java.util.Date

@ParseClassName("NPSScheduler")
class NPSScheduler: ParseObject() {
    var user by ParseDelegate<ParseUser>(null)
    var startDate by ParseDelegate<Date>(null)
}