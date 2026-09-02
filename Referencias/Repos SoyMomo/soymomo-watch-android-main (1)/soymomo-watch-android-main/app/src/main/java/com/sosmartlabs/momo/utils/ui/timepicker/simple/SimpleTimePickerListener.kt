package com.sosmartlabs.momo.utils.ui.timepicker.simple

import com.sosmartlabs.momo.utils.CustomLocalTime

interface SimpleTimePickerListener {
    fun onTimeChanged(time: CustomLocalTime, state: String)
}