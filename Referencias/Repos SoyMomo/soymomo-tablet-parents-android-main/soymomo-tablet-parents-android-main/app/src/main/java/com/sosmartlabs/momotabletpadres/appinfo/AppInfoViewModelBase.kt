package com.sosmartlabs.momotabletpadres.appinfo

import android.app.Application
import android.graphics.drawable.Drawable
import androidx.lifecycle.AndroidViewModel
import com.sosmartlabs.momotabletpadres.appicon.AppIconRepository
import com.sosmartlabs.momotabletpadres.appinfo.model.AppInfo
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.InstalledAppsRepositoryBase
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

abstract class AppInfoViewModelBase(application: Application) : AndroidViewModel(application) {

    /**
     * Repository for access to App Info data
     */
    protected abstract val appInfoRepository: AppInfoRepository

    /**
     * Repository for access to App Icons data
     */
    protected abstract val appIconRepository: AppIconRepository

    /**
     * Repository for access to Installed Apps data
     */
    protected abstract val installedAppsRepository: InstalledAppsRepositoryBase

    /**
     * Obtains [AppInfo] mapped by package name for the given package names
     * @param appPackageNames Package names of apps to find
     * @return [AppInfo] found, mapped by package name
     */
    protected suspend fun getAppsInfoIconsMap(appPackageNames: List<String>): Map<String, AppInfo> {
        Timber.d("AppInfoViewModelBase: getAppsInfoIconsMap - Start, appPackageNames: $appPackageNames")
        return runCatching {
            Timber.d("AppInfoViewModelBase: getAppsInfoIconsMap - Fetching app info from repository")
            appInfoRepository.getAppIcons(appPackageNames)
                .associateBy({ it.packageName!! }, { it })
        }.onSuccess {
            Timber.d("AppInfoViewModelBase: getAppsInfoIconsMap - Successfully obtained app info for ${it.size} apps")
            return it
        }.onFailure { throwable ->
            Timber.e(throwable, "AppInfoViewModelBase: getAppsInfoIconsMap - Error obtaining app titles and icons from AppInfoRepository")
            CrashlyticsLog.recordNonFatalError(
                throwable,
                "AppInfoViewModelBase: Error obtaining app titles and icons from AppInfoRepository for $appPackageNames"
            )
        }.getOrElse {
            Timber.w("AppInfoViewModelBase: getAppsInfoIconsMap - Returning empty map due to error")
            mapOf()
        }
    }

    /**
     * Obtain the icons for the given apps
     * @param appPackageNames Package names for the apps for query icons
     * @return [Drawable] icons mapped by app package name
     */
    protected suspend fun getAppIcons(
        appPackageNames: List<String>
    ): Map<String, Drawable> {
        Timber.d("AppInfoViewModelBase: getAppIcons - Start, appPackageNames: $appPackageNames")
        return runCatching {
            Timber.d("AppInfoViewModelBase: getAppIcons - Fetching app icons from repository")
            appIconRepository.getAppIcons(appPackageNames)
        }.onSuccess {
            Timber.d("AppInfoViewModelBase: getAppIcons - Successfully obtained ${it.size} app icons")
            return it
        }.onFailure { throwable ->
            Timber.e(throwable, "AppInfoViewModelBase: getAppIcons - Error obtaining app icons from AppIconRepository")
            CrashlyticsLog.recordNonFatalError(
                throwable,
                "AppInfoViewModelBase: Error obtaining app icons from AppIconRepository for $appPackageNames"
            )
        }.getOrElse {
            Timber.w("AppInfoViewModelBase: getAppIcons - Returning empty map due to error")
            mapOf()
        }
    }

    /**
     * Obtain the app names for the given tablet and package names
     * @param tablet Tablet for which to fetch app names
     * @param appPackageNames Package names for the apps
     * @return [String] app names mapped by app package name
     */
    protected suspend fun getAppNames(
        tablet: Tablet,
        appPackageNames: List<String>
    ): Map<String, String> {
        Timber.d("AppInfoViewModelBase: getAppNames - Start, tablet: ${tablet.objectId}, appPackageNames: $appPackageNames")
        return runCatching {
            Timber.d("AppInfoViewModelBase: getAppNames - Fetching installed app names from repository")
            installedAppsRepository.getTabletInstalledAppNamesByPackageName(
                tablet.objectId,
                appPackageNames
            )
        }.mapCatching { list ->
            Timber.d("AppInfoViewModelBase: getAppNames - Successfully obtained app names for ${list.size} apps")
            list.associate { it.packageName!! to it.appName!! }
        }.onFailure { throwable ->
            Timber.e(throwable, "AppInfoViewModelBase: getAppNames - Error obtaining app names from InstalledAppsRepository")
            CrashlyticsLog.recordNonFatalError(
                throwable,
                "AppInfoViewModelBase: Error obtaining app names from InstalledAppsRepository for tablet ${tablet.objectId} and $appPackageNames"
            )
        }.getOrElse {
            Timber.w("AppInfoViewModelBase: getAppNames - Returning empty map due to error")
            mapOf()
        }
    }
}