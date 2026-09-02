package com.sosmartlabs.momotabletpadres.appinfo

import com.sosmartlabs.momotabletpadres.appinfo.model.AppInfo
import com.sosmartlabs.momotabletpadres.appinfo.model.remote.ParseAppInfo
import com.sosmartlabs.momotabletpadres.appinfo.model.remote.ParseAppInfoDataSource
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
open class AppInfoRepository @Inject constructor(
    protected val parseAppInfoDataSource: ParseAppInfoDataSource
) {
    private val saferAppAlternatives = mutableMapOf<String, List<AppInfo>>()

    open suspend fun getAppInfo(packageName: String, loadSaferAlternatives: Boolean = false): AppInfo? {
        Timber.d("AppInfoRepository: getAppInfo - Start, packageName: $packageName, loadSaferAlternatives: $loadSaferAlternatives")
        return try {
            val parseAppInfoList = parseAppInfoDataSource.getParseAppInfoByPackageNames(
                listOf(packageName),
                ParseAppInfo::packageName, ParseAppInfo::contentRating,
                ParseAppInfo::saferAppAlternative, ParseAppInfo::dugDescriptionHTML, ParseAppInfo::icon,
                ParseAppInfo::descriptionHTML, ParseAppInfo::lang, ParseAppInfo::country, ParseAppInfo::dugAnalysis
            )
            Timber.d("AppInfoRepository: getAppInfo - Fetched ${parseAppInfoList.size} ParseAppInfo objects from data source")

            val localizedAppInfo = findLocalizedAppInfo(parseAppInfoList.map { it.toAppInfo(false) })
            Timber.d("AppInfoRepository: getAppInfo - Localized AppInfo: ${localizedAppInfo?.objectId}")

            if (!loadSaferAlternatives) {
                Timber.d("AppInfoRepository: getAppInfo - Returning AppInfo without safer alternatives")
                localizedAppInfo
            } else {
                val safer = parseAppInfoList.find { it.objectId == localizedAppInfo?.objectId }?.toAppInfo(true)
                Timber.d("AppInfoRepository: getAppInfo - Returning AppInfo with safer alternatives: ${safer?.objectId}")
                safer
            }
        } catch (e: Exception) {
            Timber.e(e, "AppInfoRepository: getAppInfo - Error fetching AppInfo for $packageName")
            CrashlyticsLog.recordNonFatalError(e, "AppInfoRepository: Exception in getAppInfo for $packageName, loadSaferAlternatives=$loadSaferAlternatives")
            null
        }
    }

    open suspend fun getAppIcons(packageNames: List<String>): List<AppInfo> {
        Timber.d("AppInfoRepository: getAppIcons - Start, packageNames: $packageNames")
        return try {
            val parseAppInfoList = parseAppInfoDataSource.getParseAppInfoByPackageNames(
                packageNames,
                ParseAppInfo::packageName, ParseAppInfo::icon, ParseAppInfo::lang, ParseAppInfo::country, ParseAppInfo::title
            )
            Timber.d("AppInfoRepository: getAppIcons - Fetched ${parseAppInfoList.size} ParseAppInfo objects from data source")

            val filteredList = parseAppInfoList.filter { it.icon != null && it.title != null }
            Timber.d("AppInfoRepository: getAppIcons - Filtered to ${filteredList.size} with icon and title")

            val appInfoList = filteredList.map { it.toAppInfo(false) }
            Timber.d("AppInfoRepository: getAppIcons - Mapped to AppInfo list of size ${appInfoList.size}")

            val result = packageNames.mapNotNull { packageName ->
                val localized = findLocalizedAppInfo(appInfoList.filter { it.packageName == packageName })
                if (localized == null) {
                    Timber.w("AppInfoRepository: getAppIcons - No localized AppInfo found for packageName: $packageName")
                }
                localized
            }
            Timber.d("AppInfoRepository: getAppIcons - Returning ${result.size} AppInfo objects")
            result
        } catch (e: Exception) {
            Timber.e(e, "AppInfoRepository: getAppIcons - Error fetching AppIcons for $packageNames")
            CrashlyticsLog.recordNonFatalError(e, "AppInfoRepository: Exception in getAppIcons for $packageNames")
            emptyList()
        }
    }

    protected fun findLocalizedAppInfo(appInfoList: List<AppInfo>): AppInfo? {
        Timber.d("AppInfoRepository: findLocalizedAppInfo - Start, appInfoList size: ${appInfoList.size}")
        if (appInfoList.isEmpty()) {
            Timber.w("AppInfoRepository: findLocalizedAppInfo - Empty appInfoList, returning null")
            return null
        }
        val localeDefault = Locale.getDefault()
        val localeUS = Locale.US
        val result = getAppInfoWithLocale(appInfoList, localeDefault)
            ?: getAppInfoWithLocale(appInfoList, localeUS)
            ?: appInfoList[0]
        Timber.d("AppInfoRepository: findLocalizedAppInfo - Returning AppInfo with objectId: ${result.objectId}")
        return result
    }

    private fun getAppInfoWithLocale(appInfoList: List<AppInfo>, locale: Locale): AppInfo? {
        Timber.d("AppInfoRepository: getAppInfoWithLocale - Start, locale: $locale, appInfoList size: ${appInfoList.size}")
        val languageFilteredApp = appInfoList.filter { it.lang.equals(locale.language, ignoreCase = true) }
        Timber.d("AppInfoRepository: getAppInfoWithLocale - languageFilteredApp size: ${languageFilteredApp.size}")
        if (languageFilteredApp.isNotEmpty()) {
            val countryMatch = languageFilteredApp.find { it.country.equals(locale.country, ignoreCase = true) }
            if (countryMatch != null) {
                Timber.d("AppInfoRepository: getAppInfoWithLocale - Found country match: ${countryMatch.objectId}")
                return countryMatch
            }
            if (locale.language.equals("es", ignoreCase = true) && !locale.country.equals("ES", ignoreCase = true)) {
                val notSpain = languageFilteredApp.find { !it.country.equals("es", true) }
                if (notSpain != null) {
                    Timber.d("AppInfoRepository: getAppInfoWithLocale - Found non-Spain Spanish: ${notSpain.objectId}")
                    return notSpain
                }
            }
            Timber.d("AppInfoRepository: getAppInfoWithLocale - Returning first languageFilteredApp: ${languageFilteredApp[0].objectId}")
            return languageFilteredApp[0]
        }
        Timber.d("AppInfoRepository: getAppInfoWithLocale - No language match for locale: $locale")
        return null
    }

    suspend fun getSaferAlternatives(appInfo: AppInfo): List<AppInfo> {
        Timber.d("AppInfoRepository: getSaferAlternatives - Start, appInfo.objectId: ${appInfo.objectId}")
        return getSaferAlternatives(appInfo.objectId!!)
    }

    private suspend fun getSaferAlternatives(appInfoId: String): List<AppInfo> {
        Timber.d("AppInfoRepository: getSaferAlternatives (private) - Start, appInfoId: $appInfoId")
        if (saferAppAlternatives.containsKey(appInfoId)) {
            Timber.d("AppInfoRepository: getSaferAlternatives (private) - Found in cache, returning cached list")
            return saferAppAlternatives[appInfoId]!!
        }
        return try {
            val alternatives = parseAppInfoDataSource.getAppSaferAlternatives(appInfoId)
                .map { it.toAppInfo(false) }
            Timber.d("AppInfoRepository: getSaferAlternatives (private) - Loaded ${alternatives.size} alternatives from data source")
            saferAppAlternatives[appInfoId] = alternatives
            alternatives
        } catch (e: Exception) {
            Timber.e(e, "AppInfoRepository: getSaferAlternatives (private) - Error fetching safer alternatives for $appInfoId")
            CrashlyticsLog.recordNonFatalError(e, "AppInfoRepository: Exception in getSaferAlternatives for $appInfoId")
            emptyList()
        }
    }

    suspend fun requestDugAnalysis(packageName: String): List<AppInfo> {
        Timber.d("AppInfoRepository: requestDugAnalysis - Start, packageName: $packageName")
        return try {
            val result = parseAppInfoDataSource.requestDugAnalysis(packageName)
                .map { it.toAppInfo(false) }
            Timber.d("AppInfoRepository: requestDugAnalysis - Loaded ${result.size} AppInfo from dug analysis")
            result
        } catch (e: Exception) {
            Timber.e(e, "AppInfoRepository: requestDugAnalysis - Error requesting dug analysis for $packageName")
            CrashlyticsLog.recordNonFatalError(e, "AppInfoRepository: Exception in requestDugAnalysis for $packageName")
            emptyList()
        }
    }

    protected suspend fun ParseAppInfo.toAppInfo(loadSaferAlternatives: Boolean): AppInfo {
        Timber.d("AppInfoRepository: toAppInfo - Start, objectId: $objectId, loadSaferAlternatives: $loadSaferAlternatives")
        val saferAlternatives: List<AppInfo> = if (loadSaferAlternatives) {
            Timber.d("AppInfoRepository: toAppInfo - Loading safer alternatives for objectId: $objectId")
            try {
                getSaferAlternatives(objectId!!)
            } catch (e: Exception) {
                Timber.e(e, "AppInfoRepository: toAppInfo - Error loading safer alternatives for $objectId")
                CrashlyticsLog.recordNonFatalError(e, "AppInfoRepository: Exception in toAppInfo safer alternatives for $objectId")
                emptyList()
            }
        } else {
            emptyList()
        }
        val appInfo = AppInfo(
            objectId = objectId,
            lang = if (has("lang")) lang else null,
            country = if (has("country")) country else null,
            screenshots = if (has("screenshots")) screenshots!! else listOf(),
            title = if (has("title")) title else null,
            description = if (has("description")) description else null,
            descriptionHTML = if (has("descriptionHTML")) descriptionHTML else null,
            summary = if (has("summary")) summary else null,
            installs = if (has("installs")) installs else null,
            scoreText = if (has("scoreText")) scoreText else null,
            currency = if (has("currency")) currency else null,
            free = if (has("free")) free else null,
            size = if (has("size")) size else null,
            offersIAP = if (has("offersIAP")) offersIAP else null,
            androidVersion = if (has("androidVersion")) androidVersion else null,
            androidVersionText = if (has("androidVersionText")) androidVersionText else null,
            IAPRange = if (has("IAPRange")) IAPRange else null,
            developerId = if (has("developerId")) developerId else null,
            developerEmail = if (has("developerEmail")) developerEmail else null,
            developerWebsite = if (has("developerWebsite")) developerWebsite else null,
            developer = if (has("developer")) developer else null,
            privacyPolicy = if (has("privacyPolicy")) privacyPolicy else null,
            developerInternalID = if (has("developerInternalID")) developerInternalID else null,
            genre = if (has("genre")) genre else null,
            developerAddress = if (has("developerAddress")) developerAddress else null,
            familyGenre = if (has("familyGenre")) familyGenre else null,
            familyGenreId = if (has("familyGenreId")) familyGenreId else null,
            icon = if (has("icon")) icon else null,
            headerImage = if (has("headerImage")) headerImage else null,
            videoImage = if (has("videoImage")) videoImage else null,
            contentRating = if (has("contentRating")) contentRating else null,
            contentRatingDescription = if (has("contentRatingDescription")) contentRatingDescription else null,
            video = if (has("video")) video else null,
            released = if (has("released")) released else null,
            version = if (has("version")) version else null,
            adSupported = if (has("adSupported")) adSupported else null,
            editorsChoice = if (has("editorsChoice")) editorsChoice else null,
            appId = if (has("appId")) appId else null,
            url = if (has("url")) url else null,
            recentChanges = if (has("recentChanges")) recentChanges else null,
            packageName = if (has("packageName")) packageName else null,
            dugDescriptionHTML = if (has("dugDescriptionHTML")) dugDescriptionHTML else null,
            dugAnalysis = if (has("dugAnalysis")) dugAnalysis else null,
            saferAppAlternative = saferAlternatives
        )
        Timber.d("AppInfoRepository: toAppInfo - Returning AppInfo with objectId: ${appInfo.objectId}")
        return appInfo
    }
}