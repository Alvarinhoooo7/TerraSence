package com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp

import com.sosmartlabs.momotabletpadres.appinfo.model.AppInfo

data class InstalledAppEntity(
        var appName: String,
        var packageName: String,
        var allowed: Boolean,
        var installed: Boolean,
        var iconImageUrl: String?,
        var category: String?,
        var isChecked: Boolean,
        var limit: Int,
        var dugAnalysis: String?) {
        var usageTime: Int = 0
        var contentRating: String? = null
        var llmDescription: HashMap<String, String>? = null
        var potentialDangers: HashMap<String, String>? = null

        val timeLimitUsagePercentage: Int get() {
                return if (limit != 0) (usageTime * 100)/limit else 0
        }

        var saferAppAlternatives: List<AppInfo> = listOf()
        var dugDescriptionHtml: String? = null
        var descriptionHtml: String? = null
}