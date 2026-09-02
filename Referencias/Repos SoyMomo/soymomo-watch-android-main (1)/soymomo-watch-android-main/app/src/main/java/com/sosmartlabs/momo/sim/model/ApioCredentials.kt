package com.sosmartlabs.momo.sim.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate

@ParseClassName("ApioCredentials")
class ApioCredentials: ParseObject() {
    var iccId by ParseDelegate<String>(null)
    var country by ParseDelegate<String>(null)
    var user by ParseDelegate<ParseUser>(null)
    var sim by ParseDelegate<Sim>(null)
    var apioCustomerId by ParseDelegate<String>(null)
    var apioSubscriptionId by ParseDelegate<String>(null)
    var apioSubscriptionStatus by ParseDelegate<String>(null)
    var apioSubscriptionData by ParseDelegate<HashMap<Any, Any>>(null)
}