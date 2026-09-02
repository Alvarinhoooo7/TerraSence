package com.sosmartlabs.momo.usersettings.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.parse.ParseUser
import com.sosmartlabs.momo.main.model.UserRepository
import com.sosmartlabs.momo.sharedprefs.SharedPrefs
import com.sosmartlabs.momo.usersettings.model.UserSettingsRepository
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class UserSettingsViewModel @Inject constructor(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val sp: SharedPrefs,
    private val userRepository: UserRepository,
    private val userSettingsApp: UserSettingsRepository
) : ViewModel() {

    private val _state = MutableLiveData<SettingsState>()
    val state: LiveData<SettingsState> get() = _state

    private val _isImperialMeasureSystem = MutableLiveData<Boolean>()
    val isImperialMeasureSystem: LiveData<Boolean> get() = _isImperialMeasureSystem

    private val _currentUser = MutableLiveData<ParseUser>()
    val currentUser: LiveData<ParseUser> get() = _currentUser

    fun loadSettingsApp() {
        Timber.d("UserSettingsViewModel: Loading settings app")
        CrashlyticsLog.log("UserSettingsViewModel starting to load settings")
        _state.postValue(SettingsState.LOADING)
        
        externalScope.launch(ioContext) {
            runCatching {
                _isImperialMeasureSystem.postValue(sp.isImperialSystem)
                Timber.d("UserSettingsViewModel: Getting current user")
                CrashlyticsLog.log("UserSettingsViewModel fetching current user")
                val currentUser = userRepository.getCurrentUser()
                requireNotNull(currentUser) { "Current user is null" }
                currentUser
            }.onSuccess { user ->
                Timber.d("UserSettingsViewModel: Current user loaded successfully: ${user.objectId}")
                CrashlyticsLog.log("UserSettingsViewModel loading settings for user ${user.objectId}")
                
                runCatching {
                    userSettingsApp.getUserSettingsApp(user)
                }.onSuccess {
                    Timber.d("UserSettingsViewModel: Settings loaded successfully")
                    CrashlyticsLog.log("UserSettingsViewModel settings loaded successfully")
                    _currentUser.postValue(user)
                    _state.postValue(SettingsState.LOADING_SUCCESS)
                }.onFailure { error ->
                    Timber.e("UserSettingsViewModel: Error loading settings: $error")
                    if (error is UserSettingsRepository.ConnectionException) {
                        _state.postValue(SettingsState.ERROR_CONNECTION)
                    } else {
                        _state.postValue(SettingsState.ERROR_LOADING)
                    }
                    CrashlyticsLog.recordNonFatalError(error, "Error loading userSettingsApp")
                }
            }.onFailure { error ->
                Timber.e("UserSettingsViewModel: Error getting current user: $error")
                _state.postValue(SettingsState.ERROR_LOADING)
                CrashlyticsLog.recordNonFatalError(error, "Error getting current user")
            }
        }
    }

    fun changeMeasureSystem(isImperial: Boolean) {
        Timber.d("UserSettingsViewModel: Changing measure system to imperial: $isImperial")
        CrashlyticsLog.log("UserSettingsViewModel changing measure system to imperial: $isImperial")
        _isImperialMeasureSystem.postValue(isImperial)
        
        runCatching {
            sp.isImperialSystem = isImperial
        }.onSuccess {
            Timber.d("UserSettingsViewModel: Measure system updated successfully")
            CrashlyticsLog.log("UserSettingsViewModel measure system updated successfully")
            _isImperialMeasureSystem.postValue(isImperial)
        }.onFailure { error ->
            Timber.e("UserSettingsViewModel: Error updating measure system: $error")
            _state.postValue(SettingsState.ERROR_UPDATE)
            CrashlyticsLog.recordNonFatalError(error, "Error update measure system")
        }
    }

    enum class SettingsState {
        LOADING,
        LOADING_SUCCESS,
        ERROR_LOADING,
        ERROR_CONNECTION,
        ERROR_UPDATE,
        SUCCESS_UPDATE
    }
}