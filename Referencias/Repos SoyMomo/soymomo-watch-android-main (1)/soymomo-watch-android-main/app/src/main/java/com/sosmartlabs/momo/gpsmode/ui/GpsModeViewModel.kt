package com.sosmartlabs.momo.gpsmode.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.gpsmode.model.GPSFrequency
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.watchsettings.ui.BaseSettingViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class GpsModeViewModel @Inject constructor(private val externalScope: CoroutineScope)
    : BaseSettingViewModel() {

    private val _isBatterySaveEnabled = MutableLiveData<Boolean>()
    val isBatterySaveEnabled: LiveData<Boolean> get() = _isBatterySaveEnabled

    private val _watch = MutableLiveData<Resource<Wearer, Unit>>()
    val watch: LiveData<Resource<Wearer, Unit>> get() = _watch

    private val _gpsFrequencySelected = MutableLiveData<GPSFrequency>()
    val gpsFrequencySelected: LiveData<GPSFrequency> get() = _gpsFrequencySelected

    override suspend fun fetchSettingInformation(watch: Wearer) {
        with (watch.settings) {
            if (has("batterySaveEnabled")) _isBatterySaveEnabled.postValue(batterySaveEnabled)
            _watch.postValue(Resource(Resource.Status.LOAD_SUCCESS, watch))
            _gpsFrequencySelected.postValue(GPSFrequency.fromSeconds(gpsFrequencySeconds))
        }
    }

    override fun onLoadingSettings() {
        _watch.postValue(Resource(Resource.Status.LOADING))
    }

    override fun onFetchSettingsError(watch: Wearer?) {
        _watch.postValue(Resource(Resource.Status.LOAD_ERROR))
    }

    fun saveGpsMode(gpsFrequency: GPSFrequency) {
        val watch = this.watch.value!!.data!!
        _watch.value = Resource(Resource.Status.UPDATING, watch)
        _gpsFrequencySelected.postValue(gpsFrequency)
        externalScope.launch(ioContext) {
            runCatching {
                settingsRepository.updateWatchSettings(watch.settings.apply {
                    this.gpsFrequencySeconds = gpsFrequency.seconds
                })
            }.onSuccess {
                _watch.postValue(Resource(Resource.Status.UPDATING_SUCCESS, watch))
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error saving GPS mode")
                    recordException(it)
                }
                settingsRepository.revertWatchSettings(watch.settings)
                _watch.postValue(Resource(Resource.Status.UPDATING_ERROR, watch))
            }
        }
    }

}