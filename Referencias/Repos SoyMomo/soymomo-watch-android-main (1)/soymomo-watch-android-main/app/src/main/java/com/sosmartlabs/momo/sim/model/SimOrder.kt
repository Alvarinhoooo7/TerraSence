package com.sosmartlabs.momo.sim.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate

enum class SimOrderStatus {
    PENDING,
    APPROVED,
    SHIPPED,
    CANCELLED
}

@ParseClassName("SimOrder")
class SimOrder : ParseObject() {
    var user by ParseDelegate<ParseUser>(null)
    var fullName by ParseDelegate<String>(null)
    var userPersonalId by ParseDelegate<String>(null)
    var email by ParseDelegate<String>(null)
    var phone by ParseDelegate<String>(null)
    var address by ParseDelegate<String>(null)
    var optionalAddress by ParseDelegate<String?>(null)
    var state by ParseDelegate<String>(null)
    var city by ParseDelegate<String>(null)
    var postalCode by ParseDelegate<String>(null)
    var country by ParseDelegate<String>(null)
    var campaign by ParseDelegate<SimDiscountCampaign>(null)
    var source by ParseDelegate<String>(null)
    var simPopupTracking by ParseDelegate<SimPopupTracking>(null)
    var status by ParseDelegate<String>(null)
    var isRedeemed by ParseDelegate<Boolean?>(null)

    fun setOrderStatus(orderStatus: SimOrderStatus) {
        status = when (orderStatus) {
            SimOrderStatus.PENDING -> "pending"
            SimOrderStatus.APPROVED -> "approved"
            SimOrderStatus.SHIPPED -> "shipped"
            SimOrderStatus.CANCELLED -> "cancelled"
        }
    }
}

