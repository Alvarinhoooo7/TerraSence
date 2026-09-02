package com.sosmartlabs.momo.sim.model

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate

@ParseClassName("SubscriptionPlan")
class SubscriptionPlan: ParseObject() {
    var backgroundImage by ParseDelegate<ParseFile?>(null)
    var logo by ParseDelegate<ParseFile?>(null)
    var title by ParseDelegate<String>(null)
    var price by ParseDelegate<Float>(null)
    var priceStrike by ParseDelegate<String?>(null)
    var planDescription by ParseDelegate<String>(null)
    var isActive by ParseDelegate<Boolean>(null)
    var mnoProvider by ParseDelegate<MnoProvider>(null)
    var data by ParseDelegate<String>(null)
    var calls by ParseDelegate<String>(null)
    var sms by ParseDelegate<String>(null)
    var planUrl by ParseDelegate<String>(null)
    var currency by ParseDelegate<String>(null)
    var currencyCode by ParseDelegate<String>(null)
    var backgroundImageColors by ParseDelegate<String>(null)
    var warranty by ParseDelegate<String>(null)
    var billingPeriod by ParseDelegate<String>(null)
    var planNameId by ParseDelegate<String>(null)
    var paymentProvider by ParseDelegate<PaymentProvider>(null)
    var billingPeriodType by ParseDelegate<String>(null)
    var trialDays by ParseDelegate<Int>(null)
    var isQA by ParseDelegate<Boolean?>(null)
}