package com.sosmartlabs.momo.main.ui

import androidx.lifecycle.*
import com.parse.ParseException
import com.parse.ParseUser
import com.sosmartlabs.momo.dispatch.model.ParseInstallationRepository
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.geofences.model.Geofence
import com.sosmartlabs.momo.geofences.repository.GeofenceRepository
import com.sosmartlabs.momo.main.model.LoginStatus
import com.sosmartlabs.momo.main.model.MainCardWatchUser
import com.sosmartlabs.momo.main.model.SaveNumberStatus
import com.sosmartlabs.momo.main.model.UserRepository
import com.sosmartlabs.momo.main.model.WatchUserError
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.sim.model.PaymentStatus
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionStatus
import com.sosmartlabs.momo.sim.repository.SubscriptionRepository
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

/**
 * ViewModel for Main activity
 * @param externalScope Scope for coroutine operations that must survive to this ViewModel lifecycle
 * @param ioContext Context for IO operations in coroutines
 * @param userRepository Repository for obtaining the current user
 * @param watchUserRepository Repository of WatchUsers
 * @param geofenceRepository Repository for geofence
 * @param parseInstallationRepository Repository for ParseInstallation
 */
private const val KEY_SELECTED_WATCH_ID = "selected_watch_id"

@ExperimentalCoroutinesApi
@HiltViewModel
class MainViewModel @Inject constructor(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val userRepository: UserRepository,
    private val watchUserRepository: WatchUserRepository,
    private val geofenceRepository: GeofenceRepository,
    private val parseInstallationRepository: ParseInstallationRepository,
    private val subscriptionRepository: SubscriptionRepository,
    private val savedStateHandle: SavedStateHandle
) : ViewModel(), LifecycleEventObserver {

    /**
     * objectId of the currently selected watch. Backed by SavedStateHandle so the
     * selection survives rotation and process death; MainActivity restores by id
     * once the watch list commits.
     */
    var selectedWatchId: String?
        get() = savedStateHandle[KEY_SELECTED_WATCH_ID]
        set(value) {
            savedStateHandle[KEY_SELECTED_WATCH_ID] = value
        }

    /**
     * List with the current WatchUsers
     */
    private lateinit var watchUsers: List<WatchUser>

    /**
     * LiveData for updating the WatchUsers list.
     * Must be accessed through the [watchUserList] public getter from activity
     */
    private val _watchUserList = MutableLiveData<Resource<List<MainCardWatchUser>, WatchUserError>>()

    /**
     * LiveData for updating the WatchUsers list.
     */
    val watchUserList: LiveData<Resource<List<MainCardWatchUser>, WatchUserError>> get() = _watchUserList

    /**
     * LiveData for getting the current user.
     * Must be accessed through the [currentUser] public getter from activity
     */
    private val _currentUser = MutableLiveData<ParseUser>()

    /**
     * LiveData for getting the current user.
     */
    val currentUser: LiveData<ParseUser> get() = _currentUser

    /**
     * LiveData for obtaining updates in a MainCardWatchUser.
     * Must be accessed through the [watchUserUpdate] public getter from activity
     */
    private val _watchUserUpdate = MutableLiveData<MainCardWatchUser>()

    /**
     * LiveData for obtaining updates in a MainCardWatchUser.
     */
    val watchUserUpdate: LiveData<MainCardWatchUser> get() = _watchUserUpdate

    /**
     * LiveData for current user login status.
     * Must be accessed through the [loginStatus] public getter from activity
     */
    private val _loginStatus = MutableLiveData(LoginStatus.LOGGED_IN)

    /**
     * LiveData for current user login status
     */
    val loginStatus: LiveData<LoginStatus> get() = _loginStatus

    /**
     * Live data save enter number
     */
    private val _saveNumberStatusEnter = MutableLiveData<SaveNumberStatus>()

    val saveNumberStatus: LiveData<SaveNumberStatus> get() = _saveNumberStatusEnter

    /**
     * Live data send CR
     */
    private val _liveDataSendCr = MutableLiveData<Resource<List<String>, Unit>>()
    val liveDataSendCr: LiveData<Resource<List<String>, Unit>> get() = _liveDataSendCr

    /**
     * Live data set parse user
     */
    private val _setParseUser = MutableLiveData<Resource<Wearer, Unit>>()
    val setParseUser: LiveData<Resource<Wearer, Unit>> get() = _setParseUser

    /**
     * Job that collects updates in watchUser
     */
    private var collectWatchUsersJob: Job? = null

    /**
     * Job that collect updates in watches
     */
    private var collectWatchesUpdatesJob: Job? = null

    /**
     * Job that collects updates in user permissions
     */
    private var collectPermissionsUpdatesJob: Job? = null

    private val liveQueryMutex = Mutex()

    /**
     * LiveData for obtaining Geofence data for the current user
     * Must be accessed through the [userGeofence] public getter from activity
     */
    private val _userGeofence = MutableLiveData<Resource<List<Geofence>, ParseException>>()

    /**
     * LiveData for obtaining Geofence data for the current user
     */
    val userGeofence: LiveData<Resource<List<Geofence>, ParseException>> get() = _userGeofence

    /**
     * LiveData for tracking if there's a pending payment in any subscription.
     * Must be accessed through the [hasPendingPayment] public getter from activity
     */
    private val _hasPendingPayment = MutableLiveData<Boolean>(false)

    /**
     * LiveData for tracking if there's a pending payment in any subscription.
     */
    val hasPendingPayment: LiveData<Boolean> get() = _hasPendingPayment

    /**
     * LiveData exposing the most recently fetched list of subscriptions for the
     * current user's wearers. Populated alongside [hasPendingPayment] in
     * [checkSubscriptionsForPendingPayment]. Mirrors iOS
     * `RefactorMainViewModel.subscriptionList` so the upgrade-plan popup can
     * observe it.
     */
    private val _subscriptionList = MutableLiveData<List<Subscription>>(emptyList())
    val subscriptionList: LiveData<List<Subscription>> get() = _subscriptionList

    /**
     * Reacts when a change on the lifecycle occurs
     */
    override fun onStateChanged(source: LifecycleOwner, event: Lifecycle.Event) {
        Timber.d("MainViewModel: onStateChanged: $event")
        CrashlyticsLog.log("MainViewModel lifecycle event: $event")
        when (event) {
            Lifecycle.Event.ON_RESUME -> {
                startDataUpdates()
            }
            Lifecycle.Event.ON_PAUSE -> {
                pauseDataUpdates()
            }
            else -> {
                // No-Op
            }
        }
    }

    /**
     * Start receiving of data updates from repository
     */
    private fun startDataUpdates() {
        Timber.d("MainViewModel: startDataUpdates")
        CrashlyticsLog.log("MainViewModel starting data updates")

        // Deliberately NO cached re-post here. isConnected() is time-based (lastTKQ
        // within thresholdMinutesLastTKQ of NOW), so after a long background the
        // cached list re-evaluates as disconnected and a re-post repainted the whole
        // screen red (card, selector ring, banner) until the fresh fetch corrected
        // it seconds later. The re-post was redundant anyway: a resumed activity
        // still shows its pre-pause views, a recreated one receives the last list
        // via LiveData stickiness, and observeWatchUsers' LOADING branch already
        // keeps the cached UI while the fresh fetch is in flight.

        if (::watchUsers.isInitialized && currentUser.value != null) {
            viewModelScope.launch(ioContext) {
                Timber.d("MainViewModel: startDataUpdates: parallel loadUserGeofence and startLoadingWatchUsers with ${currentUser.value?.objectId}")
                CrashlyticsLog.log("MainViewModel parallel loading geofence and watch users for user ${currentUser.value?.objectId}")
                launch { loadUserGeofence(_currentUser.value!!) }
                launch { startLoadingWatchUsers(_currentUser.value!!) }
            }
        } else {
            Timber.d("MainViewModel: startDataUpdates: loadCurrentUser")
            CrashlyticsLog.log("MainViewModel loading current user")
            loadCurrentUser()
        }
    }

    /**
     * Pause receiving data updates from repository
     */
    private fun pauseDataUpdates() {
        Timber.d("MainViewModel: pauseDataUpdates")
        CrashlyticsLog.log("MainViewModel pausing data updates")
        viewModelScope.launch(ioContext) {
            stopReceivingWatchUserUpdates()
            stopReceivingWatchUpdatesForUser()
        }
    }

    /**
     * Observer for WatchUser list in WatchUserRepository
     */
    private fun observeWatchUsers(it: Resource<List<WatchUser>, ParseException>) {
        Timber.d("MainViewModel: observeWatchUsers ${it.status} with data ${it.data?.size}")
        CrashlyticsLog.log("MainViewModel observing watch users with status ${it.status}")
        when (it.status) {
            Resource.Status.LOADING -> {
                // Only show a loading state if we don't have anything cached.
                if (!::watchUsers.isInitialized || watchUsers.isEmpty()) {
                    _watchUserList.postValue(Resource(Resource.Status.LOADING))
                } else {
                    Timber.d("MainViewModel: observeWatchUsers: LOADING but keeping cached UI")
                }
            }
            Resource.Status.LOAD_SUCCESS -> {
                viewModelScope.launch(ioContext) {
                    watchUsers = it.data!!
                    if (watchUsers.isEmpty()) {
                        _watchUserList.postValue(Resource(Resource.Status.LOAD_SUCCESS, emptyList()))
                        _hasPendingPayment.postValue(false)
                        return@launch
                    } else {
                        val sortedWatchUsers = sortWatchUsersByPriority(watchUsers)
                        _watchUserList.postValue(Resource(Resource.Status.LOAD_SUCCESS, sortedWatchUsers.map { watchUser ->
                            MainCardWatchUser(
                                watchUser
                            )
                        }))
                        launchWatchesUpdatesJob()
                        // Check subscriptions for pending payment
                        val wearers = watchUsers.mapNotNull { watchUser -> watchUser.watch }
                        if (wearers.isNotEmpty()) {
                            checkSubscriptionsForPendingPayment(wearers)
                        }
                    }
                }
            }
            Resource.Status.LOAD_ERROR -> {
                val exception = it.statusType
                // If session is invalid, we must propagate the error to force logout.
                if (exception?.code == ParseException.INVALID_SESSION_TOKEN) {
                    handleException(exception, "error on observing watch users")
                    return
                }

                // For transient failures (network/timeouts), keep cached UI visible.
                if (::watchUsers.isInitialized && watchUsers.isNotEmpty()) {
                    Timber.d("MainViewModel: observeWatchUsers: LOAD_ERROR but keeping cached UI")
                    CrashlyticsLog.recordNonFatalError(
                        exception ?: ParseException(ParseException.OTHER_CAUSE, "Unknown error"),
                        "MainViewModel: error on observing watch users (keeping cached data)"
                    )
                    return
                }

                if (exception != null) {
                    handleException(exception, "error on observing watch users")
                } else {
                    CrashlyticsLog.recordNonFatalError(
                        Exception("MainViewModel: observeWatchUsers LOAD_ERROR with null statusType"),
                        "MainViewModel: error on observing watch users"
                    )
                }
            }
            else -> {
                //NO-OP
            }
        }
    }

    /**
     * Launches and stores in [collectWatchesUpdatesJob] a new watch updates collecting job
     */
    private suspend fun launchWatchesUpdatesJob() {
        liveQueryMutex.withLock {
            Timber.d("MainViewModel: launchWatchesUpdatesJob")
            CrashlyticsLog.log("MainViewModel launching watches updates job")
            if (watchUsers.isEmpty()) return

            val watchList = watchUsers.mapNotNull { wu -> wu.watch }
            if (!watchUserRepository.shouldUpdateWatchUpdatesQuery(watchList)) return
            else stopReceivingWatchUpdatesForUser()

            collectWatchesUpdatesJob = viewModelScope.launch(ioContext) {
                watchUserRepository.subscribeWatchesUpdates(watchList)
                    .catch {
                        when (it) {
                            is ParseException -> handleException(
                                it,
                                "Error on subscribing watch updates"
                            )
                            is CancellationException -> return@catch
                            else -> CrashlyticsLog.recordNonFatalError(
                                it,
                                "Error on launch watches updates"
                            )
                        }
                    }
                    .map { wearer ->
                        wearer.apply {
                            if (watchUsers.find { watchUser -> watchUser.watch!!.objectId == wearer.objectId }?.userPermission?.location == false) {
                                wearer.lastKnownLocation = null
                            }
                        }
                    }
                    .collect { wearer -> postWatchUpdate(wearer) }
            }

            collectPermissionsUpdatesJob = viewModelScope.launch(ioContext) {
                watchUserRepository.subscribeWatchUserPermissionUpdate(watchUsers.map { it.userPermission })
                    .catch {
                        when (it) {
                            is ParseException -> handleException(
                                it,
                                "Error on subscribing watch user permissions updates"
                            )
                            is CancellationException -> return@catch
                            else -> CrashlyticsLog.recordNonFatalError(
                                it,
                                "Error on launch watch user permissions updates"
                            )
                        }
                    }
                    .collect { userPermission ->
                        withContext(Dispatchers.Main) {
                            val watchUserCards = _watchUserList.value?.data ?: return@withContext
                            val permissionId = userPermission.objectId ?: return@withContext
                            val card = watchUserCards.find {
                                it.watchUser.userPermission.objectId == permissionId
                            } ?: return@withContext
                            card.watchUser.userPermission = userPermission
                            _watchUserUpdate.value = card
                        }
                    }
            }
        }
    }

    /**
     * Observer for Wearer updates in WatchUserRepository
     */
    private suspend fun postWatchUpdate(watch: Wearer) {
        withContext(Dispatchers.Main) {
            val watchUserCards = _watchUserList.value?.data ?: return@withContext
            val card = watchUserCards.find { it.watchUser.watch?.objectId == watch.objectId }
                ?: return@withContext
            card.watchUser.watch = watch
            _watchUserUpdate.value = card
        }
    }

    /**
     * Starts periodic updates of WatchUsers information
     */
    private suspend fun startLoadingWatchUsers(user: ParseUser) {
        Timber.d("MainViewModel: startLoadingWatchUsers with user ${user.objectId}")
        CrashlyticsLog.log("MainViewModel starting watch users load for user ${user.objectId}")
        liveQueryMutex.withLock {
            with(viewModelScope) {
                if (watchUserRepository.isLoadingWatchesForUser(user) && collectWatchUsersJob?.isActive == true) {
                    Timber.d("MainViewModel: startLoadingWatchUsers: already collecting for this user, skipping")
                    return
                }

                Timber.d("MainViewModel: startLoadingWatchUsers: stopReceivingWatchUserUpdates")
                stopReceivingWatchUserUpdates()

                collectWatchUsersJob = launch(ioContext) {
                    Timber.d("MainViewModel: startLoadingWatchUsers: start collectWatchUsersJob")
                    watchUserRepository.loadWatchesForUser(user)
                        .catch { error ->
                            when (error) {
                                is ParseException -> handleException(
                                    error,
                                    "Error on start loading watch users"
                                )
                                is CancellationException -> return@catch // Ignore cancellation errors.
                                else -> CrashlyticsLog.recordNonFatalError(
                                    error,
                                    "Error on start loading watch users"
                                )
                            }
                        }
                        .collect { watchUsers ->
                            Timber.d("MainViewModel: startLoadingWatchUsers: collection from collectWatchUsersJob with ${watchUsers.data?.size}")
                            observeWatchUsers(watchUsers)
                        }
                }
            }
        }
    }

    /**
     * Loads the geofence for the current user
     */
    private suspend fun loadUserGeofence(user: ParseUser) {
        Timber.d("MainViewModel: loadUserGeofence with user ${user.objectId}")
        CrashlyticsLog.log("MainViewModel loading geofence for user ${user.objectId}")
        _userGeofence.postValue(Resource(Resource.Status.LOADING))
        runCatching {
            geofenceRepository.getGeofenceByUser(user)
        }.onSuccess {
            Timber.d("MainViewModel: loadUserGeofence: onSuccess with ${it.size} geofences")
            _userGeofence.postValue(Resource(Resource.Status.LOAD_SUCCESS, it))
        }.onFailure {
            Timber.e("MainViewModel: loadUserGeofence: onFailure with $it")
            CrashlyticsLog.log("MainViewModel error loading user geofence")
            when (it) {
                is ParseException -> {
                    CrashlyticsLog.recordNonFatalError(it, "Error loading user geofence")
                    _userGeofence.postValue(Resource(Resource.Status.LOAD_ERROR, null, it))
                    if (it.code == ParseException.INVALID_SESSION_TOKEN) {
                        postWatchUserLoadError(WatchUserError.INVALID_SESSION)
                    }
                }
                is CancellationException -> return
                else -> throw it
            }
        }
    }

    /**
     * Checks if any subscription has a pending payment status.
     * Fetches subscriptions for the given wearers, filters for active/preactivated status,
     * and checks if any has PaymentStatus.PENDING.
     *
     * @param wearers List of Wearer objects to check subscriptions for.
     */
    private suspend fun checkSubscriptionsForPendingPayment(wearers: List<Wearer>) {
        Timber.d("MainViewModel: checkSubscriptionsForPendingPayment for ${wearers.size} wearers")
        CrashlyticsLog.log("MainViewModel checking subscriptions for pending payment")
        runCatching {
            subscriptionRepository.getSubscriptions(wearers)
        }.onSuccess { subscriptions ->
            _subscriptionList.postValue(subscriptions.toList())
            val activeSubscriptions = subscriptions.filter {
                val status = it.getSubscriptionStatus()
                status == SubscriptionStatus.ACTIVE || status == SubscriptionStatus.PREACTIVATED ||
                        status == SubscriptionStatus.SUSPENDED
            }
            // SUSPENDED counts as pending by STATUS (service already cut over an
            // unpaid bill), even if the derived payment credentials are inconsistent.
            val hasPending = activeSubscriptions.any {
                it.getPaymentStatus() == PaymentStatus.PENDING ||
                        it.getSubscriptionStatus() == SubscriptionStatus.SUSPENDED
            }
            Timber.d("MainViewModel: checkSubscriptionsForPendingPayment: ${activeSubscriptions.size} active subscriptions, hasPending=$hasPending")
            _hasPendingPayment.postValue(hasPending)
        }.onFailure { e ->
            Timber.e(e, "MainViewModel: checkSubscriptionsForPendingPayment: error fetching subscriptions")
            CrashlyticsLog.recordNonFatalError(e, "Error checking subscriptions for pending payment")
            _hasPendingPayment.postValue(false)
        }
    }

    /**
     * Handles ParseExceptions
     * @param exception ParseException to handle
     */
    private fun handleException(exception: ParseException, logMessage: String) {
        CrashlyticsLog.log("MainViewModel handling exception: $logMessage")
        CrashlyticsLog.recordNonFatalError(exception, logMessage)
        when (exception.code) {
            ParseException.CONNECTION_FAILED ->
                postWatchUserLoadError(WatchUserError.CONNECTION_ERROR)
            ParseException.INVALID_SESSION_TOKEN ->
                postWatchUserLoadError(WatchUserError.INVALID_SESSION)
            ParseException.TIMEOUT -> postWatchUserLoadError(WatchUserError.TIMEOUT)
            else -> postWatchUserLoadError(WatchUserError.UNKNOWN_ERROR)
        }
    }

    /**
     * Loads the current user
     */
    private fun loadCurrentUser() {
        Timber.d("MainViewModel: loadCurrentUser")
        CrashlyticsLog.log("MainViewModel loading current user")
        viewModelScope.launch(ioContext) {
            runCatching {
                userRepository.getCurrentUser()!!
            }.onSuccess {
                Timber.d("MainViewModel: loadCurrentUser: onSuccess with user ${it.objectId}")
                _currentUser.postValue(it)
                // Load in parallel for faster first render.
                launch { loadUserGeofence(it) }
                launch { startLoadingWatchUsers(it) }
            }.onFailure {e ->
                Timber.e("MainViewModel: loadCurrentUser: onFailure $e")
                CrashlyticsLog.recordNonFatalError(e, "Error loading current user")
            }
        }
    }

    /**
     * Post a WatchUsers load error through LiveData.
     * @param watchUserError Specific error type for load error
     */
    private fun postWatchUserLoadError(watchUserError: WatchUserError) {
        Timber.d("MainViewModel: postWatchUserLoadError: $watchUserError")
        CrashlyticsLog.log("MainViewModel posting watch user load error: $watchUserError")
        _watchUserList.postValue(Resource(Resource.Status.LOAD_ERROR, null, watchUserError))
    }

    private suspend fun stopReceivingWatchUserUpdates() {
        Timber.d("MainViewModel: stopReceivingWatchUserUpdates")
        collectWatchUsersJob?.let { job ->
            if (job.isActive) {
                Timber.d("MainViewModel: stopReceivingWatchUserUpdates: Stopping collecting watch user updates")
                CrashlyticsLog.log("MainViewModel stopping watch user updates collection")
                job.cancelAndJoin()
            }
        }
        collectWatchUsersJob = null
    }

    private suspend fun stopReceivingWatchUpdatesForUser() {
        if (collectWatchesUpdatesJob != null && collectWatchesUpdatesJob!!.isActive) {
            Timber.d("MainViewModel: stopReceivingWatchUpdatesForUser: stopping watch updates")
            CrashlyticsLog.log("MainViewModel stopping watch updates for user")
            collectWatchesUpdatesJob!!.cancelAndJoin()
        }
        collectWatchesUpdatesJob = null

        if (collectPermissionsUpdatesJob != null && collectPermissionsUpdatesJob!!.isActive) {
            Timber.d("MainViewModel: stopReceivingWatchUpdatesForUser: stopping permission updates")
            CrashlyticsLog.log("MainViewModel stopping permission updates for user")
            collectPermissionsUpdatesJob!!.cancelAndJoin()
        }
        collectPermissionsUpdatesJob = null
    }

    /**
     * Logout the current user
     */
    fun logout() {
        Timber.d("MainViewModel: logout")
        CrashlyticsLog.log("MainViewModel logging out")
        externalScope.launch(ioContext) {
            _loginStatus.postValue(LoginStatus.LOGGING_OUT)
            runCatching {
                userRepository.logout()
            }.onSuccess {
                runCatching {
                    parseInstallationRepository.removeUserFromInstallation()
                }.onFailure {
                    CrashlyticsLog.recordNonFatalError(
                        it,
                        "Error on removing user from installation in Parse"
                    )
                }
                _loginStatus.postValue(LoginStatus.LOGGED_OUT)
            }.onFailure {
                _loginStatus.postValue(LoginStatus.LOGOUT_ERROR)
                CrashlyticsLog.recordNonFatalError(it, "Error on logout from Main activity")
            }
        }
    }

    fun saveNumberEnter(phone: String, wearer: Wearer) {
        Timber.d("MainViewModel: saveNumberEnter: $phone for wearer ${wearer.objectId}")
        CrashlyticsLog.log("MainViewModel saving number for wearer ${wearer.objectId}")
        _saveNumberStatusEnter.value = SaveNumberStatus.LOADING_SAVE
        externalScope.launch(ioContext) {
            delay(3000)
            runCatching {
                watchUserRepository.setWearerPhone(wearer, phone)
            }.onSuccess {
                postWatchUpdate(wearer)
                _saveNumberStatusEnter.postValue(SaveNumberStatus.SAVE_SUCCESS)
            }.onFailure {
                _saveNumberStatusEnter.postValue(SaveNumberStatus.ERROR_SAVE)
                CrashlyticsLog.recordNonFatalError(it, "Error saving number")
            }
        }
    }

    fun sendCR(ids: List<String>) {
        Timber.d("MainViewModel: sendCR for ids: $ids")
        CrashlyticsLog.log("MainViewModel sending CR for ${ids.size} ids")
        externalScope.launch(ioContext) {
            _liveDataSendCr.postValue(Resource(Resource.Status.LOADING))
            runCatching {
                userRepository.sendCR(ids)
                _liveDataSendCr.postValue(Resource(Resource.Status.LOAD_SUCCESS))
            }.onFailure {
                CrashlyticsLog.recordNonFatalError(it, "Error sending CR")
            }
        }
    }

    // =============================================================================
    // WATCH SORTING
    // =============================================================================

    /**
     * Sorts watch users by priority for display in the UI.
     * Priority order:
     * 1. Connected AND active watches (highest priority)
     * 2. Connected but inactive watches
     * 3. Disconnected watches (lowest priority)
     *
     * Within each group, watches are sorted by last location time (most recent first).
     *
     * Note: This sorting is only applied on initial load. LiveQuery updates
     * preserve watch positions to avoid confusing UX with items moving around.
     */
    private fun sortWatchUsersByPriority(watchUsers: List<WatchUser>): List<WatchUser> {
        Timber.d("MainViewModel: sortWatchUsersByPriority - Sorting ${watchUsers.size} watches")

        return watchUsers.sortedWith(
            compareBy<WatchUser> { watchUser ->
                // Priority: 0 = connected+active, 1 = connected, 2 = disconnected
                val watch = watchUser.watch
                val isConnected = watch?.isConnected() == true
                val isActive = watchUser.active

                when {
                    isConnected && isActive -> 0
                    isConnected -> 1
                    else -> 2
                }
            }.thenByDescending { watchUser ->
                // Secondary sort: by last location time (most recent first)
                watchUser.watch?.lastLocationTime?.time ?: 0L
            }
        ).also { sorted ->
            // Log the sorted order for debugging
            sorted.forEachIndexed { index, watchUser ->
                val watch = watchUser.watch
                Timber.d(
                    "MainViewModel: sortWatchUsersByPriority - Position $index: " +
                    "${watch?.name()} (connected=${watch?.isConnected()}, active=${watchUser.active}, " +
                    "lastLocationTime=${watch?.lastLocationTime})"
                )
            }
        }
    }
}