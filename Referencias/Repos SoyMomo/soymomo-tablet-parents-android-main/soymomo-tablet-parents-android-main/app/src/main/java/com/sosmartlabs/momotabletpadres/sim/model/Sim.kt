package com.sosmartlabs.momotabletpadres.sim.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.sim.model.MobileNetworkOperator

@ParseClassName("Sim")
class Sim: ParseObject() {
    var iccId by ParseDelegate<String>(null)
    var mnoProvider by ParseDelegate<MnoProvider>(null)
    var networkOperator by ParseDelegate<MobileNetworkOperator>(null)
    var paymentProvider by ParseDelegate<PaymentProvider>(null)
    var isPreInsertedInWatch by ParseDelegate<Boolean>(null)
    var imei by ParseDelegate<String>(null)
}