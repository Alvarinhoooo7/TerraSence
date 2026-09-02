package com.sosmartlabs.momotabletpadres.models.entity

import java.util.*

/**
 * Adblocker intercepts network connections by the domain name. Domain name blocked are summarized per app.
 * this class represents the summary of the blocked domains.
 */
data class AdBlockerAppSummaryEntity(val packageName: String,
                                     val appName: String,
                                     val date: Date,
                                     val blockCounter: Int)
