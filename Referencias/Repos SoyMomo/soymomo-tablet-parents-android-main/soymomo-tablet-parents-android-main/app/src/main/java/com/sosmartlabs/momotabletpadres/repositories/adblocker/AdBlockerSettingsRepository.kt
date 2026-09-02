package com.sosmartlabs.momotabletpadres.repositories.adblocker

import com.sosmartlabs.momotabletpadres.utils.exception.DebugExceptionHandler
import com.sosmartlabs.momotabletpadres.models.entity.AdBlockerSettingsEntity
import com.sosmartlabs.momotabletpadres.repositories.adblocker.api.AdBlockerSettingsParseAPI
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdBlockerSettingsRepository @Inject constructor(
    private val adBlockerSettingsParseAPI: AdBlockerSettingsParseAPI,
    private val tabletRepository: TabletRepository,
    private val deh: DebugExceptionHandler
) {
    fun getAdBlockerSettingsByTabletId(tabletId: String): AdBlockerSettingsEntity {
        Timber.d("getAdBlockerSettingsByTabletId: $tabletId")
        
        return adBlockerSettingsParseAPI.getByTabletId(tabletId).firstOrNull()
            ?: throw Exception("AdBlocker settings not found for tablet $tabletId")
            .also { Timber.i("getAdBlockerSettingsByTabletId: $it") }
    }
}