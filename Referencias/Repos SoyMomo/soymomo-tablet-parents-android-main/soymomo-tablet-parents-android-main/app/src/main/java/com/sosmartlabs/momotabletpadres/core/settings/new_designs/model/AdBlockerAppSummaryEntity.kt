package com.sosmartlabs.momotabletpadres.core.settings.new_designs.model

import android.graphics.drawable.Drawable
import java.util.*

/**
 * Adblocker intercepts network connections by the domain name. Domain name blocked are summarized per app.
 * this class represents the summary of the blocked domains.
 */
data class AdBlockerAppSummaryEntity(var drawableIcon: Drawable?,
                                     val packageName: String,
                                     val appName: String,
                                     val date: Date,
                                     val blockCounter: Int)
