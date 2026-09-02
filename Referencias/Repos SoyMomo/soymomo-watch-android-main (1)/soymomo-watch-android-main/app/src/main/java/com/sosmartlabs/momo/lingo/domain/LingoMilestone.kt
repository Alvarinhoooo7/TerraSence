package com.sosmartlabs.momo.lingo.domain

import java.util.Date

data class LingoMilestone(
    val date: Date,
    val kind: LingoMilestoneKind,
    val levelDisplayName: String,
)
