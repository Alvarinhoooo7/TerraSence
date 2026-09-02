package com.sosmartlabs.momo.watchinfo.model.database

import com.parse.ParseQuery
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.watchinfo.model.jsonparse.JsonPackageInfo
import javax.inject.Inject

/**
 * Repository for working with StoreInfo on database
 */
class StoreInfoRepository @Inject constructor() {
    companion object {
        private const val FIELD_PACKAGE_NAME = "packageName"
        private const val FIELD_LOCALE = "locale"
    }

    /**
     * Find app information in app store
     * @param appsInfo Apps for looking on the database
     * @param locale Preferred language for app info
     * @param defaultLocale Locale for search if locale info is not available
     */
    internal fun findAppsInfoInStore(appsInfo: List<JsonPackageInfo>, locale: String,
                                     defaultLocale: String): List<StoreInfo> {
        return findAppsInfoInStore(
            appsInfo.map { it.packageName },
            locale,
            defaultLocale
        )
    }

    /**
     * Find app information in app store for a set of package names.
     * @param packageNames Package names for looking on the database
     * @param locale Preferred language for app info
     * @param defaultLocale Locale for search if locale info is not available
     */
    internal fun findAppsInfoInStore(
        packageNames: Collection<String>,
        locale: String,
        defaultLocale: String
    ): List<StoreInfo> {
        CrashlyticsLog.log("Querying to findAppsInfoInStore with list of json package")
        val distinctPackageNames = packageNames
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .distinct()
        if (distinctPackageNames.isEmpty()) {
            return emptyList()
        }

        return ParseQuery.getQuery(StoreInfo::class.java)
            .whereContainedIn(FIELD_PACKAGE_NAME, distinctPackageNames)
            .whereContainedIn(FIELD_LOCALE, listOf(locale, defaultLocale).distinct())
            .find()
    }
}
