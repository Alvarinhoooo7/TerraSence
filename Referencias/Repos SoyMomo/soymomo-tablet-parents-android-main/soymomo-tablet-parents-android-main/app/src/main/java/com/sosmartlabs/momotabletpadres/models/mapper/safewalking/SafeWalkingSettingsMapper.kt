package com.sosmartlabs.momotabletpadres.models.mapper.safewalking

import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.SafeWalkingSettings
import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.remote.ParseSafeWalkingSettings
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SafeWalkingSettingsMapper @Inject constructor() {

    /**
     * [ParseSafeWalkingSettings] to [SafeWalkingSettings]
     */
    fun transform(safeWalkingSettings: ParseSafeWalkingSettings): SafeWalkingSettings {
        return SafeWalkingSettings(
            id = safeWalkingSettings.objectId,
            objectId = safeWalkingSettings.objectId,
            tabletObjectId = safeWalkingSettings.tablet?.objectId,
            isEnabled = safeWalkingSettings.isEnabled!!,
            isSoundEnabled = safeWalkingSettings.isSoundEnabled!!,
            isVibrationEnabled =safeWalkingSettings.isVibrationEnabled!!,
            notificationType = safeWalkingSettings.notificationType!!
        )
    }
}