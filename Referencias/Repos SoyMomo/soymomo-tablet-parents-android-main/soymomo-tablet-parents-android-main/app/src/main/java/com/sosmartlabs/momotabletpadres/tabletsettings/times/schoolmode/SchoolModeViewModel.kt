package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.AppDataRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.remote.ParseAppData
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.remote.getIconUrl
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SelectableApp
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.ViewStateAction
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import timber.log.Timber
import java.time.LocalTime
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class SchoolModeViewModel @Inject constructor(
    application: Application,
    private val schoolModeRepository: SchoolModeSettingsRepository,
    private val appDataRepository: AppDataRepository,
) : AndroidViewModel(application) {

    private val ioContext: CoroutineContext = Dispatchers.IO
    private val externalScope: CoroutineScope = CoroutineScope(SupervisorJob() + ioContext)

    val schoolModeState = MutableLiveData<Boolean>()
    val hoursOfOperation = MutableLiveData<Pair<LocalTime, LocalTime>>()
    val allowedAppList = MutableLiveData<List<SelectableApp>>()
    val viewStateHandler = MutableLiveData<List<ViewStateAction>>()

    fun loadSchoolModeSettings(tablet: Tablet) {
        Timber.d("SchoolModeViewModel: loadSchoolModeSettings() - Start loading settings for tabletId=${tablet.objectId}")
        viewStateHandler.value = listOf(ViewStateAction.SHOW_LOADING, ViewStateAction.HIDE_RETRY)

        viewModelScope.launch(ioContext) {
            Timber.d("SchoolModeViewModel: loadSchoolModeSettings() - Fetching SchoolModeSettings from repository")
            runCatching { schoolModeRepository.getSchoolModeSettings(tablet) }
                .onSuccess { schoolMode ->
                    Timber.d("SchoolModeViewModel: loadSchoolModeSettings() - Successfully fetched SchoolModeSettings for tabletId=${tablet.objectId}")
                    schoolModeState.postValue(schoolMode.enabled)

                    // SchoolModeViewModel: Prepare and update allowed apps with their icon URLs in an optimized and ordered way
                    val packageNames = schoolMode.allowedApps.map { it.packageName }
                    Timber.d("SchoolModeViewModel: loadSchoolModeSettings - Preparing to fetch app data for allowed apps: $packageNames")

                    // Fetch all app data for allowed apps in one go and build a lookup map
                    val appDataList = getAppData(packageNames)
                    Timber.d("SchoolModeViewModel: loadSchoolModeSettings - Retrieved app data for ${appDataList.size} apps")

                    val appDataMap = appDataList.associateBy { it.packageName }

                    // Update allowed apps with icon URLs, maintaining order, and log missing data
                    schoolMode.allowedApps.forEachIndexed { index, allowedApp ->
                        val appData = appDataMap[allowedApp.packageName]
                        if (appData != null) {
                            allowedApp.iconUrl = appData.getIconUrl()
                            Timber.v("SchoolModeViewModel: loadSchoolModeSettings - Set iconUrl for allowed app '${allowedApp.packageName}' at index $index")
                        } else {
                            Timber.w("SchoolModeViewModel: loadSchoolModeSettings - No app data found for allowed app '${allowedApp.packageName}' at index $index")
                        }
                    }

                    allowedAppList.postValue(schoolMode.allowedApps)
                    Timber.d("SchoolModeViewModel: loadSchoolModeSettings() - Allowed apps and icons updated for tabletId=${tablet.objectId}")

                    // Set hours of operation
                    hoursOfOperation.postValue(Pair(schoolMode.from, schoolMode.to))
                    Timber.d("SchoolModeViewModel: loadSchoolModeSettings() - Hours of operation set: ${schoolMode.from} to ${schoolMode.to}")

                    viewStateHandler.postValue(
                        listOf(ViewStateAction.HIDE_LOADING, ViewStateAction.SHOW_DATA)
                    )
                    Timber.d("SchoolModeViewModel: loadSchoolModeSettings() - Finished updating LiveData for tabletId=${tablet.objectId}")
                }
                .onFailure { throwable ->
                    Timber.e(throwable, "SchoolModeViewModel: loadSchoolModeSettings() - Error loading School Mode settings for tabletId=${tablet.objectId}")
                    handleNonFatal(
                        throwable,
                        "SchoolModeViewModel: Error loading School Mode settings for tabletId=${tablet.objectId}"
                    )
                    viewStateHandler.postValue(
                        listOf(ViewStateAction.HIDE_LOADING, ViewStateAction.SHOW_RETRY)
                    )
                }
        }
    }

    fun updateSchoolModeState(tablet: Tablet, enabled: Boolean) {
        Timber.d("SchoolModeViewModel: updateSchoolModeState() - Start updating School Mode state for tabletId=${tablet.objectId}, enabled=$enabled")
        viewStateHandler.value = listOf(ViewStateAction.SHOW_LOADING, ViewStateAction.HIDE_RETRY)

        viewModelScope.launch(ioContext) {
            Timber.d("SchoolModeViewModel: updateSchoolModeState() - Setting School Mode enabled=$enabled in repository")
            runCatching { schoolModeRepository.setFlagEnabled(tablet, enabled) }
                .onSuccess {
                    Timber.d("SchoolModeViewModel: updateSchoolModeState() - Successfully updated School Mode state for tabletId=${tablet.objectId}")
                    schoolModeState.postValue(enabled)
                    viewStateHandler.postValue(
                        listOf(ViewStateAction.HIDE_LOADING, ViewStateAction.SHOW_DATA)
                    )
                }
                .onFailure { throwable ->
                    Timber.e(throwable, "SchoolModeViewModel: updateSchoolModeState() - Error updating School Mode state for tabletId=${tablet.objectId}")
                    handleNonFatal(
                        throwable,
                        "SchoolModeViewModel: Error updating School Mode state for tabletId=${tablet.objectId}"
                    )
                    viewStateHandler.postValue(
                        listOf(ViewStateAction.HIDE_LOADING, ViewStateAction.SHOW_RETRY)
                    )
                }
        }
    }

    fun updateHoursOfOperation(tablet: Tablet, from: LocalTime, to: LocalTime) {
        Timber.d("SchoolModeViewModel: updateHoursOfOperation() - Start updating hours for tabletId=${tablet.objectId}, from=$from, to=$to")
        viewStateHandler.value = listOf(ViewStateAction.SHOW_LOADING, ViewStateAction.HIDE_RETRY)

        externalScope.launch {
            Timber.d("SchoolModeViewModel: updateHoursOfOperation() - Setting hours in repository")
            runCatching { schoolModeRepository.setTime(tablet, from, to) }
                .onSuccess {
                    Timber.d("SchoolModeViewModel: updateHoursOfOperation() - Successfully updated hours for tabletId=${tablet.objectId}")
                    hoursOfOperation.postValue(Pair(from, to))
                    viewStateHandler.postValue(
                        listOf(ViewStateAction.HIDE_LOADING, ViewStateAction.SHOW_DATA)
                    )
                }
                .onFailure { throwable ->
                    Timber.e(throwable, "SchoolModeViewModel: updateHoursOfOperation() - Error updating hours for tabletId=${tablet.objectId}")
                    handleNonFatal(
                        throwable,
                        "SchoolModeViewModel: Error updating hours of operation for tabletId=${tablet.objectId}"
                    )
                    viewStateHandler.postValue(
                        listOf(ViewStateAction.HIDE_LOADING, ViewStateAction.SHOW_RETRY)
                    )
                }
        }
    }

    fun updateAllowedApps(tablet: Tablet, list: List<SelectableApp>) {
        Timber.d("SchoolModeViewModel: updateAllowedApps() - Start updating allowed apps for tabletId=${tablet.objectId}, size=${list.size}")
        viewStateHandler.value = listOf(ViewStateAction.SHOW_LOADING, ViewStateAction.HIDE_RETRY)

        externalScope.launch {
            Timber.d("SchoolModeViewModel: updateAllowedApps() - Setting allowed apps in repository")
            runCatching { schoolModeRepository.setAllowedApps(tablet, list) }
                .onSuccess {
                    Timber.d("SchoolModeViewModel: updateAllowedApps() - Successfully updated allowed apps for tabletId=${tablet.objectId}")
                    allowedAppList.postValue(list)
                    viewStateHandler.postValue(
                        listOf(ViewStateAction.HIDE_LOADING, ViewStateAction.SHOW_DATA)
                    )
                }
                .onFailure { throwable ->
                    Timber.e(throwable, "SchoolModeViewModel: updateAllowedApps() - Error updating allowed apps for tabletId=${tablet.objectId}")
                    handleNonFatal(
                        throwable,
                        "SchoolModeViewModel: Error updating allowed apps for tabletId=${tablet.objectId}"
                    )
                    viewStateHandler.postValue(
                        listOf(ViewStateAction.HIDE_LOADING, ViewStateAction.SHOW_RETRY)
                    )
                }
        }
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

    private fun handleNonFatal(throwable: Throwable, message: String) {
        Timber.e(throwable, "SchoolModeViewModel: $message")
        CrashlyticsLog.recordNonFatalError(throwable, message)
    }
}