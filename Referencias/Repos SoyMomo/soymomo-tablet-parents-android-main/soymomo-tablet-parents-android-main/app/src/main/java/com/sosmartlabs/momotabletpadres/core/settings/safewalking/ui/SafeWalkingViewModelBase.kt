package com.sosmartlabs.momotabletpadres.core.settings.safewalking.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.SafeWalkingSettings
import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.SafeWalkingSettingsRepositoryBase
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlin.coroutines.CoroutineContext

abstract class SafeWalkingViewModelBase(application: Application): AndroidViewModel(application){

    protected abstract val safeWalkingSettingsRepository: SafeWalkingSettingsRepositoryBase

    private val _safeWalkingSettings = MutableLiveData<SafeWalkingSettings>()
    val safeWalkingSettings: LiveData<SafeWalkingSettings> get() = _safeWalkingSettings

    protected abstract val externalScope: CoroutineScope
    protected abstract val ioContext: CoroutineContext

    fun loadSettings(tablet: Tablet) {
        viewModelScope.launch(ioContext) {
            _safeWalkingSettings.postValue(safeWalkingSettingsRepository.getSafeWalkingSettings(tablet))
        }
    }

    fun setNotificationType(tablet: Tablet, notificationType: Int) {
        externalScope.launch(ioContext) {
            val updatedSafeWalkingSettings = safeWalkingSettingsRepository.setNotificationType(tablet, notificationType)
            _safeWalkingSettings.postValue(updatedSafeWalkingSettings)
        }
    }

    fun setIsEnabled(tablet: Tablet, isEnabled: Boolean) {
        externalScope.launch(ioContext) {
            val updatedSafeWalkingSettings = safeWalkingSettingsRepository.setIsEnabled(tablet, isEnabled)
            _safeWalkingSettings.postValue(updatedSafeWalkingSettings)
        }
    }

    fun setIsSoundEnabled(tablet: Tablet, isEnabled: Boolean) {
        externalScope.launch(ioContext) {
            val updatedSafeWalkingSettings = safeWalkingSettingsRepository.setIsSoundEnabled(tablet, isEnabled)
            _safeWalkingSettings.postValue(updatedSafeWalkingSettings)
        }
    }

    fun setIsVibrationEnabled(tablet: Tablet, isEnabled: Boolean) {
        externalScope.launch(ioContext) {
            val updatedSafeWalkingSettings = safeWalkingSettingsRepository.setIsVibrationEnabled(tablet, isEnabled)
            _safeWalkingSettings.postValue(updatedSafeWalkingSettings)
        }
    }

}