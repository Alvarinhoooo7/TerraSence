package com.sosmartlabs.momo.watchsettings.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.firebase.FirebaseRemoteConfigRepository
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.watchsettings.model.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.util.*
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
open class BaseSettingViewModel @Inject constructor(): ViewModel() {

    @Inject lateinit var ioContext: CoroutineContext
    @Inject lateinit var watchUserRepository: WatchUserRepository
    @Inject lateinit var settingsRepository: SettingsRepository

    private val _isWatchConnected = MutableLiveData<Boolean>()
    val isWatchConnected: LiveData<Boolean> get() = _isWatchConnected

    fun fetchInformation(watchId: String) {
        onLoadingSettings()
        Firebase.crashlytics.log("Fetching watch information in Settings")
        viewModelScope.launch(ioContext) {
            lateinit var watch: Wearer
            runCatching {
                watch = watchUserRepository.findWatchById(watchId)
                settingsRepository.fetchWatchSettingsIfNeeded(watch)
            }.onSuccess {
                calculateBatteryInformation(watch)
                fetchSettingInformation(watch)
            }
        }
    }

    private fun calculateBatteryInformation(watch: Wearer) {
        _isWatchConnected.postValue(!(watch.has("lastTKQ")
                && Calendar.getInstance().timeInMillis - watch.getDate("lastTKQ")!!.time > TimeUnit.MINUTES.toMillis(
            FirebaseRemoteConfigRepository.thresholdMinutesLastTKQ)))
    }

    protected open suspend fun fetchSettingInformation(watch: Wearer) {}

    protected open fun onLoadingSettings() {}

    protected open fun onFetchSettingsError(watch: Wearer?) {}
}