package com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp

import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.remote.ParseInstalledApp
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.remote.ParseInstalledAppDataSource
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

/**
 * Base class for InstalledApp repository
 */
abstract class InstalledAppsRepositoryBase {

    /**
     * Data Source for installed apps from Parse database
     */
    protected abstract val parseInstalledAppDataSource: ParseInstalledAppDataSource

    /**
     * [InstalledApp] instances mapped by packageName
     */
    private val installedApps = hashMapOf<String, InstalledApp>()

    /**
     * Obtains installed app names for apps on a list installed in the given tablet
     * @param tabletId ObjectId for tablet to query
     * @param packageNames app names to query
     * @return List of [InstalledApp] with app name for the required params.
     */
    open suspend fun getTabletInstalledAppNamesByPackageName(
        tabletId: String?,
        packageNames: List<String>
    ): List<InstalledApp> {
        Timber.d("InstalledAppsRepositoryBase: getTabletInstalledAppNamesByPackageName - Start (tabletId=$tabletId, packageNames=$packageNames)")
        val knownInstalledApps = mutableListOf<InstalledApp>()

        // Step 1: Find already cached apps
        packageNames.forEach { pkg ->
            if (installedApps.containsKey(pkg)) {
                Timber.v("InstalledAppsRepositoryBase: getTabletInstalledAppNamesByPackageName - Found cached app for package: $pkg")
                knownInstalledApps.add(installedApps[pkg]!!)
            }
        }

        // Step 2: Determine which apps are not cached
        val knownPackages = knownInstalledApps.mapNotNull { it.packageName }.toSet()
        val unknownInstalledApps = packageNames.subtract(knownPackages)
        Timber.d("InstalledAppsRepositoryBase: getTabletInstalledAppNamesByPackageName - Unknown packages to fetch: $unknownInstalledApps")

        // Step 3: Fetch unknown apps from remote if needed
        if (tabletId == null) {
            Timber.e("InstalledAppsRepositoryBase: getTabletInstalledAppNamesByPackageName - tabletId is null, cannot fetch unknown apps")
            CrashlyticsLog.log("InstalledAppsRepositoryBase: getTabletInstalledAppNamesByPackageName - tabletId is null, cannot fetch unknown apps")
        } else if (unknownInstalledApps.isNotEmpty()) {
            try {
                Timber.d("InstalledAppsRepositoryBase: getTabletInstalledAppNamesByPackageName - Fetching ${unknownInstalledApps.size} apps from remote for tabletId=$tabletId")
                val cloudInstalledApps = parseInstalledAppDataSource
                    .getTabletInstalledAppsByPackageNames(
                        tabletId,
                        unknownInstalledApps,
                        ParseInstalledApp::appName,
                        ParseInstalledApp::packageName
                    )
                    .map { parseApp ->
                        val app = parseApp.toInstalledApp()
                        Timber.v("InstalledAppsRepositoryBase: getTabletInstalledAppNamesByPackageName - Parsed remote app: ${app.packageName}")
                        installedApps[app.packageName ?: ""] = app
                        app
                    }
                knownInstalledApps.addAll(cloudInstalledApps)
                Timber.d("InstalledAppsRepositoryBase: getTabletInstalledAppNamesByPackageName - Added ${cloudInstalledApps.size} remote apps to knownInstalledApps")
            } catch (e: Exception) {
                Timber.e(e, "InstalledAppsRepositoryBase: getTabletInstalledAppNamesByPackageName - Error fetching apps from remote for tabletId=$tabletId")
                CrashlyticsLog.recordNonFatalError(e, "InstalledAppsRepositoryBase: Error fetching apps from remote for tabletId=$tabletId, unknownPackages=$unknownInstalledApps")
            }
        }

        Timber.d("InstalledAppsRepositoryBase: getTabletInstalledAppNamesByPackageName - Returning ${knownInstalledApps.size} apps")
        return knownInstalledApps
    }

    /**
     * Obtains a [InstalledApp] instance from this [ParseInstalledApp]
     * @return [InstalledApp] instance
     */
    private fun ParseInstalledApp.toInstalledApp(): InstalledApp {
        Timber.v("InstalledAppsRepositoryBase: toInstalledApp - Converting ParseInstalledApp (objectId=$objectId, packageName=$packageName)")
        return InstalledApp(
            appName = if (has("appName")) appName else null,
            packageName = if (has("packageName")) packageName else null,
            category = if (has("category")) category else null,
            allowed = if (has("allowed")) allowed else null,
            installed = if (has("installed")) installed else null,
            limit = if (has("limit")) limit else null,
            objectId = objectId,
            dugAnalysis = if (has("dugAnalysis")) dugAnalysis else null
        )
    }

    /**
     * Obtains a list of [InstalledApp]s registered in this device
     * @return List of [InstalledApp]s
     */
    abstract suspend fun getInstalledApps(tablet: Tablet): List<InstalledApp>
}