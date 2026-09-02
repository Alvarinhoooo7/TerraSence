package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.applist

import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SelectableApp

interface AppListPickerListener {
    fun onNewAllowedAppsSelected(list: List<SelectableApp>)
}