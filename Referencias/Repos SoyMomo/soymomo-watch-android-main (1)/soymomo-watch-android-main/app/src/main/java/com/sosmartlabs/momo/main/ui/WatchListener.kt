package com.sosmartlabs.momo.main.ui

import android.view.View
import com.sosmartlabs.momo.main.model.MainCardWatchUser
import com.sosmartlabs.momo.models.Wearer

interface WatchListener {
    fun onLocateWearer(objectId: String)

    fun onPerformCall(wearer: Wearer)

    fun onNoPhoneNumber(wearer: Wearer)

    fun onOpenSettings(watchUser: MainCardWatchUser, image: View, name: View)
}