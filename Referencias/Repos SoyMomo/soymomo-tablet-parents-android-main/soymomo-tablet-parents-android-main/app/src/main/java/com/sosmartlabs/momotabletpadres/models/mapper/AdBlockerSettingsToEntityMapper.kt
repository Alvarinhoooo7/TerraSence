package com.sosmartlabs.momotabletpadres.models.mapper

import com.sosmartlabs.momotabletpadres.models.AdBlockerSettings
import com.sosmartlabs.momotabletpadres.models.entity.AdBlockerSettingsEntity
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdBlockerSettingsToEntityMapper @Inject constructor() {

    /**
     * [AdBlockerSettings] to [AdBlockerSettingsEntity]
     */
    fun transform(adBlockerSettings: AdBlockerSettings): AdBlockerSettingsEntity {
        return AdBlockerSettingsEntity(
                enabled = adBlockerSettings.enabled,
                summary = adBlockerSettings.summary,
                id = adBlockerSettings.objectId,
                tabletId = adBlockerSettings.tablet.objectId!!
        )
    }
}