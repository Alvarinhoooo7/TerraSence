package com.sosmartlabs.momo.sim.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate

@ParseClassName("SubscriptionsUserInfo")
class SubscriptionsUserInfo: ParseObject() {
    var name by ParseDelegate<String>(null)
    var lastname by ParseDelegate<String>(null)
    var birthday by ParseDelegate<String>(null)
    var email by ParseDelegate<String>(null)
    var optionalAddress by ParseDelegate<String?>(null)
    var address by ParseDelegate<String>(null)
    var personalId by ParseDelegate<String?>(null)
    var phone by ParseDelegate<String>(null)
    var user by ParseDelegate<ParseUser>(null)
    var country by ParseDelegate<String>(null)
    var state by ParseDelegate<String>(null)
    var city by ParseDelegate<String>(null)
    var postalCode by ParseDelegate<String?>(null)
}