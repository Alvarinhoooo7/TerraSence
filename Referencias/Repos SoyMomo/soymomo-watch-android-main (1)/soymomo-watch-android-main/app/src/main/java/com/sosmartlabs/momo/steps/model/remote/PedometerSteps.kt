package com.sosmartlabs.momo.steps.model.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.models.Wearer
import java.util.Date

@ParseClassName("PedometerSteps")
class PedometerSteps: ParseObject() {
    var date by ParseDelegate<Date>(null)
    var dateKey by ParseDelegate<String>(null)
    var steps by ParseDelegate<Float>(null)
    var wearer by ParseDelegate<Wearer>(null)
}