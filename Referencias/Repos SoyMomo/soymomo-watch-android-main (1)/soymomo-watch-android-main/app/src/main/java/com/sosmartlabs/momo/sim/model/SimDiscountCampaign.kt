package com.sosmartlabs.momo.sim.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import java.util.Date

@ParseClassName("SimDiscountCampaign")
class SimDiscountCampaign : ParseObject() {
    var mnoProvider by ParseDelegate<MnoProvider?>(null)
    var paymentProvider by ParseDelegate<PaymentProvider?>(null)
    var startDate by ParseDelegate<Date>(null)
    var endDate by ParseDelegate<Date>(null)
    var discountPeriodMonths by ParseDelegate<Int>(null)
    var discountPercentage by ParseDelegate<Float>(null)
}

