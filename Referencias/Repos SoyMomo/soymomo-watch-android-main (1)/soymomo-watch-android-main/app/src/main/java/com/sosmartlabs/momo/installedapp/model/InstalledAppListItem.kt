package com.sosmartlabs.momo.installedapp.model

data class InstalledAppListItem(
    val packageName: String,
    val displayName: String,
    val iconUrl: String?,
    val allowed: Boolean,
    val dailyMinutesLimit: Int
) {
    val hasDailyLimit: Boolean
        get() = dailyMinutesLimit > 0
}
