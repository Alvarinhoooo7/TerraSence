package com.sosmartlabs.momo.watchinfo.model.jsonparse

import java.util.*

/**
 * Package info for installed apps in phone
 * @param packageName Package name of app
 * @param lastUpdateTime Last update time for the app
 * @param versionCode Code for this version of the app
 * @param versionName Name for this version of the app
 */
internal data class JsonPackageInfo(val packageName: String,
                           val lastUpdateTime: Date,
                           val versionCode: Int,
                           val versionName: String)
