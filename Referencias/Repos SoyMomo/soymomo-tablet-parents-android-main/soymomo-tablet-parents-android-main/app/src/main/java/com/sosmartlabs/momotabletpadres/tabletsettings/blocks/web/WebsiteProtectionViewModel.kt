package com.sosmartlabs.momotabletpadres.tabletsettings.blocks.web

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.tabletsettings.interfaces.TableListState
import com.sosmartlabs.momotabletpadres.tabletsettings.blocks.web.model.Website
import com.sosmartlabs.momotabletpadres.repositories.WebsitesRepository
import com.sosmartlabs.momotabletpadres.utils.NewNetworkStateChecker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class WebsiteProtectionViewModel @Inject constructor(
    application: Application,
    private val blockedWebsitesRepository: WebsitesRepository
) : AndroidViewModel(application) {

    val websiteList = MutableLiveData<List<Website>>()
    val tableListState = MutableLiveData<TableListState>()

    private lateinit var tablet: Tablet

    fun loadWebsites(tablet: Tablet) {
        Timber.d("WebsiteProtectionViewModel: loadWebsites - Called with tabletId=${tablet.objectId}")
        this.tablet = tablet
        tableListState.postValue(TableListState.Loading)
        Timber.d("WebsiteProtectionViewModel: loadWebsites - State set to Loading")
        viewModelScope.launch(Dispatchers.IO) {
            if (NewNetworkStateChecker.isThereInternetConnection(getApplication())) {
                Timber.d("WebsiteProtectionViewModel: loadWebsites - Internet connection available, fetching websites")
                lateinit var webSites: List<Website>
                runCatching {
                    Timber.d("WebsiteProtectionViewModel: loadWebsites - Calling blockedWebsitesRepository.getWebsites")
                    webSites = blockedWebsitesRepository.getWebsites(tablet)
                }.onSuccess {
                    Timber.d("WebsiteProtectionViewModel: loadWebsites - Successfully fetched ${webSites.size} websites")
                    if (webSites.isNotEmpty()) {
                        tableListState.postValue(TableListState.Populated)
                        Timber.d("WebsiteProtectionViewModel: loadWebsites - State set to Populated")
                    } else {
                        tableListState.postValue(TableListState.Empty)
                        Timber.d("WebsiteProtectionViewModel: loadWebsites - State set to Empty")
                    }
                    websiteList.postValue(webSites)
                    Timber.d("WebsiteProtectionViewModel: loadWebsites - websiteList LiveData updated")
                }.onFailure { throwable ->
                    Timber.e(throwable, "WebsiteProtectionViewModel: loadWebsites - Error fetching websites for tabletId=${tablet.objectId}")
                    CrashlyticsLog.recordNonFatalError(throwable, "WebsiteProtectionViewModel: loadWebsites - Error fetching websites for tabletId=${tablet.objectId}")
                    tableListState.postValue(TableListState.Error)
                    Timber.d("WebsiteProtectionViewModel: loadWebsites - State set to Error")
                }
            } else {
                Timber.w("WebsiteProtectionViewModel: loadWebsites - No internet connection, state set to Disconnected")
                tableListState.postValue(TableListState.Disconnected)
            }
        }
    }

    /**
     * Load the websites for the current tablet.
     * It requires that [loadWebsites] with a tablet as parameter has been called before. Otherwise,
     * will throw a NullPointerException.
     */
    fun loadWebsites() {
        Timber.d("WebsiteProtectionViewModel: loadWebsites() - Called with no parameters, using stored tablet")
        if (!::tablet.isInitialized) {
            val errorMsg = "WebsiteProtectionViewModel: loadWebsites() - Tablet not initialized. Call loadWebsites(tablet: Tablet) first."
            Timber.e(errorMsg)
            CrashlyticsLog.log(errorMsg)
            throw IllegalStateException(errorMsg)
        }
        loadWebsites(tablet)
    }

    fun createBlockedWebsite(url: String) {
        Timber.d("WebsiteProtectionViewModel: createBlockedWebsite - Called with url=$url")
        tableListState.postValue(TableListState.Loading)
        Timber.d("WebsiteProtectionViewModel: createBlockedWebsite - State set to Loading")
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                Timber.d("WebsiteProtectionViewModel: createBlockedWebsite - Creating blocked website in repository")
                blockedWebsitesRepository.createBlockedWebsite(tablet, url)
            }.onSuccess {
                Timber.d("WebsiteProtectionViewModel: createBlockedWebsite - Blocked website created successfully, reloading websites")
                loadWebsites(tablet)
            }.onFailure { throwable ->
                Timber.e(throwable, "WebsiteProtectionViewModel: createBlockedWebsite - Error creating blocked website for url=$url")
                CrashlyticsLog.recordNonFatalError(throwable, "WebsiteProtectionViewModel: createBlockedWebsite - Error creating blocked website for url=$url")
                tableListState.postValue(TableListState.Error)
                Timber.d("WebsiteProtectionViewModel: createBlockedWebsite - State set to Error")
            }
        }
    }

    fun dummyLoadForBug() {
        Timber.d("WebsiteProtectionViewModel: dummyLoadForBug - Called for reactivity bug workaround")
        //TODO: esto es hecho por el bug de reactividad
        val website = Website()
        website.allowed = true
        website.url = "soymomo_example"
        val list = ArrayList<Website>()
        list.add(website)
        websiteList.postValue(list)
        Timber.d("WebsiteProtectionViewModel: dummyLoadForBug - websiteList LiveData updated with dummy data")
        tableListState.postValue(TableListState.Populated)
        Timber.d("WebsiteProtectionViewModel: dummyLoadForBug - State set to Populated")
    }
}