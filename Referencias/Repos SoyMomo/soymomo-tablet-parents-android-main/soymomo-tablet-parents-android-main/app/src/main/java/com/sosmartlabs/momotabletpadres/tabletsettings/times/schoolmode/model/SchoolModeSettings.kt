package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model

import java.time.LocalTime

data class SchoolModeSettings(
    var id: String,
    var objectId: String?,
    var tabletObjectId: String?,
    var enabled: Boolean,
    var from: LocalTime,
    var to: LocalTime,
    var allowedApps: List<SelectableApp>,
    /**
     * Days the school schedule applies on. Indexed Mon..Sun (Android
     * convention) — 1 = active, 0 = inactive. Null on settings written by
     * older clients; the cloud beforeSave defaults missing values to
     * Mon..Fri. UI for picking days is not yet exposed on this app; once
     * it lands, align the array convention with iOS — see
     * soymomo-tablet/docs/audits/blocking-and-scheduling-audit.md §6½.4.
     */
    var days: List<Int>? = null,
)
