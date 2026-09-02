package com.sosmartlabs.momotabletpadres.models

import com.parse.ParseClassName
import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.ParseDelegate

@ParseClassName("Notification")
class Notification:ParseObject() {
    var tablet by ParseDelegate<ParseTablet?>()
    var isRead by ParseDelegate<Boolean?>()
    var category by ParseDelegate<NotificationCategory?>()
    var baseObjectId by ParseDelegate<String?>()

    override fun equals(other: Any?): Boolean {
        if (other !is Notification) {
            return false
        }
        return this.objectId == other.objectId && this.baseObjectId == other.baseObjectId
    }
}