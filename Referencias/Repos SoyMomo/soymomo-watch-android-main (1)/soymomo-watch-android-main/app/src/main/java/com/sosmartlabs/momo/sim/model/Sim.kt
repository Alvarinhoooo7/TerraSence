package com.sosmartlabs.momo.sim.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.models.Wearer

@ParseClassName("Sim")
class Sim: ParseObject() {
    var iccId by ParseDelegate<String>(null)
    var mnoProvider by ParseDelegate<MnoProvider>(null)
    var networkOperator by ParseDelegate<MobileNetworkOperator>(null)
    var paymentProvider by ParseDelegate<PaymentProvider>(null)
    var isPreInsertedInWatch by ParseDelegate<Boolean>(null)
    var isRetired by ParseDelegate<Boolean?>(null)
    var watch by ParseDelegate<Wearer>(null)
}