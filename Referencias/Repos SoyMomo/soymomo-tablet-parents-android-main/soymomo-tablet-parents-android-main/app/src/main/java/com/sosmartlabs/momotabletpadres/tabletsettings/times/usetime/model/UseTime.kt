package com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.model

import java.util.*

data class UseTime(
    val id: String?,
    var days: MutableList<Int>,
    var from: Date?,
    var to: Date?,
    var limit: Int?,
    var isRange: Boolean?,
    var objectId: String?,
    var tabletObjectId: String?
)
