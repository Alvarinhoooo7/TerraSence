package com.sosmartlabs.momotabletpadres.models

import com.sosmartlabs.momotabletpadres.tablet.model.Tablet

data class MainCardTabletUser(val tablet: Tablet?) {

    val isConnected: Boolean get() = true

    /**
     * Compares the fields that actually drive the card/avatar UI so that an
     * identical backend reload (e.g. on every onResume) diffs to "no change".
     * This stops needless rebinds — avatar reloads, battery-donut redraws,
     * flicker — and preserves the selection highlight across resumes.
     */
    fun areContentsTheSame(otherCard : MainCardTabletUser) : Boolean {
        val a = tablet
        val b = otherCard.tablet
        if (a == null && b == null) return true
        if (a == null || b == null) return false
        return a.objectId == b.objectId &&
            a.profileName == b.profileName &&
            a.model == b.model &&
            a.batteryPercentage == b.batteryPercentage &&
            a.profilePicture?.url == b.profilePicture?.url &&
            a.encryptedProfilePicture?.url == b.encryptedProfilePicture?.url
    }

}
