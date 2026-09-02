package com.sosmartlabs.momo.watchinfo.model.jsonparse

internal data class InfoRaw(
    val deviceId:        String,
    val manufacturer:    String,
    val model:           String,
    val osVersion:       String,
    val sdkVersion:      Int,
    val buildNumber:     String,
    val networkType:     String,
    val carrier:         String?,
    val batteryStatus:   String?,
    val installedApps:   List<InfoApp>
)

/** Same fields you need later inside JsonPackageInfo        */
internal data class InfoApp(
    val packageName:     String,
    val lastUpdateTime:  Long,
    val versionName:     String,
    val versionCode:     Int,
    val isSystemApp:     Boolean
)