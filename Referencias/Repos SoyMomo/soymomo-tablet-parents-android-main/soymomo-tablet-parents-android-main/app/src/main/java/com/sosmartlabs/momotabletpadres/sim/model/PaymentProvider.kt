package com.sosmartlabs.momotabletpadres.sim.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate

@ParseClassName("PaymentProvider")
class PaymentProvider: ParseObject() {
    var name by ParseDelegate<String>(null)
    var country by ParseDelegate<String>(null)
    var stripeCustomerPortalUrl by ParseDelegate<String>(null)
}