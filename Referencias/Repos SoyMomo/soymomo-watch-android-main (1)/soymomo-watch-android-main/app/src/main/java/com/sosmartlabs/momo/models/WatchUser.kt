package com.sosmartlabs.momo.models

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.watchrequests.model.UserPermission

@ParseClassName("WatchUser")
class WatchUser : ParseObject() {
    var user by ParseDelegate<ParseUser?>(null)
    var watch by ParseDelegate<Wearer?>(null)
    var active by ParseDelegate<Boolean>(null)
    var userPermission by ParseDelegate<UserPermission>(null)

    override fun equals(other: Any?): Boolean =
        other is WatchUser && other.objectId == objectId

    override fun hashCode(): Int = objectId.hashCode()
}