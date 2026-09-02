package com.sosmartlabs.momo.sim.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate
import java.util.Date

/**
 * Server-side tracking for the "Upgrade Plan" promotional popup.
 *
 * One row is created each time the popup is shown. [plan] records which target
 * upgrade plan was offered (analytics/record only). Backoff is computed per
 * *user* across all rows — never scoped to [plan] — so a plan change does not
 * reset it: once the user has dismissed or tapped the CTA 3 times, it retires.
 */
@ParseClassName("UpgradePopupTracking")
class UpgradePopupTracking : ParseObject() {
    var user by ParseDelegate<ParseUser>(null)
    var subscription by ParseDelegate<Subscription>(null)
    var plan by ParseDelegate<SubscriptionPlan>(null)
    var popupShownAt by ParseDelegate<Date?>(null)
    var popupClosedAt by ParseDelegate<Date?>(null)
    var ctaClickedAt by ParseDelegate<Date?>(null)
}
