package com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp

import com.sosmartlabs.momotabletpadres.appinfo.model.AppInfo

/**
 * Represents a Tablet installed app
 * @param appName App name displayed to user
 * @param packageName App package name
 * @param category App category
 * @param allowed Whether the app is currently allowed or not
 * @param installed Whether the app is currently installed or not
 * @param limit Time limit for the app
 * @param schoolMode Whether the app is enabled in School mode
 */
data class InstalledApp(
    var appName: String?, var packageName: String?, var category: String?,
    var allowed: Boolean?, var installed: Boolean?, var limit: Int?,
    val schoolMode: Boolean? = null, var contentRating: String? = null,
    var usageTime: Int = 0, var descriptionHtml: String? = null,
    var dugDescriptionHtml: String? = null, var saferAppAlternatives: List<AppInfo> = listOf(),
    var objectId: String?, var dugAnalysis: String?
){
    val timeLimitUsagePercentage: Int get() {
        return if (limit != 0) (usageTime * 100) / limit!! else 0
    }
}


