package com.sosmartlabs.momo.watchsettings.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.firebase.FirebaseRemoteConfigRepository
import com.sosmartlabs.momo.main.model.UserRepository
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.watchrequests.model.UserPermission
import com.sosmartlabs.momo.models.WatchSettings
import com.sosmartlabs.momo.watchsettings.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class WatchSettingsViewModel @Inject constructor(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val userRepository: UserRepository,
    private val watchUserRepository: WatchUserRepository,
    private val wearerRepository: WearerRepository,
    private val settingsRepository: SettingsRepository,
    private val aclRepository: AclRepository,
    private val locationTools: LocationTools
) : ViewModel() {

    enum class WatchSettingStatus {
        UPDATED_TIMEZONE, TIMEZONE_ERROR,
        UPDATED_LANGUAGE, LANGUAGE_ERROR, UPDATED_SOUND, SOUND_ERROR
    }

    enum class WatchCommands { FIND_PHONE, TURN_OFF }

    enum class WatchError { REMOVING_ADMIN_ERROR, DELETE_ERROR }

    private val aclMutex = Mutex()

    private val _watch = MutableLiveData<Resource<Wearer, WatchError>>()
    val watch: LiveData<Resource<Wearer, WatchError>> get() = _watch

    private val _watchFunctions = MutableLiveData<Resource<Wearer, WatchCommands>>()
    val watchCommands get() = _watchFunctions

    private val _watchSettings = MutableLiveData<Resource<WatchSettings, WatchSettingStatus>>()
    val watchSettings: LiveData<Resource<WatchSettings, WatchSettingStatus>> get() = _watchSettings

    private val _userPermission = MutableLiveData<UserPermission>()
    val userPermission: LiveData<UserPermission> get() = _userPermission

    fun getWatchImmediate(watchId: String): Wearer? {
        return watchUserRepository.findLocalWatchByWatchId(watchId)
    }

    fun loadWatchSettings(watchId: String) {
        Timber.d("loadWatchSettings")
        Firebase.crashlytics.log("Fetching watch settings")
        _watchSettings.value = Resource(Resource.Status.LOADING)
        viewModelScope.launch(ioContext) {
            var watchUserData: WatchUser? = null
            runCatching {
                aclMutex.withLock {
                    watchUserData = watchUserRepository.findWatchUserByWatchId(watchId, userRepository.getCurrentUser()!!)
                    settingsRepository.fetchWatchSettings(watchUserData!!.watch!!)
                }
            }.onSuccess {
                _watch.postValue(Resource(Resource.Status.LOAD_SUCCESS, watchUserData!!.watch))
                _userPermission.postValue(watchUserData!!.userPermission)
                _watchSettings.postValue(
                    Resource(Resource.Status.LOAD_SUCCESS,
                        watchUserData!!.watch!!.settings.apply {
                            isInEurope = if (watchUserData!!.watch!!.lastKnownLocation != null)
                                locationTools.isLocationInEurope(
                                    watchUserData!!.watch!!.lastKnownLocation!!.latitude,
                                    watchUserData!!.watch!!.lastKnownLocation!!.longitude
                                )
                            else false
                        })
                )
                if (it.isInEurope && it.autoAnswer) {
                    runCatching {
                        aclMutex.withLock {
                            settingsRepository.updateWatchSettings(it.apply { autoAnswer = false })
                        }
                    }.onFailure { e ->
                        CrashlyticsLog.recordNonFatalError(
                            e,
                            "Error on disabling auto answer for Europe watch"
                        )
                    }
                }
            }.onFailure {
                CrashlyticsLog.recordNonFatalError(
                    it,
                    "Error fetching watch settings. Trying to setup ACLs"
                )
                runCatching {
                    val watch = aclMutex.withLock {
                        watchUserData?.watch ?: watchUserRepository.findWatchById(watchId)
                    }
                    setupAcl(watch)
                }.onFailure { e ->
                    CrashlyticsLog.recordNonFatalError(e, "Error trying to setup ACLs")
                    _watchSettings.postValue(Resource(Resource.Status.LOAD_ERROR))
                }
            }
        }
    }

    private suspend fun setupAcl(watch: Wearer, retryCount: Int = 0) {
        val clientSkipSetupGlobalAcl = FirebaseRemoteConfigRepository.clientSkipSetupGlobalAcl
        if (!clientSkipSetupGlobalAcl) {
            runCatching {
                aclMutex.withLock {
                    _watch.postValue(Resource(Resource.Status.LOAD_SUCCESS, watch))
                    aclRepository.setupWatchGlobalAcl(watch)
                    settingsRepository.fetchWatchSettings(watch)
                }
            }.onSuccess {
                _watchSettings.postValue(
                    Resource(
                        Resource.Status.LOAD_SUCCESS,
                        watch.settings
                    )
                )
            }.onFailure {
                CrashlyticsLog.recordNonFatalError(it, "Error executing setup ACL cloud function.")
                _watchSettings.postValue(Resource(Resource.Status.LOAD_ERROR))
                if (retryCount < MAX_ACL_RETRIES) {
                    delay(1000)
                    setupAcl(watch, retryCount + 1)
                }
            }
        }
    }

    companion object {
        private const val MAX_ACL_RETRIES = 3
    }

    private fun updateWatchSettings(
        settings: WatchSettings, successStatus: WatchSettingStatus,
        errorStatus: WatchSettingStatus
    ) {
        if (!settings.isDirty) return
        _watchSettings.value = Resource(Resource.Status.UPDATING, settings)
        externalScope.launch(ioContext) {
            runCatching {
                aclMutex.withLock {
                    settingsRepository.updateWatchSettings(settings)
                }
            }.onSuccess {
                _watchSettings.postValue(
                    Resource(
                        Resource.Status.UPDATING_SUCCESS, settings,
                        successStatus
                    )
                )
            }.onFailure {
                CrashlyticsLog.recordNonFatalError(it, "Error updating watch settings.")
                settings.revert()
                _watchSettings.postValue(
                    Resource(
                        Resource.Status.UPDATING_ERROR, settings,
                        errorStatus
                    )
                )
            }
        }
    }

    fun updateWatchSettingsTime(settings: WatchSettings) {
        updateWatchSettings(
            settings, WatchSettingStatus.UPDATED_TIMEZONE,
            WatchSettingStatus.TIMEZONE_ERROR
        )
    }

    fun updateWatchSettingsLanguage(settings: WatchSettings) {
        updateWatchSettings(
            settings, WatchSettingStatus.UPDATED_LANGUAGE,
            WatchSettingStatus.LANGUAGE_ERROR
        )
    }

    fun updateWatchSettingsSound(settings: WatchSettings) {
        updateWatchSettings(
            settings, WatchSettingStatus.UPDATED_SOUND,
            WatchSettingStatus.SOUND_ERROR
        )
    }

    fun findWatch(watch: Wearer) {
        _watchFunctions.value = Resource(Resource.Status.LOADING, watch, WatchCommands.FIND_PHONE)
        externalScope.launch(ioContext) {
            runCatching {
                aclMutex.withLock {
                    wearerRepository.findWearer(mapOf("deviceId" to watch.deviceId))
                }
            }.onSuccess {
                _watchFunctions.postValue(
                    Resource(
                        Resource.Status.LOAD_SUCCESS, watch,
                        WatchCommands.FIND_PHONE
                    )
                )
            }.onFailure {
                CrashlyticsLog.recordNonFatalError(it, "Error finding watch for settings.")
                _watchFunctions.postValue(
                    Resource(
                        Resource.Status.LOAD_ERROR, watch,
                        WatchCommands.FIND_PHONE
                    )
                )
            }
        }
    }

    fun turnOffWatch(watch: Wearer) {
        _watchFunctions.value = Resource(Resource.Status.LOADING, watch, WatchCommands.TURN_OFF)
        externalScope.launch(ioContext) {
            runCatching {
                aclMutex.withLock {
                    wearerRepository.turnOffWearer(mapOf("deviceId" to watch.deviceId))
                }
            }.onSuccess {
                _watchFunctions.postValue(
                    Resource(
                        Resource.Status.LOAD_SUCCESS, watch,
                        WatchCommands.TURN_OFF
                    )
                )
            }.onFailure {
                CrashlyticsLog.recordNonFatalError(
                    it,
                    "Error executing turning watch off function."
                )
                _watchFunctions.postValue(
                    Resource(
                        Resource.Status.LOAD_ERROR, watch,
                        WatchCommands.TURN_OFF
                    )
                )
            }
        }
    }

    fun removeWearer(wearer: Wearer) {
        _watch.value = Resource(Resource.Status.DELETING, wearer)
        var answer: Int? = null
        externalScope.launch(ioContext) {
            runCatching {
                aclMutex.withLock {
                    answer = wearerRepository.removeWearer(mapOf("deviceId" to wearer.deviceId))
                }
            }.onSuccess {
                when (answer) {
                    in listOf(null, -2, 0) -> {
                        _watch.postValue(
                            Resource(
                                Resource.Status.DELETING_ERROR,
                                wearer,
                                WatchError.DELETE_ERROR
                            )
                        )
                    }
                    -1 -> {
                        _watch.postValue(
                            Resource(
                                Resource.Status.DELETING_ERROR,
                                wearer,
                                WatchError.REMOVING_ADMIN_ERROR
                            )
                        )
                    }
                    else -> {
                        _watch.postValue(Resource(Resource.Status.DELETING_SUCCESS, wearer))
                    }
                }
            }.onFailure {
                CrashlyticsLog.recordNonFatalError(
                    it,
                    "Error executing remove wearer cloud function."
                )
                _watch.postValue(
                    Resource(
                        Resource.Status.DELETING_ERROR, wearer,
                        WatchError.DELETE_ERROR
                    )
                )
            }
        }
    }
}
