package com.sosmartlabs.momo.watchcontacts.model

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.models.Wearer

@ParseClassName("Contact")
class Contact : ParseObject() {
    var name by ParseDelegate<String>(null)
    var phone by ParseDelegate<String>(null)
    var sos by ParseDelegate<Boolean>(null)
    var chatEnabled by ParseDelegate<Boolean>(null)
    var picture by ParseDelegate<ParseFile?>(null)
    var position by ParseDelegate<Int>(null)
    var watch by ParseDelegate<Wearer?>(null)
}