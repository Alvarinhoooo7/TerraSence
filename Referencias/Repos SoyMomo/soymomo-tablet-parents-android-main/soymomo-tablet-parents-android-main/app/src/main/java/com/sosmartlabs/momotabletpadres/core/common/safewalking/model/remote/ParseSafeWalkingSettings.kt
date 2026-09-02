package com.sosmartlabs.momotabletpadres.core.common.safewalking.model.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet

@ParseClassName("SafeWalkingSettings")
class ParseSafeWalkingSettings: ParseObject() {
    var isEnabled by ParseDelegate<Boolean?>(null)
    var notificationType by ParseDelegate<Int?>(null)
    var tablet by ParseDelegate<ParseTablet?>(null)
    var isSoundEnabled by ParseDelegate<Boolean?>(null)
    var isVibrationEnabled by ParseDelegate<Boolean?>(null)

    override fun toString(): String {
        return "objectId: $objectId, isEnabled: $isEnabled, notificationType: $notificationType, " +
               "tablet: ${tablet?.objectId}, isVibrationEnabled: $isVibrationEnabled, isSoundEnabled: $isSoundEnabled"
    }
}