package com.sosmartlabs.momo.settingsapp.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.analytics.FirebaseAnalytics
import com.parse.ParseUser
import com.sosmartlabs.momo.dispatch.model.ParseInstallationRepository
import com.sosmartlabs.momo.geofences.model.Geofence
import com.sosmartlabs.momo.geofences.repository.GeofenceRepository
import com.sosmartlabs.momo.main.model.UserRepository
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.settingsapp.model.SessionStatus
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.repository.SubscriptionRepository
import com.sosmartlabs.momo.ble.BleProximityScanWorkerCreator
import com.sosmartlabs.momo.ble.ProximityLocationUploader
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.sim.model.SubscriptionStatus
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class SettingsAppViewModel @Inject constructor(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val userRepository: UserRepository,
    private val watchUserRepository: WatchUserRepository,
    private val parseInstallationRepository: ParseInstallationRepository,
    private val geofenceRepository: GeofenceRepository,
    private val subscriptionRepository: SubscriptionRepository,
    private val bleProximityScanWorkerCreator: BleProximityScanWorkerCreator,
    private val proximityLocationUploader: ProximityLocationUploader
) : ViewModel() {

    // region LiveData declarations

    private var _currentUser = MutableLiveData<Resource<ParseUser, Resource.Status>>()
    val currentUser: LiveData<Resource<ParseUser, Resource.Status>>
        get() = _currentUser

    private var _currentWatchUsers = MutableLiveData<Resource<MutableList<WatchUser>, Resource.Status>>()
    val currentWatchUsers: LiveData<Resource<MutableList<WatchUser>, Resource.Status>>
        get() = _currentWatchUsers

    private var _currentWearers = MutableLiveData<Resource<MutableList<Wearer>, Resource.Status>>()
    val currentWearers: LiveData<Resource<MutableList<Wearer>, Resource.Status>>
        get() = _currentWearers

    private var _subscriptionList = MutableLiveData<Resource<MutableList<Subscription>, Resource.Status>>()
    val subscriptionList: LiveData<Resource<MutableList<Subscription>, Resource.Status>>
        get() = _subscriptionList

    private var _geofenceList = MutableLiveData<Resource<List<Geofence>, Resource.Status>>()
    val geofenceList: LiveData<Resource<List<Geofence>, Resource.Status>>
        get() = _geofenceList

    private var _sessionStatus = MutableLiveData(SessionStatus.LOGGED_IN)
    val sessionStatus: LiveData<SessionStatus>
        get() = _sessionStatus

    // endregion

    init {
        Timber.d("SettingsAppViewModel: init called, loading current user")
        getCurrentUser()
    }

    /**
     * Loads the current user
     */
    fun getCurrentUser() {
        Timber.d("SettingsAppViewModel: getCurrentUser() called")
        viewModelScope.launch(ioContext) {
            runCatching {
                Timber.d("SettingsAppViewModel: Fetching current user from repository")
                userRepository.getCurrentUser()
            }.onSuccess { user ->
                Timber.i("SettingsAppViewModel: Successfully loaded current user: ${user?.objectId}")
                _currentUser.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = user))
            }.onFailure { e ->
                Timber.e(e, "SettingsAppViewModel: Error loading current user")
                CrashlyticsLog.recordNonFatalError(e, "SettingsAppViewModel: Error in getCurrentUser")
                _currentUser.postValue(Resource(status = Resource.Status.LOAD_ERROR))
            }
        }
    }

    /**
     * Loads the WatchUser including the [Wearer]
     * Params [currentUser]
     */
    fun getWatchUsersWithWearer(currentUser: ParseUser) {
        Timber.d("SettingsAppViewModel: getWatchUsersWithWearer() called for user: ${currentUser.objectId}")
        _currentWatchUsers.postValue(Resource(status = Resource.Status.LOADING))
        viewModelScope.launch(ioContext) {
            runCatching {
                Timber.d("SettingsAppViewModel: Fetching WatchUsers for user: ${currentUser.objectId}")
                watchUserRepository.getWatchUsers(currentUser)
            }.onSuccess { watchUsers ->
                Timber.i("SettingsAppViewModel: Loaded ${watchUsers.size} WatchUsers for user: ${currentUser.objectId}")
                _currentWatchUsers.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = watchUsers))
                getWearerList(watchUsers)
            }.onFailure { e ->
                Timber.e(e, "SettingsAppViewModel: Error loading WatchUsers for user: ${currentUser.objectId}")
                CrashlyticsLog.recordNonFatalError(e, "SettingsAppViewModel: Error in getWatchUsersWithWearer")
                _currentWatchUsers.postValue(Resource(status = Resource.Status.LOAD_ERROR))
            }
        }
    }

    /**
     * Loads the [Wearer] list from WatchUsers
     */
    private fun getWearerList(watchUsers: List<WatchUser>) {
        Timber.d("SettingsAppViewModel: getWearerList() called with ${watchUsers.size} WatchUsers")
        _currentWearers.postValue(Resource(status = Resource.Status.LOADING))
        viewModelScope.launch(ioContext) {
            runCatching {
                val wearers = mutableListOf<Wearer>()
                for (watchUser in watchUsers) {
                    if (watchUser.active) {
                        watchUser.watch?.let { wearer ->
                            Timber.d("SettingsAppViewModel: Adding active wearer: ${wearer.objectId}")
                            wearers.add(wearer)
                        }
                    }
                }
                Timber.i("SettingsAppViewModel: getWearerList found ${wearers.size} active wearers")
                wearers
            }.onSuccess { wearers ->
                _currentWearers.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = wearers))
                getSubscriptions(wearers)
            }.onFailure { e ->
                Timber.e(e, "SettingsAppViewModel: Error loading wearers from WatchUsers")
                CrashlyticsLog.recordNonFatalError(e, "SettingsAppViewModel: Error in getWearerList")
                _currentWearers.postValue(Resource(status = Resource.Status.LOAD_ERROR))
            }
        }
    }

    /**
     * Loads the Subscriptions for the given wearers
     */
    private fun getSubscriptions(wearers: List<Wearer>) {
        Timber.d("SettingsAppViewModel: getSubscriptions() called for ${wearers.size} wearers")
        _subscriptionList.postValue(Resource(status = Resource.Status.LOADING))
        viewModelScope.launch(ioContext) {
            runCatching {
                Timber.d("SettingsAppViewModel: Fetching subscriptions for wearers")
                subscriptionRepository.getSubscriptions(wearers)
            }.onSuccess { subscriptions ->
                val activeSubscriptions = subscriptions.filter {
                    val status = it.getSubscriptionStatus()
                    status == SubscriptionStatus.ACTIVE || status == SubscriptionStatus.PREACTIVATED ||
                            status == SubscriptionStatus.SUSPENDED
                }
                Timber.i("SettingsAppViewModel: Loaded ${activeSubscriptions.size} active/pre-activated subscriptions")
                _subscriptionList.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = activeSubscriptions.toMutableList()))
            }.onFailure { e ->
                Timber.e(e, "SettingsAppViewModel: Error loading subscriptions for wearers")
                CrashlyticsLog.recordNonFatalError(e, "SettingsAppViewModel: Error in getSubscriptions")
                _subscriptionList.postValue(Resource(status = Resource.Status.LOAD_ERROR))
            }
        }
    }

    /**
     * Loads the Geofences for the given user
     */
    fun getUserGeofences(currentUser: ParseUser) {
        Timber.d("SettingsAppViewModel: getUserGeofences() called for user: ${currentUser.objectId}")
        _geofenceList.postValue(Resource(status = Resource.Status.LOADING))
        viewModelScope.launch(ioContext) {
            runCatching {
                Timber.d("SettingsAppViewModel: Fetching geofences for user: ${currentUser.objectId}")
                geofenceRepository.getGeofenceByUser(currentUser)
            }.onSuccess { geofences ->
                Timber.i("SettingsAppViewModel: Loaded ${geofences.size} geofences for user: ${currentUser.objectId}")
                _geofenceList.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = geofences))
            }.onFailure { e ->
                Timber.e(e, "SettingsAppViewModel: Error loading geofences for user: ${currentUser.objectId}")
                CrashlyticsLog.recordNonFatalError(e, "SettingsAppViewModel: Error in getUserGeofences")
                _geofenceList.postValue(Resource(status = Resource.Status.LOAD_ERROR))
            }
        }
    }

    /**
     * Logout the current user
     */
    @OptIn(ExperimentalCoroutinesApi::class)
    fun logout() {
        Timber.d("SettingsAppViewModel: logout() called")
        bleProximityScanWorkerCreator.cancel()
        proximityLocationUploader.clearState()
        externalScope.launch(ioContext) {
            _sessionStatus.postValue(SessionStatus.LOGGING_OUT)
            Timber.i("SettingsAppViewModel: Logging out user")
            runCatching {
                userRepository.logout()
            }.onSuccess {
                Timber.i("SettingsAppViewModel: User logged out successfully, removing user from installation")
                runCatching {
                    parseInstallationRepository.removeUserFromInstallation()
                }.onSuccess {
                    Timber.i("SettingsAppViewModel: User removed from installation successfully")
                }.onFailure { e ->
                    Timber.e(e, "SettingsAppViewModel: Error removing user from installation in Parse")
                    CrashlyticsLog.recordNonFatalError(
                        e,
                        "SettingsAppViewModel: Error on removing user from installation in Parse"
                    )
                }
                _sessionStatus.postValue(SessionStatus.LOGGED_OUT)
                Timber.i("SettingsAppViewModel: Session status set to LOGGED_OUT")
            }.onFailure { e ->
                Timber.e(e, "SettingsAppViewModel: Error during logout")
                _sessionStatus.postValue(SessionStatus.LOGOUT_ERROR)
                CrashlyticsLog.recordNonFatalError(e, "SettingsAppViewModel: Error on logout from Main activity")
            }
        }
    }
}