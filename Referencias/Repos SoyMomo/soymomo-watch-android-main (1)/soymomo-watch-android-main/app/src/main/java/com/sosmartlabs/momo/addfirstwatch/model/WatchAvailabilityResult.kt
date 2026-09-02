package com.sosmartlabs.momo.addfirstwatch.model

data class WatchAvailabilityResult(
    val status: WatchAvailabilityStatus,
    val adminInfo: WatchAdminInfo? = null
)
