package com.sosmartlabs.momotabletpadres.sim.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate

@ParseClassName("PaymentUserCard")
class PaymentUserCard: ParseObject() {
    var cardId by ParseDelegate<String>(null)
    var username by ParseDelegate<String>(null)
    var country by ParseDelegate<String>(null)
    var type by ParseDelegate<String>(null)
    var brand by ParseDelegate<String>(null)
    var digits by ParseDelegate<String>(null)
}