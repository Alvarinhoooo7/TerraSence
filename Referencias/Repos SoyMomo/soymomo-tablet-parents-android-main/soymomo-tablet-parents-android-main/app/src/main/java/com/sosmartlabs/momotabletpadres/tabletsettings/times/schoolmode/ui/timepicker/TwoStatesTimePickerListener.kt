package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.timepicker

import java.time.LocalTime

interface TwoStatesTimePickerListener {
    fun onNewTimeStatesSelected(from: LocalTime, to: LocalTime)
}