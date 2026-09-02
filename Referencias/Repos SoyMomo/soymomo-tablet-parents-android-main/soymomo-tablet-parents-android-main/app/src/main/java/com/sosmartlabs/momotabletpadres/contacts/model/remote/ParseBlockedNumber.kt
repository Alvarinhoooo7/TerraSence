package com.sosmartlabs.momotabletpadres.contacts.model.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet

@ParseClassName("BlockedNumber")
class ParseBlockedNumber: ParseObject() {
    var phone by ParseDelegate<String?>(null)
    var device by ParseDelegate<ParseTablet?>(null)
}