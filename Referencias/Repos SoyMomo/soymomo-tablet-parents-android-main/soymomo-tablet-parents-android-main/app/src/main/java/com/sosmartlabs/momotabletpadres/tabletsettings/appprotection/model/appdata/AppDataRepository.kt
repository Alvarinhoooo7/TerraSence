package com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata

import com.parse.ParseException
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.remote.ParseAppData
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.remote.ParseAppDataDataSource
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppDataRepository @Inject constructor(
    private val appDataDataSource: ParseAppDataDataSource
) {

    private val appDataCache = ConcurrentHashMap<String, ParseAppData>()

    /**
     * Fetches app data for a list of package names, using cache when possible.
     * Returns a list of ParseAppData objects, combining cached and newly fetched data.
     */
    suspend fun getAppData(packageNames: List<String>): List<ParseAppData> {
        Timber.d("AppDataRepository: getAppData - Called for ${packageNames.size} package names: $packageNames")

        val cachedApps = mutableListOf<ParseAppData>()
        val packagesToFetch = mutableListOf<String>()

        for (packageName in packageNames) {
            val cached = appDataCache[packageName]
            if (cached != null) {
                Timber.v("AppDataRepository: getAppData - Cache hit for package: $packageName")
                cachedApps.add(cached)
            } else {
                Timber.v("AppDataRepository: getAppData - Cache miss for package: $packageName, will fetch from data source")
                packagesToFetch.add(packageName)
            }
        }

        if (packagesToFetch.isEmpty()) {
            Timber.d("AppDataRepository: getAppData - All apps found in cache, returning ${cachedApps.size} apps")
            return cachedApps
        }

        Timber.d("AppDataRepository: getAppData - Fetching ${packagesToFetch.size} apps from data source: $packagesToFetch")
        val fetchedApps = try {
            appDataDataSource.getAppData(packagesToFetch)
        } catch (e: Exception) {
            Timber.e(e, "AppDataRepository: getAppData - Error fetching app data from data source for packages: $packagesToFetch")
            CrashlyticsLog.recordNonFatalError(e, "AppDataRepository: Exception in getAppData(packages=$packagesToFetch)")
            Timber.d("AppDataRepository: getAppData - Returning only cached apps (${cachedApps.size}) due to error")
            return cachedApps
        }

        for (appData in fetchedApps) {
            val pkg = appData.packageName
            if (pkg != null) {
                appDataCache[pkg] = appData
                Timber.v("AppDataRepository: getAppData - Cached fetched app data for package: $pkg")
            } else {
                Timber.w("AppDataRepository: getAppData - Fetched app data missing packageName, skipping cache")
                CrashlyticsLog.log("AppDataRepository: getAppData - Fetched app data missing packageName, skipping cache")
            }
        }

        Timber.d("AppDataRepository: getAppData - Returning ${cachedApps.size + fetchedApps.size} apps (cached + fetched)")
        return cachedApps + fetchedApps
    }

    /**
     * Fetches app data for a single package name, using cache when possible.
     * Returns a ParseAppData object or null if not found.
     */
    suspend fun getAppData(packageName: String): ParseAppData? {
        Timber.d("AppDataRepository: getAppData - Called for package: $packageName")

        val cached = appDataCache[packageName]
        if (cached != null) {
            Timber.v("AppDataRepository: getAppData - Cache hit for package: $packageName")
            return cached
        }

        Timber.d("AppDataRepository: getAppData - Cache miss for package: $packageName, fetching from data source")
        return try {
            val appData = appDataDataSource.getAppData(packageName)
            val pkg = appData.packageName
            if (pkg != null) {
                appDataCache[pkg] = appData
                Timber.v("AppDataRepository: getAppData - Cached fetched app data for package: $pkg")
            } else {
                Timber.w("AppDataRepository: getAppData - Fetched app data missing packageName, not caching")
                CrashlyticsLog.log("AppDataRepository: getAppData - Fetched app data missing packageName for $packageName")
            }
            appData
        } catch (e: ParseException) {
            if (e.code == ParseException.OBJECT_NOT_FOUND) {
                Timber.w("AppDataRepository: getAppData - App data not found for package: $packageName (OBJECT_NOT_FOUND)")
                null
            } else {
                Timber.e(e, "AppDataRepository: getAppData - ParseException for package: $packageName")
                CrashlyticsLog.recordNonFatalError(e, "AppDataRepository: ParseException in getAppData(packageName=$packageName)")
                throw e
            }
        } catch (e: Exception) {
            Timber.e(e, "AppDataRepository: getAppData - Unexpected error fetching app data for package: $packageName")
            CrashlyticsLog.recordNonFatalError(e, "AppDataRepository: Exception in getAppData(packageName=$packageName)")
            throw e
        }
    }
}