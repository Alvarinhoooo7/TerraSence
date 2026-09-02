package com.sosmartlabs.momo.watchsettings.model

import com.parse.coroutines.suspendFetch
import com.parse.coroutines.suspendFetchIfNeeded
import com.parse.coroutines.suspendSave
import com.sosmartlabs.momo.models.WatchSettings
import com.sosmartlabs.momo.models.Wearer
import javax.inject.Inject

class SettingsRepository @Inject constructor() {
    suspend fun fetchWatchSettings(watch: Wearer): WatchSettings {
        return watch.settings.suspendFetch()
    }

    suspend fun fetchWatchSettingsIfNeeded(watch: Wearer): WatchSettings {
        return watch.settings.suspendFetchIfNeeded()
    }

    suspend fun updateWatchSettings(settings: WatchSettings) {
        with(settings) {
            if (isDirty) suspendSave()
        }
    }

    fun revertWatchSettings(settings: WatchSettings) {
        settings.revert()
    }
}