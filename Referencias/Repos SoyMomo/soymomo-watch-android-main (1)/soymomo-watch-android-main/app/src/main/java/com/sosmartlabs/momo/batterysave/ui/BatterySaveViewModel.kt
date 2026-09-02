package com.sosmartlabs.momo.batterysave.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.models.WatchSettings
import com.sosmartlabs.momo.watchsettings.ui.BaseSettingViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class BatterySaveViewModel @Inject constructor(private val externalScope: CoroutineScope)
    : BaseSettingViewModel() {

    private val _isBatterySaveEnabled = MutableLiveData<Resource<Boolean, Unit>>()
    val isBatterySaveEnabled: LiveData<Resource<Boolean, Unit>> get() = _isBatterySaveEnabled

    private lateinit var settings: WatchSettings

    override fun onLoadingSettings() {
        _isBatterySaveEnabled.postValue(Resource(Resource.Status.LOADING))
    }

    override suspend fun fetchSettingInformation(watch: Wearer) {
        settings = watch.settings
        with (settings) {
            if (has("batterySaveEnabled")) {
                _isBatterySaveEnabled.postValue(Resource(Resource.Status.LOAD_SUCCESS, batterySaveEnabled))
            } else {
                batterySaveEnabled = false
                _isBatterySaveEnabled.postValue(Resource(Resource.Status.LOAD_SUCCESS, false))
            }
        }
    }

    override fun onFetchSettingsError(watch: Wearer?) {
        _isBatterySaveEnabled.postValue(Resource(Resource.Status.LOAD_ERROR))
    }

    fun setBatterySaveEnabled(enabled: Boolean) {
        _isBatterySaveEnabled.value = Resource(Resource.Status.UPDATING)
        externalScope.launch(ioContext) {
            runCatching {
                settings.batterySaveEnabled = enabled
                settingsRepository.updateWatchSettings(settings)
            }.onSuccess {
                _isBatterySaveEnabled.postValue(Resource(Resource.Status.UPDATING_SUCCESS, enabled))
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error setting battery saving")
                    recordException(it)
                }
                settingsRepository.revertWatchSettings(settings)
                _isBatterySaveEnabled.postValue(Resource(Resource.Status.UPDATING_ERROR, settings.batterySaveEnabled))
            }
        }
    }
}