package com.sosmartlabs.momotabletpadres.main.model

import com.sosmartlabs.momotabletpadres.tablet.model.Tablet

interface TabletListener {
    fun onParentControlSelected(tablet: Tablet)

    fun onProfileClicked(tablet: Tablet)

    fun onTabletAddClicked()
}