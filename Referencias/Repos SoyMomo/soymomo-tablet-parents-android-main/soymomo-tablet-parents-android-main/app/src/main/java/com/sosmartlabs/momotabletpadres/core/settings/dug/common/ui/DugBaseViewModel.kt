package com.sosmartlabs.momotabletpadres.core.settings.dug.common.ui

import android.app.Application
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.appinfo.AppInfoViewModelBase
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.TableListState
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.AppDataRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.remote.getIconUrl
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

abstract class DugBaseViewModel(application: Application) : AppInfoViewModelBase(application) {

    protected abstract val appDataRepository: AppDataRepository

    /**
     * LiveData for showing the [TableListState] to the UI.
     * Private field, must be accesses through [tableListState] property
     */
    private val _tableListState = MutableLiveData<TableListState>()

    /**
     * LiveData for showing the [TableListState] to the UI.
     */
    val tableListState: LiveData<TableListState> get() = _tableListState

    /**
     * Indicates to the UI that mush show the loading view
     */
    protected fun setLoading() = _tableListState.postValue(TableListState.Loading)

    /**
     * Indicates to the UI that mush show the empty list view
     */
    protected fun setEmptyList() = _tableListState.postValue(TableListState.Empty)

    /**
     * Indicates to the UI that mush show the populated view
     */
    protected fun setPopulatedList() = _tableListState.postValue(TableListState.Populated)

    /**
     * Indicates to the UI that mush show the error view
     */
    protected fun setError() = _tableListState.postValue(TableListState.Error)

    /**
     * Load an app icon URL from AppDataRepository (same source as App Protection feature).
     * Calls back on the main thread with the URL (or null).
     */
    fun loadAppIconUrl(packageName: String, callback: (String?) -> Unit) {
        viewModelScope.launch(Dispatchers.IO) {
            val iconUrl = runCatching {
                appDataRepository.getAppData(packageName)?.getIconUrl()
            }.getOrNull()
            launch(Dispatchers.Main) { callback(iconUrl) }
        }
    }
}