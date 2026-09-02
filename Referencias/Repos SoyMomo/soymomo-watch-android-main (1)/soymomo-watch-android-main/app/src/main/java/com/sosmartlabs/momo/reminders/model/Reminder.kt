package com.sosmartlabs.momo.reminders.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.models.Wearer

@ParseClassName("Reminder")
class Reminder : ParseObject() {
    companion object {
        val TYPE_ALERT = "Alert"
        val TYPE_TASK = "Task"
        val POSTPONE_10 = 10
        val POSTPONE_20 = 20
        val POSTPONE_30 = 30
        val POSTPONE_60 = 60
    }

    var name by ParseDelegate<String>(null)
    var requiresValidation by ParseDelegate<Boolean>(null)
    var days by ParseDelegate<List<Int>>(null)
    var from by ParseDelegate<String>(null)
    var to by ParseDelegate<String>(null)
    var hasVibration by ParseDelegate<Boolean>(null)
    var hasApplication by ParseDelegate<Boolean>(null)
    var packageName by ParseDelegate<String?>(null)
    var isValidated by ParseDelegate<Boolean>(null)
    var postponeTask by ParseDelegate<Int>(null)
    var postponeAlert by ParseDelegate<Boolean>(null)
    var notify by ParseDelegate<Boolean>(null)
    var watch by ParseDelegate<Wearer>(null)
    var type by ParseDelegate<String>(null)
    var emoji by ParseDelegate<String>(null)
    var isActive by ParseDelegate<Boolean>(null)
}