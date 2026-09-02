package com.sosmartlabs.momotabletpadres.core.common.safewalking.model

import com.sosmartlabs.momotabletpadres.tablet.model.Tablet

abstract class SafeWalkingSettingsRepositoryBase {

    abstract suspend fun getSafeWalkingSettings(tablet: Tablet): SafeWalkingSettings

    abstract suspend fun setIsEnabled(tablet: Tablet, value: Boolean): SafeWalkingSettings

    abstract suspend fun setIsSoundEnabled(tablet: Tablet, value: Boolean): SafeWalkingSettings

    abstract suspend fun setIsVibrationEnabled(tablet: Tablet, value: Boolean): SafeWalkingSettings

    abstract suspend fun setNotificationType(tablet: Tablet, value: Int): SafeWalkingSettings
}