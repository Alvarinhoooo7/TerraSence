package com.sosmartlabs.momo.installedapp.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.installedapp.model.InstalledAppListItem
import com.sosmartlabs.momo.installedapp.repository.InstalledAppRepository
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class InstalledAppViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val installedAppRepository: InstalledAppRepository
) : ViewModel() {

    lateinit var watch: Wearer

    private var currentLocale: String = "en"
    private var selectedPackageName: String? = null

    private val _installedAppList = MutableLiveData<Resource<List<InstalledAppListItem>, Unit>>()
    val installedAppList: LiveData<Resource<List<InstalledAppListItem>, Unit>> get() = _installedAppList

    private val _currentInstalledApp = MutableLiveData<Resource<InstalledAppListItem, Unit>>()
    val currentInstalledApp: LiveData<Resource<InstalledAppListItem, Unit>> get() = _currentInstalledApp

    fun getInstalledApps(locale: String) {
        currentLocale = locale
        val currentItems = _installedAppList.value?.data
        _installedAppList.value = Resource(Resource.Status.LOADING, currentItems)
        viewModelScope.launch(ioContext) {
            runCatching {
                installedAppRepository.getInstalledApps(watch, locale)
            }.onSuccess { installedApps ->
                _installedAppList.postValue(Resource(Resource.Status.LOAD_SUCCESS, installedApps))
                syncSelectedInstalledApp(installedApps)
            }.onFailure {
                handleException(
                    it,
                    _installedAppList,
                    Resource.Status.LOAD_ERROR,
                    "Error loading installed app list",
                    currentItems
                )
            }
        }
    }

    fun refreshInstalledApps() {
        getInstalledApps(currentLocale)
    }

    fun setSelectedInstalledApp(packageName: String?) {
        selectedPackageName = packageName?.takeIf { it.isNotBlank() }
        syncSelectedInstalledApp(postValue = false)
    }

    fun updateInstalledAppPolicy(allowed: Boolean, dailyMinutesLimit: Int) {
        val currentItem = resolveSelectedInstalledApp() ?: currentInstalledApp.value?.data ?: return
        _currentInstalledApp.value = Resource(Resource.Status.UPDATING, currentItem)
        viewModelScope.launch(ioContext) {
            runCatching {
                installedAppRepository.updateInstalledAppPolicy(
                    watch = watch,
                    packageName = currentItem.packageName,
                    allowed = allowed,
                    dailyMinutesLimit = dailyMinutesLimit,
                    locale = currentLocale
                )
            }.onSuccess { updatedItem ->
                _currentInstalledApp.postValue(Resource(Resource.Status.UPDATING_SUCCESS, updatedItem))
                val wasPatched = patchInstalledAppList(updatedItem)
                if (!wasPatched) {
                    reloadInstalledAppsAfterUpdate()
                }
            }.onFailure {
                handleException(
                    it,
                    _currentInstalledApp,
                    Resource.Status.UPDATING_ERROR,
                    "Error updating installed app policy",
                    currentItem
                )
            }
        }
    }

    private fun patchInstalledAppList(updatedItem: InstalledAppListItem): Boolean {
        val currentItems = installedAppList.value?.data ?: return false
        if (currentItems.none { it.packageName == updatedItem.packageName }) {
            return false
        }
        val updatedItems = currentItems.map { installedAppItem ->
            if (installedAppItem.packageName == updatedItem.packageName) {
                updatedItem
            } else {
                installedAppItem
            }
        }
        _installedAppList.postValue(Resource(Resource.Status.LOAD_SUCCESS, updatedItems))
        return true
    }

    private suspend fun reloadInstalledAppsAfterUpdate() {
        val currentItems = _installedAppList.value?.data
        runCatching {
            installedAppRepository.getInstalledApps(watch, currentLocale)
        }.onSuccess {
            _installedAppList.postValue(Resource(Resource.Status.LOAD_SUCCESS, it))
        }.onFailure {
            handleException(
                it,
                _installedAppList,
                Resource.Status.LOAD_ERROR,
                "Error loading installed app list",
                currentItems
            )
        }
    }

    private fun syncSelectedInstalledApp(
        installedApps: List<InstalledAppListItem>? = _installedAppList.value?.data,
        postValue: Boolean = true
    ) {
        val selectedInstalledApp = resolveSelectedInstalledApp(installedApps)
        val resource: Resource<InstalledAppListItem, Unit>? =
            if (selectedInstalledApp == null) {
                null
            } else {
                Resource(Resource.Status.LOAD_SUCCESS, selectedInstalledApp)
            }
        if (postValue) {
            _currentInstalledApp.postValue(resource)
        } else {
            _currentInstalledApp.value = resource
        }
    }

    private fun resolveSelectedInstalledApp(
        installedApps: List<InstalledAppListItem>? = _installedAppList.value?.data
    ): InstalledAppListItem? {
        val packageName = selectedPackageName ?: return null
        return installedApps?.firstOrNull { it.packageName == packageName }
    }

    private fun <T, U> handleException(
        exception: Throwable,
        liveData: MutableLiveData<Resource<T, U>>,
        defaultStatus: Resource.Status,
        errorLog: String,
        resourceData: T? = null
    ) {
        Timber.d(exception)

        with(Firebase.crashlytics) {
            log(errorLog)
            recordException(exception)
        }

        if (exception is InstalledAppRepository.ConnectionException) {
            liveData.postValue(Resource(defaultStatus, resourceData))
        } else {
            liveData.postValue(Resource(Resource.Status.UNKNOWN_ERROR, resourceData))
        }
    }

}
