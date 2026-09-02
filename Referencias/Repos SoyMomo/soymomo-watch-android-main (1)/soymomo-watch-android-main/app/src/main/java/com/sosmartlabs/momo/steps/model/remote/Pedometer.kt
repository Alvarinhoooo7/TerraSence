package com.sosmartlabs.momo.steps.model.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import java.util.*

@ParseClassName("Pedometer")
class Pedometer: ParseObject() {
    val date by ParseDelegate<Date>(null)
    val steps by ParseDelegate<Int>(null) // This is the value of how many steps we made this date (finalSteps) + how many steps we have made since the watch was created (stepZero)
    val finalSteps by ParseDelegate<Int>(null) // This is the value of how many steps we made this date
    val stepZero by ParseDelegate<Int>(null) // This is the value of how many accumulated steps we have made since the watch was created
}