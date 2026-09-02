package com.sosmartlabs.momo.installedapp.repository

import com.parse.ParseCloud
import com.parse.ParseException
import com.parse.ParseObject
import com.parse.ParseQuery
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.installedapp.model.InstalledApp
import com.sosmartlabs.momo.installedapp.model.InstalledAppListItem
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.watchinfo.model.database.StoreInfo
import com.sosmartlabs.momo.watchinfo.model.database.StoreInfoRepository
import timber.log.Timber
import java.util.Locale
import javax.inject.Inject

class InstalledAppRepository @Inject constructor(
    private val storeInfoRepository: StoreInfoRepository
) {

    companion object {
        private const val DEFAULT_LOCALE = "en"
        private const val CLOUD_FUNCTION_UPDATE_POLICY = "updateInstalledAppPolicy"
        private const val FIELD_WATCH = "watch"
        private const val FIELD_PACKAGE_NAME = "packageName"
        private const val FIELD_ALLOWED = "allowed"
        private const val FIELD_DAILY_MINUTES_LIMIT = "dailyMinutesLimit"
        private const val PARAM_WATCH_ID = "watchId"
        private const val PARAM_DEVICE_ID = "deviceId"

        // Only whitelisted apps should be shown in the parent app UI.
        private val MANAGED_PACKAGE_WHITELIST = setOf(
            "com.anandnet.harmonymusic",
            "com.spotify.music",
            "com.spotify.lite",
            "it.vfsfitvnm.vimusic",
            "com.sosmartlabs.watchchatspace3",
            "com.sosmartlabs.watchgallery",
            "com.sosmartlabs.watchcameraspace3",
            "com.sosmartlabs.watchstorespace3",
            "com.sosmartlabs.heysoymomo",
            "com.sosmartlabs.watchfriends",
            "com.sosmartlabs.watchvideocall",
            "com.sosmartlabs.watchreminders",
            "com.sosmartlabs.watchweather",
            "com.sosmartlabs.watchgotchi"
        )
    }

    fun getInstalledApps(watch: Wearer, locale: String): List<InstalledAppListItem> {
        val watchPointer = createWatchPointer(watch)
        lateinit var installedApps: List<InstalledApp>
        runCatching {
            installedApps = ParseQuery.getQuery(InstalledApp::class.java)
                .whereEqualTo(FIELD_WATCH, watchPointer)
                .find()
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it, "Error on get installed app list by watch")
            checkAndThrowConnectionExceptionOrException(it)
        }

        val supportsSpace4ExclusiveApps = watch.isSpace4OrNewer()
        val validApps = installedApps
            .filter { installedApp ->
                val packageName = installedApp.packageName
                packageName.isNotBlank() && packageName in MANAGED_PACKAGE_WHITELIST && installedApp.installed
            }
            .filterNot { installedApp ->
                !supportsSpace4ExclusiveApps &&
                    installedApp.packageName in Constants.SPACE4_EXCLUSIVE_PACKAGES
            }

        val storeInfoList = getStoreInfo(validApps.map { it.packageName }, locale)
        return validApps.map { installedApp ->
            mapInstalledApp(installedApp, storeInfoList, locale)
        }.sortedBy { item ->
            item.displayName.lowercase(Locale.getDefault())
        }
    }

    fun updateInstalledAppPolicy(
        watch: Wearer,
        packageName: String,
        allowed: Boolean,
        dailyMinutesLimit: Int,
        locale: String
    ): InstalledAppListItem {
        require(packageName.isNotBlank()) { "packageName is required" }
        require(dailyMinutesLimit >= 0) { "dailyMinutesLimit must be non-negative" }

        runCatching {
            val params = hashMapOf<String, Any>(
                FIELD_PACKAGE_NAME to packageName,
                FIELD_ALLOWED to allowed,
                FIELD_DAILY_MINUTES_LIMIT to dailyMinutesLimit
            )
            val watchId = watch.objectId?.takeIf { it.isNotBlank() }
            val deviceId = watch.deviceId.takeIf { it.isNotBlank() }
            when {
                watchId != null -> params[PARAM_WATCH_ID] = watchId
                deviceId != null -> params[PARAM_DEVICE_ID] = deviceId
                else -> throw IllegalArgumentException("watch.objectId or watch.deviceId is required")
            }
            ParseCloud.callFunction<Any>(CLOUD_FUNCTION_UPDATE_POLICY, params)
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it, "Error updating installed app policy")
            checkAndThrowConnectionExceptionOrException(it)
        }

        val updatedInstalledApp = getInstalledAppByPackageName(watch, packageName)
        val storeInfoList = getStoreInfo(listOf(packageName), locale)
        return mapInstalledApp(updatedInstalledApp, storeInfoList, locale)
    }

    private fun getInstalledAppByPackageName(watch: Wearer, packageName: String): InstalledApp {
        val watchPointer = createWatchPointer(watch)
        lateinit var installedApp: InstalledApp
        runCatching {
            installedApp = ParseQuery.getQuery(InstalledApp::class.java)
                .whereEqualTo(FIELD_WATCH, watchPointer)
                .whereEqualTo(FIELD_PACKAGE_NAME, packageName)
                .first
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it, "Error querying installed app by package")
            checkAndThrowConnectionExceptionOrException(it)
        }
        return installedApp
    }

    private fun getStoreInfo(packageNames: List<String>, locale: String): List<StoreInfo> {
        if (packageNames.isEmpty()) return emptyList()

        lateinit var storeInfoList: List<StoreInfo>
        runCatching {
            storeInfoList = storeInfoRepository.findAppsInfoInStore(
                packageNames = packageNames,
                locale = locale,
                defaultLocale = DEFAULT_LOCALE
            )
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it, "Error querying store info for installed apps")
            checkAndThrowConnectionExceptionOrException(it)
        }
        return storeInfoList
    }

    private fun mapInstalledApp(
        installedApp: InstalledApp,
        storeInfoList: List<StoreInfo>,
        locale: String
    ): InstalledAppListItem {
        val packageName = installedApp.packageName.orEmpty()
        val storeInfo = findStoreInfo(storeInfoList, packageName, locale)
        val fallbackName = installedApp.appName
        return InstalledAppListItem(
            packageName = packageName,
            displayName = storeInfo?.name ?: fallbackName ?: packageName,
            iconUrl = storeInfo?.image?.url,
            allowed = installedApp.allowed ?: true,
            dailyMinutesLimit = installedApp.dailyMinutesLimit ?: 0
        )
    }

    private fun findStoreInfo(
        storeInfoList: List<StoreInfo>,
        packageName: String,
        locale: String
    ): StoreInfo? {
        return storeInfoList.find { storeInfo ->
            storeInfo.packageName == packageName && storeInfo.locale == locale
        } ?: storeInfoList.find { storeInfo ->
            storeInfo.packageName == packageName && storeInfo.locale == DEFAULT_LOCALE
        }
    }

    private fun createWatchPointer(watch: Wearer): Wearer {
        val watchId = watch.objectId?.takeIf { it.isNotBlank() }
            ?: throw IllegalArgumentException("watch.objectId is required")
        return ParseObject.createWithoutData(Wearer::class.java, watchId)
    }

    private fun checkAndThrowConnectionExceptionOrException(exception: Throwable): Nothing {
        Timber.d(exception)
        if (exception is ParseException &&
            exception.code in arrayListOf(ParseException.CONNECTION_FAILED, ParseException.INVALID_JSON)
        ) {
            throw ConnectionException(exception.localizedMessage)
        }
        throw exception
    }

    class ConnectionException(message: String?) : Exception(message ?: "Parse connection error")
}
