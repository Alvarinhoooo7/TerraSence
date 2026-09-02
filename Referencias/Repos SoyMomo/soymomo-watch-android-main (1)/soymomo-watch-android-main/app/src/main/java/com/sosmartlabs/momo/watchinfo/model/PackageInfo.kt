package com.sosmartlabs.momo.watchinfo.model

import java.util.*

/**
 * Package info for installed apps in phone
 * @param packageName Package name of app
 * @param name Display name of app
 * @param lastUpdateTime Last update time for the app
 * @param versionName Name for this version of the app
 * @param imageUrl Image Url for the app
 */
data class PackageInfo(val packageName: String,
                       val name: String,
                       val lastUpdateTime: Date,
                       val versionName: String,
                       val imageUrl: String?)
