package com.sosmartlabs.momotabletpadres.repositories

import com.parse.ParseException
import com.parse.ParseQuery
import com.parse.coroutines.suspendFind
import com.parse.ktx.selectKeys
import com.parse.ktx.whereContainedIn
import com.parse.ktx.whereEqualTo
import com.parse.ktx.whereExists
import com.sosmartlabs.momotabletpadres.appinfo.model.AppInfo
import com.sosmartlabs.momotabletpadres.appinfo.AppInfoRepository
import com.sosmartlabs.momotabletpadres.appinfo.model.remote.ParseAppInfo
import com.sosmartlabs.momotabletpadres.appinfo.model.remote.ParseAppInfoDataSource
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppInfoRepositoryImpl @Inject constructor(
    parseAppInfoDataSource: ParseAppInfoDataSource
) : AppInfoRepository(parseAppInfoDataSource) {

    private val appInfoMap = hashMapOf<String, MutableList<AppInfo>>()
    private val saferAlternativesMap = hashMapOf<String, List<AppInfo>>()

    override suspend fun getAppIcons(packageNames: List<String>): List<AppInfo> {
        if (packageNames.isEmpty()) return emptyList()
        
        val appInfoIcons = mutableListOf<AppInfo>()
        val notCachedPackageNames = mutableListOf<String>()

        packageNames.forEach { packageName ->
            when (val cachedInfo = appInfoMap[packageName]) {
                null -> notCachedPackageNames += packageName
                else -> appInfoIcons.addAll(cachedInfo)
            }
        }

        if (notCachedPackageNames.isEmpty()) return appInfoIcons

        CrashlyticsLog.log("Querying to get app icons with app list")
        val newAppInfo = ParseQuery.getQuery(ParseAppInfo::class.java)
            .whereContainedIn(ParseAppInfo::packageName, notCachedPackageNames)
            .whereExists(ParseAppInfo::icon)
            .selectKeys(listOf(
                ParseAppInfo::packageName,
                ParseAppInfo::icon,
                ParseAppInfo::lang,
                ParseAppInfo::country
            ))
            .setLimit(1_000)
            .orderByDescending("createdAt")
            .suspendFind()
            .distinctBy { it.packageName + it.lang + it.country }

        newAppInfo.forEach { appInfo ->
            appInfoMap.getOrPut(appInfo.packageName) { mutableListOf() }
                .add(appInfo.toAppInfo(false))
        }

        notCachedPackageNames
            .filterNot { it in newAppInfo.map { info -> info.packageName } }
            .forEach { packageName ->
                appInfoMap[packageName] = appInfoMap[packageName] ?: mutableListOf()
            }

        return appInfoIcons + newAppInfo.map { it.toAppInfo(false) }
    }

    suspend fun getAppInfo(packageName: String): List<AppInfo> {
        val cachedAppInfo = appInfoMap[packageName]?.filter {
            it.contentRating != null &&
            it.dugDescriptionHTML != null &&
            it.descriptionHTML != null &&
            it.icon != null
        }
        
        if (!cachedAppInfo.isNullOrEmpty()) return cachedAppInfo

        CrashlyticsLog.log("Querying to get app info with app list")
        val query = ParseQuery.getQuery(ParseAppInfo::class.java).apply {
            if (appInfoMap[packageName]?.isNotEmpty() == true) {
                whereContainedIn("objectId", appInfoMap[packageName]!!.map { it.objectId })
            } else {
                whereEqualTo(ParseAppInfo::packageName, packageName)
            }
        }
            .whereExists(ParseAppInfo::contentRating)
            .whereExists(ParseAppInfo::descriptionHTML)
            .whereExists(ParseAppInfo::lang)
            .whereExists(ParseAppInfo::country)
            .selectKeys(listOf(
                ParseAppInfo::packageName,
                ParseAppInfo::contentRating,
                ParseAppInfo::saferAppAlternative,
                ParseAppInfo::dugDescriptionHTML,
                ParseAppInfo::icon,
                ParseAppInfo::descriptionHTML,
                ParseAppInfo::lang,
                ParseAppInfo::country,
                ParseAppInfo::dugAnalysis
            ))

        val newAppInfo = query.suspendFind().map { it.toAppInfo(false) }

        appInfoMap.getOrPut(packageName) { mutableListOf() }.apply {
            addAll(newAppInfo.onEach { appInfo ->
                val currentAppInfo = find {
                    it.lang.equals(appInfo.lang, ignoreCase = true) &&
                    it.country.equals(appInfo.country, ignoreCase = true)
                }
                currentAppInfo?.let { remove(it) }
            })
        }

        return newAppInfo
    }

    suspend fun getAppInfoIconByPackageName(packageName: String): AppInfo? {
        Timber.d("Get app info by package name")
        appInfoMap[packageName]?.firstOrNull()?.let { return it }

        CrashlyticsLog.log("Querying to get App Info Icon by package name with app info")
        return try {
            ParseQuery(ParseAppInfo::class.java)
                .whereEqualTo(ParseAppInfo::packageName, packageName)
                .selectKeys(listOf(
                    ParseAppInfo::packageName,
                    ParseAppInfo::icon,
                    ParseAppInfo::lang,
                    ParseAppInfo::country
                ))
                .find()
                .map { it.toAppInfo(false) }
                .also { appInfoList ->
                    appInfoMap.getOrPut(packageName) { mutableListOf() }.addAll(appInfoList)
                }
                .firstOrNull()
        } catch (e: ParseException) {
            Timber.e(e.stackTraceToString())
            null
        }
    }
}