package com.sosmartlabs.momo.utils.ui.timepicker

import com.sosmartlabs.momo.utils.CustomLocalTime

interface TwoStatesTimePickerListener {
    fun onNewTimeStatesSelected(from: CustomLocalTime, to: CustomLocalTime)
}