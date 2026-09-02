package com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp

import com.parse.ParseQuery
import com.parse.coroutines.callCloudFunction
import com.parse.coroutines.first
import com.parse.ktx.orderByAscending
import com.parse.ktx.selectKeys
import com.parse.ktx.whereEqualTo
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.SchoolModeSettingsRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.remote.ParseInstalledApp
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.remote.ParseInstalledAppDataSource
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class InstalledAppsRepository @Inject constructor(
    override val parseInstalledAppDataSource: ParseInstalledAppDataSource,
    private val schoolModeSettingsRepository: SchoolModeSettingsRepository
) : InstalledAppsRepositoryBase() {

    private lateinit var installedApps: List<ParseInstalledApp>
    private lateinit var currentTabletId: String

    private fun ParseInstalledApp.toEntity() = InstalledAppEntity(
        packageName = packageName!!,
        installed = installed!!,
        allowed = allowed!!,
        appName = appName!!,
        iconImageUrl = null,
        category = category!!,
        isChecked = false,
        limit = limit ?: 0,
        dugAnalysis = dugAnalysis
    )

    private fun ParseInstalledApp.toInstalledApp(schoolModeEnabled: Boolean) = InstalledApp(
        schoolMode = schoolModeEnabled,
        objectId = objectId!!,
        packageName = packageName!!,
        installed = installed!!,
        allowed = allowed!!,
        appName = appName!!,
        category = category!!,
        limit = limit ?: 0,
        dugAnalysis = dugAnalysis
    )

    override suspend fun getInstalledApps(tablet: Tablet): List<InstalledApp> {
        Timber.d("InstalledAppsRepository: getInstalledApps - Start for tabletId=${tablet.objectId}")
        return runCatching {
            currentTabletId = tablet.objectId!!
            Timber.d("InstalledAppsRepository: getInstalledApps - Creating ParseTablet reference")
            val tabletObject = ParseTablet.createWithoutData(tablet.objectId!!)
            Timber.d("InstalledAppsRepository: getInstalledApps - Querying installed apps from Parse")
            installedApps = ParseQuery.getQuery(ParseInstalledApp::class.java)
                .whereEqualTo("tablet", tabletObject)
                .whereEqualTo(ParseInstalledApp::installed, true)
                .orderByAscending(ParseInstalledApp::appName)
                .setLimit(1_000)
                .find()
            Timber.d("InstalledAppsRepository: getInstalledApps - Found ${installedApps.size} installed apps")

            Timber.d("InstalledAppsRepository: getInstalledApps - Fetching school mode allowed apps")
            val allowedApps = schoolModeSettingsRepository.getSchoolModeSettings(tablet).allowedApps
                .filter { it.selected }
                .map { it.packageName }
            Timber.d("InstalledAppsRepository: getInstalledApps - Found ${allowedApps.size} allowed apps in school mode")
            installedApps.map { it.toInstalledApp(allowedApps.contains(it.packageName)) }
        }.onFailure { throwable ->
            Timber.e(throwable, "InstalledAppsRepository: getInstalledApps - Error getting installed apps for tabletId=${tablet.objectId}")
            CrashlyticsLog.recordNonFatalError(throwable, "InstalledAppsRepository: getInstalledApps - Error for tabletId=${tablet.objectId}")
        }.getOrDefault(emptyList())
    }

    fun getTabletInstalledApps(tabletId: String): List<InstalledAppEntity> {
        Timber.d("InstalledAppsRepository: getTabletInstalledApps - Start for tabletId=$tabletId")
        currentTabletId = tabletId
        val tabletObject = ParseTablet.createWithoutData(tabletId)
        CrashlyticsLog.log("InstalledAppsRepository: getTabletInstalledApps - Querying to get tablet installed apps by tabletId=$tabletId")
        Timber.d("InstalledAppsRepository: getTabletInstalledApps - Querying Parse for installed apps")
        return try {
            val installedApps = ParseQuery.getQuery(ParseInstalledApp::class.java)
                .whereEqualTo("tablet", tabletObject)
                .whereEqualTo(ParseInstalledApp::installed, true)
                .orderByAscending(ParseInstalledApp::appName)
                .setLimit(1_000)
                .find()
            Timber.d("InstalledAppsRepository: getTabletInstalledApps - Query completed, found ${installedApps.size} apps for tabletId=$tabletId")
            val mappedApps = installedApps.map { it.toEntity() }
            if (mappedApps.isEmpty()) {
                Timber.e("InstalledAppsRepository: getTabletInstalledApps - No installed apps found for tablet $tabletId")
                CrashlyticsLog.log("InstalledAppsRepository: getTabletInstalledApps - No installed apps found for tablet $tabletId")
            }
            mappedApps
        } catch (e: Exception) {
            Timber.e(e, "InstalledAppsRepository: getTabletInstalledApps - Exception while querying installed apps for tablet $tabletId")
            CrashlyticsLog.recordNonFatalError(e, "InstalledAppsRepository: getTabletInstalledApps - Exception for tablet $tabletId")
            emptyList()
        }
    }

    suspend fun getInstalledApp(tabletId: String, packageName: String): InstalledAppEntity {
        Timber.d("InstalledAppsRepository: getInstalledApp - Start for tabletId=$tabletId, packageName=$packageName")
        currentTabletId = tabletId
        val tabletObject = ParseTablet.createWithoutData(tabletId)
        Timber.d("InstalledAppsRepository: getInstalledApp - Querying Parse for installed app")
        val installedApp = ParseQuery.getQuery(ParseInstalledApp::class.java)
            .whereEqualTo("tablet", tabletObject)
            .whereEqualTo("packageName", packageName)
            .whereEqualTo(ParseInstalledApp::installed, true)
            .first()
        Timber.d("InstalledAppsRepository: getInstalledApp - Found installed app for packageName=$packageName")
        return installedApp.toEntity()
    }

    fun getInstalledAppsPackageNamesByTablets(tablets: List<Tablet>): List<String> {
        Timber.d("InstalledAppsRepository: getInstalledAppsPackageNamesByTablets - Start for tablets=${tablets.map { it.objectId ?: it.hid }}")
        val tabletObjects = tablets.map { ParseTablet.createWithoutData(it.objectId!!) }
        CrashlyticsLog.log("InstalledAppsRepository: getInstalledAppsPackageNamesByTablets - Querying to get Installed apps Package name by tablets")
        Timber.d("InstalledAppsRepository: getInstalledAppsPackageNamesByTablets - Querying Parse for installed apps package names")
        val result = ParseQuery.getQuery(ParseInstalledApp::class.java)
            .whereContainedIn("tablet", tabletObjects)
            .whereEqualTo(InstalledApp::installed, true)
            .selectKeys(listOf(ParseInstalledApp::packageName))
            .setLimit(1_000)
            .find()
            .distinctBy { it.packageName }
            .mapNotNull { it.packageName }
            .also { mappedApps ->
                if (mappedApps.isEmpty()) {
                    val errorMessage = "InstalledAppsRepository: getInstalledAppsPackageNamesByTablets - Error: No InstalledApps found for tablets ${tablets.map { it.objectId ?: it.hid }}"
                    Timber.e(errorMessage)
                    CrashlyticsLog.log(errorMessage)
                    throw Exception(errorMessage)
                }
                mappedApps.forEach { Timber.d("InstalledAppsRepository: getInstalledAppsPackageNamesByTablets - Found app: $it") }
            }
        Timber.d("InstalledAppsRepository: getInstalledAppsPackageNamesByTablets - Returning ${result.size} package names")
        return result
    }

    suspend fun updateInstalledApp(installedAppEntity: InstalledAppEntity, tablet: Tablet) {
        Timber.d("InstalledAppsRepository: updateInstalledApp - Start for tabletId=${tablet.objectId}, packageName=${installedAppEntity.packageName}")
        val tabletObject = ParseTablet.createWithoutData(tablet.objectId!!)
        var appToUpdate: ParseInstalledApp? = null

        if (::installedApps.isInitialized && tablet.objectId == currentTabletId) {
            Timber.d("InstalledAppsRepository: updateInstalledApp - Searching in cached installedApps")
            appToUpdate = installedApps.find { it.packageName == installedAppEntity.packageName }
        }

        if (appToUpdate == null) {
            Timber.d("InstalledAppsRepository: updateInstalledApp - App not found in cache, querying Parse")
            CrashlyticsLog.log("InstalledAppsRepository: updateInstalledApp - Querying to update installed app by installedAppEntity and tablet")
            appToUpdate = ParseQuery.getQuery(ParseInstalledApp::class.java)
                .whereEqualTo("tablet", tabletObject)
                .whereEqualTo(InstalledApp::packageName, installedAppEntity.packageName)
                .first
            Timber.d("InstalledAppsRepository: updateInstalledApp - App loaded from Parse: ${appToUpdate.objectId}")
        } else {
            Timber.d("InstalledAppsRepository: updateInstalledApp - App found in cache: ${appToUpdate.objectId}")
        }

        CrashlyticsLog.log("InstalledAppsRepository: updateInstalledApp - Calling cloud function updateInstalledApp for appId=${appToUpdate!!.objectId}")
        Timber.d("InstalledAppsRepository: updateInstalledApp - Calling cloud function updateInstalledApp for appId=${appToUpdate.objectId}")
        callCloudFunction<Unit>(
            "updateInstalledApp",
            hashMapOf(
                "installedAppId" to appToUpdate.objectId,
                "allowed" to installedAppEntity.allowed,
                "limit" to installedAppEntity.limit
            )
        )
        Timber.d("InstalledAppsRepository: updateInstalledApp - Cloud function call completed for appId=${appToUpdate.objectId}")

        if (!installedApps.contains(appToUpdate)) {
            Timber.d("InstalledAppsRepository: updateInstalledApp - App not in cache, adding to installedApps list")
            installedApps = installedApps.toMutableList().apply {
                add(appToUpdate)
            }.toList()
        } else {
            Timber.d("InstalledAppsRepository: updateInstalledApp - App already present in installedApps list")
        }
    }
}