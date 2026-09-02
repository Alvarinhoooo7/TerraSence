package com.sosmartlabs.momotabletpadres.core.common.safewalking.model

import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.remote.ParseSafeWalkingSettings
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet

data class SafeWalkingSettings (
    var id: String,
    var objectId: String?,
    var tabletObjectId: String?,
    var isEnabled: Boolean,
    var isSoundEnabled: Boolean,
    var isVibrationEnabled: Boolean,
    var notificationType: Int
)

fun SafeWalkingSettings.toParseSafeWalkingSettings() =
    ParseObject.createWithoutData(ParseSafeWalkingSettings::class.java, objectId).apply {
        isEnabled = this@toParseSafeWalkingSettings.isEnabled
        isSoundEnabled = this@toParseSafeWalkingSettings.isSoundEnabled
        isVibrationEnabled = this@toParseSafeWalkingSettings.isVibrationEnabled
        tablet = ParseObject.createWithoutData(ParseTablet::class.java, tabletObjectId)
        notificationType = this@toParseSafeWalkingSettings.notificationType
    }