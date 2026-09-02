package com.sosmartlabs.momo.dialpad.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.watchsettings.ui.BaseSettingViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DialPadViewModel @Inject constructor(private val externalScope: CoroutineScope)
    : BaseSettingViewModel() {

    private val _watch = MutableLiveData<Resource<Wearer, Unit>>()
    val watch: LiveData<Resource<Wearer, Unit>> get() = _watch

    override suspend fun fetchSettingInformation(watch: Wearer) {
        _watch.postValue(Resource(Resource.Status.LOAD_SUCCESS, watch))
    }

    override fun onLoadingSettings() {
        _watch.postValue(Resource(Resource.Status.LOADING))
    }

    override fun onFetchSettingsError(watch: Wearer?) {
        _watch.postValue(Resource(Resource.Status.LOAD_ERROR))
    }

    fun saveDialPadMode(dialPadEnabled: Boolean) {
        val watch = _watch.value!!.data!!
        _watch.value = Resource(Resource.Status.UPDATING, watch)
        externalScope.launch(ioContext) {
            runCatching {
                settingsRepository.updateWatchSettings(watch.settings.apply {
                    this.dialpadEnabled = dialPadEnabled
                })
            }.onSuccess {
                _watch.postValue(Resource(Resource.Status.UPDATING_SUCCESS, watch))
            }.onFailure {
                with (Firebase.crashlytics) {
                    log("Error saving dial pad mode")
                    recordException(it)
                }
                _watch.postValue(Resource(Resource.Status.UPDATING_ERROR, watch))
            }
        }
    }
}