package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.applist

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.AppDataRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.remote.ParseAppData
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.remote.getIconUrl
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.InstalledAppsRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SelectableApp
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.ViewStateAction
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class SchoolModeAppListPickerViewModel @Inject constructor(
    application: Application,
    private val appDataRepository: AppDataRepository,
    private val installedAppsRepository: InstalledAppsRepository
) : AndroidViewModel(application) {

    private val ioContext: CoroutineContext = Dispatchers.IO

    val selectableAppList = MutableLiveData<List<SelectableApp>>()
    val viewStateHandler = MutableLiveData<List<ViewStateAction>>()

    fun loadSelectableApps(tablet: Tablet) {
        Timber.d("SchoolModeAppListPickerViewModel: loadSelectableApps - Start loading selectable apps for tabletId=${tablet.objectId}")
        viewStateHandler.value = listOf(ViewStateAction.SHOW_LOADING, ViewStateAction.HIDE_RETRY)

        viewModelScope.launch(ioContext) {
            Timber.d("SchoolModeAppListPickerViewModel: loadSelectableApps - Fetching installed apps from repository for tabletId=${tablet.objectId}")
            runCatching { installedAppsRepository.getInstalledApps(tablet) }
                .onSuccess { installedApps ->
                    Timber.d("SchoolModeAppListPickerViewModel: loadSelectableApps - Installed apps fetched: ${installedApps.size} for tabletId=${tablet.objectId}")

                    val packageNames = installedApps.mapNotNull { it.packageName }
                    Timber.d("SchoolModeAppListPickerViewModel: loadSelectableApps - Extracted package names: $packageNames")

                    val appDataList = getAppData(packageNames)
                    Timber.d("SchoolModeAppListPickerViewModel: loadSelectableApps - App data loaded for ${appDataList.size} packages")

                    val appDataMap = appDataList.associateBy { it.packageName }

                    val selectableApps = installedApps
                        .filter { it.allowed ?: true }
                        .map { source ->
                            val iconUrl = appDataMap[source.packageName]?.getIconUrl()
                            if (iconUrl != null) {
                                Timber.v("SchoolModeAppListPickerViewModel: loadSelectableApps - Icon URL found for package: ${source.packageName}")
                            } else {
                                Timber.w("SchoolModeAppListPickerViewModel: loadSelectableApps - No icon URL found for package: ${source.packageName}")
                            }
                            SelectableApp(
                                packageName = source.packageName!!,
                                appName = source.appName!!,
                                selected = source.schoolMode ?: false,
                                iconUrl = iconUrl,
                            )
                        }

                    Timber.d("SchoolModeAppListPickerViewModel: loadSelectableApps - Selectable apps mapped: ${selectableApps.size} for tabletId=${tablet.objectId}")
                    selectableAppList.postValue(selectableApps)
                    viewStateHandler.postValue(
                        listOf(ViewStateAction.HIDE_LOADING, ViewStateAction.SHOW_DATA)
                    )
                    Timber.d("SchoolModeAppListPickerViewModel: loadSelectableApps - Finished updating LiveData for tabletId=${tablet.objectId}")
                }
                .onFailure { throwable ->
                    Timber.e(throwable, "SchoolModeAppListPickerViewModel: loadSelectableApps - Error loading selectable apps for tabletId=${tablet.objectId}")
                    handleNonFatal(
                        throwable,
                        "SchoolModeAppListPickerViewModel: Error loading selectable apps for tabletId=${tablet.objectId}"
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
        Timber.d("SchoolModeAppListPickerViewModel: getAppData - Called for ${appPackageNames.size} package names")
        return try {
            val data = appDataRepository.getAppData(appPackageNames)
            Timber.d("SchoolModeAppListPickerViewModel: getAppData - Successfully fetched app data for ${data.size} packages")
            data
        } catch (e: Exception) {
            Timber.e(e, "SchoolModeAppListPickerViewModel: getAppData - Error obtaining app data from AppDataRepository")
            CrashlyticsLog.recordNonFatalError(
                e,
                "SchoolModeAppListPickerViewModel: Error obtaining app data from AppDataRepository"
            )
            emptyList()
        }
    }

    private fun handleNonFatal(throwable: Throwable, message: String) {
        Timber.e(throwable, "SchoolModeAppListPickerViewModel: $message")
        CrashlyticsLog.recordNonFatalError(throwable, message)
    }
}