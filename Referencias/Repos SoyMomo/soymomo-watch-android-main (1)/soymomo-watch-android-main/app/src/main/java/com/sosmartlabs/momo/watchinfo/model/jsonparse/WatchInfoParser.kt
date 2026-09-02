package com.sosmartlabs.momo.watchinfo.model.jsonparse

import com.google.gson.GsonBuilder
import com.google.gson.JsonArray
import com.google.gson.JsonParser
import com.google.gson.JsonPrimitive
import com.sosmartlabs.momo.watchinfo.model.BuildInfo
import timber.log.Timber
import java.util.Date
import javax.inject.Inject

/**
 * Class for parsing Json objects from WatchStatus
 */
class WatchInfoParser @Inject constructor() {

    private val gson = GsonBuilder()
        .registerTypeAdapter(JsonPackageInfoListWrapper::class.java, PackageInfoDeserializer())
        .create()

    /* ------------------------- OLD  ------------------------- */
    internal fun getBuildInfo(buildInfoJson: String) =
        gson.fromJson(buildInfoJson, BuildInfo::class.java)

    internal fun getPackagesInfo(packagesInfoJson: String): List<JsonPackageInfo> =
        gson.fromJson(packagesInfoJson, JsonPackageInfoListWrapper::class.java).data

    internal fun getBuildInfoFromInfo(infoJson: String): BuildInfo {
        val info = parseInfoRaw(infoJson)
        return BuildInfo(
            codename              = "",
            fingerprint           = "",
            hardware              = "",
            radio                 = "",
            board                 = "",
            incremental           = "",
            product               = "",
            display               = "",
            sdk                   = info.sdkVersion.toString(),
            hos                   = "",
            user                  = "",
            device                = info.model,
            tags                  = "",
            model                 = info.model,
            bootloader            = "",
            cpuAbi                = "",
            cpuAbi2               = "",
            id                    = "",
            release               = info.osVersion,
            partitionNameSystem   = "",
            manufacturer          = info.manufacturer,
            brand                 = "",
            type                  = "",
            buildNumber           = info.buildNumber,
        )
    }

    internal fun getPackagesInfoFromInfo(infoJson: String): List<JsonPackageInfo> {
        val info = parseInfoRaw(infoJson)
        return info.installedApps.map { app ->
            JsonPackageInfo(
                packageName    = app.packageName,
                lastUpdateTime = Date(app.lastUpdateTime),
                versionCode    = app.versionCode,
                versionName    = app.versionName
            )
        }
    }

    private fun parseInfoRaw(infoJson: String): InfoRaw {
        val root = JsonParser.parseString(infoJson).asJsonObject
        val apps = root.get("installedApps")
        if (apps == null || apps.isJsonNull || !apps.isJsonArray) {
            // Some firmwares send installedApps as a string (sometimes a JSON-encoded array);
            // recover the array if possible, otherwise degrade to an empty list.
            val recovered = (apps as? JsonPrimitive)?.takeIf { it.isString }
                ?.let { runCatching { JsonParser.parseString(it.asString) }.getOrNull() }
                ?.takeIf { it.isJsonArray }
            if (recovered == null) {
                Timber.w("WatchStatus.info installedApps is not a JSON array (was %s); falling back to empty list",
                    apps?.javaClass?.simpleName ?: "missing")
            }
            root.add("installedApps", recovered ?: JsonArray())
        }
        return gson.fromJson(root, InfoRaw::class.java)
    }
}