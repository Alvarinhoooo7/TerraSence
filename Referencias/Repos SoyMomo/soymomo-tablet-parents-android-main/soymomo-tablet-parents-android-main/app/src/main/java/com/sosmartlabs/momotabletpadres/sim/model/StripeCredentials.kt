package com.sosmartlabs.momotabletpadres.sim.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate
import java.util.*
import kotlin.collections.HashMap

@ParseClassName("StripeCredentials")
class StripeCredentials: ParseObject() {
    var stripeCustomerId by ParseDelegate<String>(null)
    var stripeSubscriptionId by ParseDelegate<String>(null)
    var iccId by ParseDelegate<String>(null)
    var subscriptionStatus by ParseDelegate<String>(null)
    var stripeSubscriptionData by ParseDelegate<HashMap<Any, Any>>(null)
    var country by ParseDelegate<String>(null)
    var sim by ParseDelegate<Sim>(null)
    var user by ParseDelegate<ParseUser>(null)
}