package com.sosmartlabs.momotabletpadres.models

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.ParseDelegate


@ParseClassName("TabletUser")
class TabletUser: ParseObject() {
    var tablet by ParseDelegate<ParseTablet>()
    var user by ParseDelegate<ParseUser>()
    var active by ParseDelegate<Boolean>()
    var isUserOfTablet by ParseDelegate<Boolean>()

    override fun toString(): String {
        return "$tablet $user $active $isUserOfTablet"
    }
}