package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import android.os.Build
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.asFlow
import androidx.lifecycle.asLiveData
import androidx.lifecycle.viewModelScope
import com.google.firebase.Firebase
import com.google.firebase.crashlytics.crashlytics
import com.sosmartlabs.momotabletpadres.adapters.ViewListener
import com.sosmartlabs.momotabletpadres.appinfo.model.AppInfo
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.core.common.utils.LocalizationHelper
import com.sosmartlabs.momotabletpadres.repositories.AppInfoRepositoryImpl
import com.sosmartlabs.momotabletpadres.repositories.AppStatsRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.AppDataRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.remote.ParseAppData
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.remote.getIconUrl
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.InstalledAppEntity
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.InstalledAppsRepository
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class AppProtectionViewModel @Inject constructor(
    application: Application,
    private val installedAppsRepository: InstalledAppsRepository,
    private val appDataRepository: AppDataRepository,
    private val appInfoRepository: AppInfoRepositoryImpl,
    private val appStatsRepository: AppStatsRepository
) : AndroidViewModel(application) {

    // Scope for tasks that must survive to this ViewModel scope
    private val coroutineScope = CoroutineScope(Dispatchers.IO)

    // View Listeners
    lateinit var installedAppsViewListener: ViewListener<InstalledAppEntity>

    // List of apps with modified permissions
    private val modifiedApps = mutableListOf<InstalledAppEntity>()

    // LiveData for serving Installed apps info to Fragment.
    private val _installedApps = MutableLiveData<List<InstalledAppEntity>>()
    val installedApps: LiveData<List<InstalledAppEntity>> get() = _installedApps

    // LiveData for serving blocked installed apps info to Fragment.
    val blockedApps = _installedApps.asFlow()
        .map { it.filter { app -> !app.allowed } }
        .asLiveData()

    // LiveData for current selected installed app.
    private val _selectedInstalledApp = MutableLiveData<InstalledAppEntity>()
    val selectedInstalledApp: LiveData<InstalledAppEntity> get() = _selectedInstalledApp

    // LiveData for indicate that the AppEntity in [_installedApps] with the given index has changed.
    private val _modifiedAppIndex = MutableLiveData<Int>()
    val modifiedAppIndex: LiveData<Int> get() = _modifiedAppIndex

    // LiveData for indicate if time limit functionality is enabled.
    private val _isTimeLimitEnabled = MutableLiveData<Boolean>()
    val isTimeLimitEnabled: LiveData<Boolean> get() = _isTimeLimitEnabled

    // Current tablet displayed
    private lateinit var currentTablet: Tablet

    fun fetchInstalledApp(tablet: Tablet, packageName: String) {
        Timber.d("AppProtectionViewModel: fetchInstalledApp called for tabletId=${tablet.objectId}, packageName=$packageName")
        viewModelScope.launch(Dispatchers.IO) {
            try {
                Timber.d("AppProtectionViewModel: Fetching installed app from repository")
                val installedApp = installedAppsRepository.getInstalledApp(tablet.objectId!!, packageName)
                Timber.d("AppProtectionViewModel: Installed app fetched: $installedApp")
                val appData = getAppData(packageName)
                if (appData != null) {
                    Timber.d("AppProtectionViewModel: Setting app data for $packageName")
                    setAppData(installedApp, appData)
                } else {
                    Timber.w("AppProtectionViewModel: No app data found for $packageName")
                }
                _selectedInstalledApp.postValue(installedApp)
                Timber.d("AppProtectionViewModel: _selectedInstalledApp updated")
            } catch (e: Exception) {
                Timber.e(e, "AppProtectionViewModel: Error fetching installed app for $packageName")
                CrashlyticsLog.recordNonFatalError(e, "AppProtectionViewModel: Error fetching installed app for $packageName")
            }
        }
    }

    /**
     * Fetch information of installed apps from Local and/or remote databases
     * @param tablet Tablet for which installed apps are required
     */
    fun fetchInstalledApps(tablet: Tablet) {
        Timber.d("AppProtectionViewModel: fetchInstalledApps called for tabletId=${tablet.objectId}")
        Firebase.crashlytics.log("AppProtectionViewModel: Fetch installed apps")
        currentTablet = tablet
        _isTimeLimitEnabled.postValue(tablet.appVersionCode!! >= 76)
        Timber.d("AppProtectionViewModel: hideRetry and showLoading called on viewListener")
        installedAppsViewListener.hideRetry()
        installedAppsViewListener.showLoading()
        viewModelScope.launch(Dispatchers.IO) {
            Timber.d("AppProtectionViewModel: Inside viewModelScope for fetchInstalledApps")
            lateinit var installedApps: List<InstalledAppEntity>
            try {
                Timber.d("AppProtectionViewModel: Fetching installed apps from repository")
                installedApps = installedAppsRepository.getTabletInstalledApps(tablet.objectId!!)
                Timber.d("AppProtectionViewModel: Installed apps fetched, size: ${installedApps.size}")
                CrashlyticsLog.log("AppProtectionViewModel: Installed Apps fetched, size: ${installedApps.size}")
                val packageNames = installedApps.mapNotNull { it.packageName }
                Timber.d("AppProtectionViewModel: Fetched ${installedApps.size} Installed Apps")
                // Post only once, after icons (getAppData) and usage stats (fetchAppStats) are
                // resolved below. Posting here prematurely would flip the ViewFlipper off the
                // loading spinner and render every row with null icon URLs (the fallback glyph)
                // and "0m" usage, then re-bind a moment later — a visible flicker on every entry.
                Timber.d("AppProtectionViewModel: Fetching app data for installed apps")
                val appData = getAppData(packageNames)
                Timber.d("AppProtectionViewModel: Updating installed apps with app data")
                updateInstalledAppsData(installedApps, appData)
                Timber.d("AppProtectionViewModel: Installed Apps with icons: $installedApps")
                Timber.d("AppProtectionViewModel: Fetching app stats for installed apps")
                fetchAppStats(installedApps)
                Timber.d("AppProtectionViewModel: Completed loading installed apps")
                _installedApps.postValue(installedApps)
            } catch (e: Exception) {
                Timber.e(e, "AppProtectionViewModel: Error loading installed Apps")
                CrashlyticsLog.recordNonFatalError(e, "AppProtectionViewModel: Error loading installed Apps")
                Firebase.crashlytics.recordException(e)
                withContext(Dispatchers.Main) {
                    with(installedAppsViewListener) {
                        hideLoading()
                        showErrorMessage("AppProtectionViewModel: Error loading installed Apps $e")
                        showRetry()
                    }
                }
            }
        }
    }

    private suspend fun updateInstalledAppsData(installedApps: List<InstalledAppEntity>, appData: List<ParseAppData>) {
        Timber.d("AppProtectionViewModel: updateInstalledAppsData called for ${installedApps.size} apps")
        for (installedApp in installedApps) {
            val data = appData.find { it.packageName == installedApp.packageName }
            if (data != null) {
                Timber.d("AppProtectionViewModel: Setting app data for ${installedApp.packageName}")
                setAppData(installedApp, data)
            } else {
                Timber.w("AppProtectionViewModel: No app data found for ${installedApp.packageName}")
            }
        }
    }

    private suspend fun setAppData(installedApp: InstalledAppEntity, appData: ParseAppData) {
        Timber.d("AppProtectionViewModel: setAppData for ${installedApp.packageName}")
        installedApp.iconImageUrl = appData.getIconUrl()
        installedApp.contentRating = appData.contentRating
        installedApp.llmDescription = appData.llmDescription
        installedApp.potentialDangers = appData.potentialDangers
    }

    private suspend fun getAppData(
        appPackageNames: List<String>,
    ): List<ParseAppData> {
        Timber.d("AppProtectionViewModel: getAppData called for ${appPackageNames.size} package names")
        return try {
            val data = appDataRepository.getAppData(appPackageNames)
            Timber.d("AppProtectionViewModel: getAppData success: $data")
            data
        } catch (e: Exception) {
            Timber.e(e, "AppProtectionViewModel: Error obtaining app data from AppDataRepository")
            CrashlyticsLog.recordNonFatalError(
                e,
                "AppProtectionViewModel: Error obtaining app data from AppDataRepository"
            )
            emptyList()
        }
    }

    private suspend fun getAppData(
        appPackageName: String,
    ): ParseAppData? {
        Timber.d("AppProtectionViewModel: getAppData called for $appPackageName")
        return try {
            val data = appDataRepository.getAppData(appPackageName)
            Timber.d("AppProtectionViewModel: getAppData success: $data")
            data
        } catch (e: Exception) {
            Timber.e(e, "AppProtectionViewModel: Error obtaining app data from AppDataRepository for $appPackageName")
            CrashlyticsLog.recordNonFatalError(
                e,
                "AppProtectionViewModel: Error obtaining app data from AppDataRepository for $appPackageName"
            )
            null
        }
    }

    /**
     * Obtains information for the current installed app
     * @param installedApp Current installed app
     */
    private suspend fun fetchAppInfo(installedApp: InstalledAppEntity) {
        Timber.d("AppProtectionViewModel: fetchAppInfo called for ${installedApp.packageName}")
        Firebase.crashlytics.log("AppProtectionViewModel: Fetch app info")
        try {
            val appsInfo = appInfoRepository.getAppInfo(installedApp.packageName)
            Timber.d("AppProtectionViewModel: App info fetched for ${installedApp.packageName}, size: ${appsInfo.size}")
            with(installedApp) {
                contentRating = findAppInfoField(appsInfo, { it.contentRating })
                dugDescriptionHtml = findAppInfoField(appsInfo, { it.dugDescriptionHTML }) { appInfo ->
                    runBlocking(Dispatchers.IO) {
                        Timber.d("AppProtectionViewModel: Fetching safer alternatives for ${appInfo.packageName}")
                        saferAppAlternatives = appInfoRepository.getSaferAlternatives(appInfo)
                    }
                }
                descriptionHtml = findAppInfoField(appsInfo, { it.descriptionHTML })
                dugAnalysis = findAppInfoField(appsInfo, { it.dugAnalysis })
                Timber.d("AppProtectionViewModel: Fetched App Info for $packageName with dugAnalysis $dugAnalysis")
            }
        } catch (e: Exception) {
            Timber.e(e, "AppProtectionViewModel: Error fetching app info for ${installedApp.packageName}")
            CrashlyticsLog.recordNonFatalError(e, "AppProtectionViewModel: Error fetching app info for ${installedApp.packageName}")
        }
    }

    /**
     * Finds the appropriate field considering current app localization in a list of AppInfo
     * @param appsInfo List in which find the required param
     * @param field Lambda with the param to find
     * @param executeOnFound Lambda to execute with the appInfo found for the param when it is found.
     * By default, is null.
     */
    private fun findAppInfoField(
        appsInfo: List<AppInfo>,
        field: (AppInfo) -> String?,
        executeOnFound: ((AppInfo) -> Unit)? = null
    ): String? {
        Timber.d("AppProtectionViewModel: findAppInfoField called")
        return LocalizationHelper.findLocalizedField(appsInfo, field, { it.lang }, { it.country }, executeOnFound)
    }

    /**
     * Obtains the stats for the current installed apps
     * @param installedApps Current installed apps list
     */
    private fun fetchAppStats(installedApps: List<InstalledAppEntity>) {
        Timber.d("AppProtectionViewModel: fetchAppStats called for ${installedApps.size} apps")
        try {
            val stats = appStatsRepository.getAppStatsForTablet(currentTablet.objectId!!)
            Timber.d("AppProtectionViewModel: Got ${stats.size} App stats")
            for (appStat in stats) {
                val installedApp = getInstalledApp(installedApps, appStat.packageName!!)
                if (installedApp != null) {
                    installedApp.usageTime += appStat.foregroundUsage
                } else {
                    Timber.w("AppProtectionViewModel: No installed app found for stat packageName=${appStat.packageName}")
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "AppProtectionViewModel: Error fetching app stats")
            CrashlyticsLog.recordNonFatalError(e, "AppProtectionViewModel: Error fetching app stats")
        }
    }

    /**
     * Finds a installed app in the list with the given package name
     * @param installedApps List of current installed apps
     * @param packageName App package name to find
     * @return The InstalledAppEntity for the given package name if exist. If not exist in list,
     * return null
     */
    private fun getInstalledApp(installedApps: List<InstalledAppEntity>, packageName: String): InstalledAppEntity? {
        val app = installedApps.find { installedApp -> packageName == installedApp.packageName }
        if (app == null) {
            Timber.w("AppProtectionViewModel: getInstalledApp: No app found for packageName=$packageName")
        }
        return app
    }

    /**
     * Sets the given apps with it's new permission
     * @param appEntity App for modify access permission
     */
    private fun setAppPermission(appEntity: InstalledAppEntity) {
        Timber.d("AppProtectionViewModel: setAppPermission called for ${appEntity.packageName}")
        Firebase.crashlytics.log("AppProtectionViewModel: Set app permission")
        modifiedApps.removeIf { it.packageName == appEntity.packageName }
        modifiedApps.add(appEntity)
        _modifiedAppIndex.postValue(_installedApps.value?.indexOf(appEntity) ?: -1)
        Timber.d("AppProtectionViewModel: App permission updated in modifiedApps and LiveData")

        coroutineScope.launch(Dispatchers.IO) {
            try {
                Timber.d("AppProtectionViewModel: Updating installed app in repository for ${appEntity.packageName}")
                installedAppsRepository.updateInstalledApp(appEntity, currentTablet)
                Timber.d("AppProtectionViewModel: Installed app updated successfully for ${appEntity.packageName}")
                _selectedInstalledApp.postValue(appEntity)
            } catch (e: Exception) {
                Timber.e(e, "AppProtectionViewModel: Error updating installed app for ${appEntity.packageName}")
                CrashlyticsLog.recordNonFatalError(e, "AppProtectionViewModel: Error updating installed app for ${appEntity.packageName}")
                Firebase.crashlytics.recordException(e)
            }
        }
    }

    /**
     * Selects the current selected installed app
     * @param appEntity Current selected InstalledAppEntity
     */
    fun setSelectedInstalledApp(appEntity: InstalledAppEntity) {
        Timber.d("AppProtectionViewModel: setSelectedInstalledApp called for ${appEntity.packageName}")
        _selectedInstalledApp.value = appEntity
    }

    /**
     * Indicates that an app should be allowed
     * @param appEntity App to allow
     */
    fun allowApp(appEntity: InstalledAppEntity) {
        Timber.d("AppProtectionViewModel: allowApp called for ${appEntity.packageName}")
        appEntity.allowed = true
        appEntity.limit = 0
        setAppPermission(appEntity)
    }

    /**
     * Indicates that an app should be blocked
     * @param appEntity App to block
     */
    fun blockApp(appEntity: InstalledAppEntity) {
        Timber.d("AppProtectionViewModel: blockApp called for ${appEntity.packageName}")
        appEntity.allowed = false
        appEntity.limit = 0
        setAppPermission(appEntity)
    }

    /**
     * Ask for dug analysis for the given app
     * @param appEntity App to ask dug analysis
     * @param tablet Tablet to ask dug analysis
     */
    fun askDugAnalysis(appEntity: InstalledAppEntity, tablet: Tablet) {
        Timber.i("AppProtectionViewModel: askDugAnalysis called for ${appEntity.packageName}")
        coroutineScope.launch {
            try {
                Timber.d("AppProtectionViewModel: Requesting dug analysis for ${appEntity.packageName}")
                appInfoRepository.requestDugAnalysis(appEntity.packageName)
                Timber.d("AppProtectionViewModel: Dug analysis requested successfully for ${appEntity.packageName}")
                fetchInstalledApps(tablet)
            } catch (e: Exception) {
                Timber.e(e, "AppProtectionViewModel: Error performing dugAnalysis request for ${appEntity.packageName}")
                CrashlyticsLog.recordNonFatalError(e, "AppProtectionViewModel: Error performing dugAnalysis request for ${appEntity.packageName}")
            }
        }
    }

    /**
     * Sets a time limit for the given app
     * @param appEntity App to set limit
     * @param limit Time limit for this app
     */
    fun setAppTimeLimit(appEntity: InstalledAppEntity, limit: Int) {
        Timber.d("AppProtectionViewModel: setAppTimeLimit called for ${appEntity.packageName} with limit $limit")
        appEntity.allowed = true
        appEntity.limit = limit
        setAppPermission(appEntity)
    }

    /**
     * Removes time limits for the given app
     * @param appEntity App to remove time limits
     */
    fun removeAppTimeLimit(appEntity: InstalledAppEntity) {
        Timber.d("AppProtectionViewModel: removeAppTimeLimit called for ${appEntity.packageName}")
        appEntity.allowed = true
        appEntity.limit = 0
        setAppPermission(appEntity)
    }
}