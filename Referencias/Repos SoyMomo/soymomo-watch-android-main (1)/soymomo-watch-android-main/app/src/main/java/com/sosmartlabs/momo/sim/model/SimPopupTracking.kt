package com.sosmartlabs.momo.sim.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.models.Wearer
import java.util.Date

@ParseClassName("SimPopupTracking")
class SimPopupTracking : ParseObject() {
    var user by ParseDelegate<ParseUser>(null)
    var watch by ParseDelegate<Wearer>(null)
    var country by ParseDelegate<String>(null)
    var campaign by ParseDelegate<SimDiscountCampaign>(null)
    var sessionId by ParseDelegate<String>(null)
    var popupShownAt by ParseDelegate<Date?>(null)
    var popupClosedAt by ParseDelegate<Date?>(null)
    var ctaClickedAt by ParseDelegate<Date?>(null)
    var formCompletedAt by ParseDelegate<Date?>(null)
}

