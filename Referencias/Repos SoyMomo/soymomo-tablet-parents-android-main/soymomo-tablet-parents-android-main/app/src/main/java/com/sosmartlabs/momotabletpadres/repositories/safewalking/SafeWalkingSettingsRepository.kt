package com.sosmartlabs.momotabletpadres.repositories.safewalking

import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.SafeWalkingSettings
import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.SafeWalkingSettingsRepositoryBase
import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.toParseSafeWalkingSettings
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.repositories.safewalking.api.SafeWalkingSettingsParseDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SafeWalkingSettingsRepository @Inject constructor(
    private val safeWalkingSettingsParseDataSource: SafeWalkingSettingsParseDataSource
): SafeWalkingSettingsRepositoryBase() {

    override suspend fun getSafeWalkingSettings(tablet: Tablet): SafeWalkingSettings {
        return safeWalkingSettingsParseDataSource.getSafeWalkingSettings(tablet)
    }

    override suspend fun setIsEnabled(tablet: Tablet, value: Boolean): SafeWalkingSettings {
        val safeWalkingSettings = getSafeWalkingSettings(tablet)
        safeWalkingSettings.isEnabled = value
        safeWalkingSettingsParseDataSource.updateSafeWalkingSettings(safeWalkingSettings.toParseSafeWalkingSettings())
        return safeWalkingSettings
    }

    override suspend fun setIsSoundEnabled(tablet: Tablet, value: Boolean): SafeWalkingSettings {
        val safeWalkingSettings = getSafeWalkingSettings(tablet)
        safeWalkingSettings.isSoundEnabled = value
        safeWalkingSettingsParseDataSource.updateSafeWalkingSettings(safeWalkingSettings.toParseSafeWalkingSettings())
        return safeWalkingSettings
    }

    override suspend fun setIsVibrationEnabled(tablet: Tablet, value: Boolean): SafeWalkingSettings {
        val safeWalkingSettings = getSafeWalkingSettings(tablet)
        safeWalkingSettings.isVibrationEnabled = value
        safeWalkingSettingsParseDataSource.updateSafeWalkingSettings(safeWalkingSettings.toParseSafeWalkingSettings())
        return safeWalkingSettings
    }

    override suspend fun setNotificationType(tablet: Tablet, value: Int): SafeWalkingSettings {
        val safeWalkingSettings = getSafeWalkingSettings(tablet)
        safeWalkingSettings.notificationType = value
        safeWalkingSettingsParseDataSource.updateSafeWalkingSettings(safeWalkingSettings.toParseSafeWalkingSettings())
        return safeWalkingSettings
    }
}