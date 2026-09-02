package com.sosmartlabs.momotabletpadres.contacts.model.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet

@ParseClassName("PhoneContact")
class ParsePhoneContact: ParseObject() {
    var firstName by ParseDelegate<String?>(null)
    var lastName by ParseDelegate<String?>(null)
    var lookupKey by ParseDelegate<String?>(null)
    var device by ParseDelegate<ParseTablet?>(null)
    var phones by ParseDelegate<List<String?>?>(null)
    var emails by ParseDelegate<List<String?>?>(null)
}