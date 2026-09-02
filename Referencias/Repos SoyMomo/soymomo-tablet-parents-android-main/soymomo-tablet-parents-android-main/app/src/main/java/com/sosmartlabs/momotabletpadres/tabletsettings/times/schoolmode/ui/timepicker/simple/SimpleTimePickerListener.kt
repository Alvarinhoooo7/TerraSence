package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.timepicker.simple

import java.time.LocalTime

interface SimpleTimePickerListener {
    fun onTimeChanged(time: LocalTime, state: String)
}