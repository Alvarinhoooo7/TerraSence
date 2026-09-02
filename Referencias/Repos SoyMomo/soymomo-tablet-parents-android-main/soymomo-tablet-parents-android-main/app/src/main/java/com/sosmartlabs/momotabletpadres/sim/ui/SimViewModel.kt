package com.sosmartlabs.momotabletpadres.sim.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.analytics.FirebaseAnalytics
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.sim.model.Subscription
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionStatus
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.sim.repository.SubscriptionRepository
import com.sosmartlabs.momotabletpadres.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext
import java.util.*
import java.util.concurrent.TimeUnit

@HiltViewModel
class SimViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val userRepository: UserRepository,
    private val tabletRepository: TabletRepository,
    private val subscriptionRepository: SubscriptionRepository,
    private val firebaseAnalytics: FirebaseAnalytics
) : ViewModel() {

    companion object {
        private const val DEFAULT_POLLING_INTERVAL = 5L
        private const val MAX_POLLING_INTERVAL = 30L
        private const val BACKOFF_MULTIPLIER = 1.5
    }

    // Current User
    private val _currentUser = MutableLiveData<ParseUser>()
    val currentUser: LiveData<ParseUser> get() = _currentUser

    // Currently selected Subscription
    private val _currentSubscription = MutableLiveData<Subscription>()
    val currentSubscription: LiveData<Subscription> get() = _currentSubscription

    // List of subscriptions
    private val _subscriptionList = MutableLiveData<MutableList<Subscription>>()
    val subscriptionList: LiveData<MutableList<Subscription>> get() = _subscriptionList

    // Complete list of tablets for the current user
    private val _tabletFullList = MutableLiveData<List<Tablet>>()
    val tabletFullList: LiveData<List<Tablet>> get() = _tabletFullList

    // List of tablets without an active subscription
    private val _tabletNoSubscriptionList = MutableLiveData<List<Tablet>>()
    val tabletNoSubscriptionList: LiveData<List<Tablet>> get() = _tabletNoSubscriptionList

    // Subscription Management Portal Session state
    private val _subscriptionManagementPortalSession = MutableLiveData<Resource<String, Unit>>()
    val subscriptionManagementPortalSession: LiveData<Resource<String, Unit>> get() = _subscriptionManagementPortalSession

    // Job for polling subscriptions periodically
    private var subscriptionListPollingJob: Job? = null

    private var currentPollingInterval = DEFAULT_POLLING_INTERVAL

    override fun onCleared() {
        super.onCleared()
        Timber.d("SimViewModel: onCleared()")
        CrashlyticsLog.log("SimViewModel cleared")
        stopPollingSubscriptions()
    }

    /**
     * Fetches the current user from the [UserRepository] and posts the value.
     */
    fun getCurrentUser() {
        viewModelScope.launch(ioContext) {
            Timber.d("SimViewModel: getCurrentUser() - Starting user fetch")
            CrashlyticsLog.log("Getting current user")
            userRepository.getCurrentParseUser()?.let { user ->
                _currentUser.postValue(user)
                Timber.d("SimViewModel: getCurrentUser() - Successfully fetched user: ${user.objectId}")
                CrashlyticsLog.log("Current user fetched: ${user.objectId}")
            } ?: run {
                Timber.e("SimViewModel: getCurrentUser() - Failed to fetch user")
                CrashlyticsLog.log("Failed to fetch current user")
            }
        }
    }

    /**
     * Retrieves tablets for the given [user] from the [TabletRepository] and posts the full list.
     *
     * @param user The current ParseUser.
     */
    fun getTablets(user: ParseUser) {
        viewModelScope.launch(ioContext) {
            Timber.d("SimViewModel: getTablets() - Fetching tablets for user: ${user.objectId}")
            CrashlyticsLog.log("Getting tablets for user ${user.objectId}")
            val tablets = tabletRepository.getTabletListByUser(user)
            _tabletFullList.postValue(tablets)
            Timber.d("SimViewModel: getTablets() - Fetched ${tablets.size} tablets")
            CrashlyticsLog.log("Fetched ${tablets.size} tablets")
        }
    }

    /**
     * Fetches subscriptions for a given list of IMEIS [String] using the [SubscriptionRepository].
     * It sorts the subscriptions by putting active ones first and ordering by creation date (newest first).
     * If a subscription was previously selected, it updates it with the latest data.
     *
     * @param tablets The list of tablets for which to fetch subscriptions.
     */
    fun getSubscriptions(tablets: List<Tablet>) {
        viewModelScope.launch(ioContext) {
            Timber.d("SimViewModel: getSubscriptions() - Starting for ${tablets.size} tablets")
            CrashlyticsLog.log("Getting subscriptions for ${tablets.size} tablets")

            // Preserve the current subscription selection if available
            val currentSelectedSubscription = currentSubscription.value

            // Fetch and sort subscriptions:
            // 1. Active subscriptions (SubscriptionStatus.ACTIVE) are placed first.
            // 2. Within each group, subscriptions are ordered by creation date (newest first).
            val unsortedSubscriptionList = subscriptionRepository.getSubscriptions(tablets)
            val sortedSubscriptions = unsortedSubscriptionList.sortedWith(
                compareByDescending<Subscription> { it.getSubscriptionStatus() == SubscriptionStatus.ACTIVE }
                    .thenByDescending { it.createdAt ?: Date(0) }
            ).toMutableList()

            _subscriptionList.postValue(sortedSubscriptions)
            Timber.d("SimViewModel: getSubscriptions() - Fetched ${sortedSubscriptions.size} subscriptions")
            CrashlyticsLog.log("Fetched ${sortedSubscriptions.size} subscriptions")

            // Log each subscription details for debugging
            sortedSubscriptions.forEach { subscription ->
                Timber.d("SimViewModel: Subscription details: $subscription")
            }

            // Update the current selected subscription if applicable
            currentSelectedSubscription?.let { selected ->
                val index = sortedSubscriptions.indexOfFirst { it.objectId == selected.objectId }
                if (index != -1) {
                    updateCurrentSubscription(sortedSubscriptions[index])
                } else {
                    Timber.w("SimViewModel: getSubscriptions() - Previously selected subscription not found")
                    CrashlyticsLog.log("Previously selected subscription not found in refreshed list")
                }
            }

            // Update the list of wearers without an active subscription
            val imeisList = tablets.mapNotNull { it.imei?.takeIf { imei -> imei.isNotBlank() } }
            updateWearersWithoutActiveSubscription(imeisList, sortedSubscriptions)
        }
    }

    /**
     * Posts the provided [subscription] as the current selected subscription.
     *
     * @param subscription The subscription to be set as current.
     */
    fun setCurrentSubscription(subscription: Subscription) {
        viewModelScope.launch(ioContext) {
            Timber.d("SimViewModel: setCurrentSubscription() - Setting subscription: ${subscription.objectId}")
            CrashlyticsLog.log("Setting current subscription: ${subscription.objectId}")
            _currentSubscription.postValue(subscription)
        }
    }

    fun updateCurrentSubscription(subscription: Subscription) {
        viewModelScope.launch(ioContext) {
            Timber.d("SimViewModel: updateCurrentSubscription() - Attempting update of subscription: ${subscription.objectId} for current subscription${currentSubscription.value?.objectId ?: "no object id"}")

            if (currentSubscription.value?.objectId == subscription.objectId) {
                CrashlyticsLog.log("Updating current subscription: ${subscription.objectId}")
                _currentSubscription.postValue(subscription)
            }
        }
    }

    /**
     * Updates the list of imeis who do not have any active or preactivated subscriptions.
     *
     * @param imeisList The complete list of wearers.
     * @param subscriptionList The list of subscriptions.
     */
    private fun updateWearersWithoutActiveSubscription(
        imeisList: List<String>,
        subscriptionList: List<Subscription>
    ) {
        Timber.d("SimViewModel: updateWearersWithoutActiveSubscription() - Updating wearers list")
        CrashlyticsLog.log("Updating wearers without active subscriptions")
        val imeisWithoutActiveSubscription = imeisList.filter { imei ->
            val subscriptionsOfWearer = subscriptionList.filter { it.imei == imei }
            subscriptionsOfWearer.isEmpty() || subscriptionsOfWearer.none { subscription ->
                subscription.getSubscriptionStatus() == SubscriptionStatus.ACTIVE ||
                        subscription.getSubscriptionStatus() == SubscriptionStatus.PREACTIVATED
            }
        }
        val tabletsWithoutSubscription = _tabletFullList.value?.filter { tablet ->
            imeisWithoutActiveSubscription.contains(tablet.imei)
        } ?: emptyList()
        _tabletNoSubscriptionList.postValue(tabletsWithoutSubscription)
        Timber.d("SimViewModel: updateWearersWithoutActiveSubscription() - Found ${tabletsWithoutSubscription.size} tablets without active subscription")
        CrashlyticsLog.log("Found ${tabletsWithoutSubscription.size} tablets without active subscription")
    }

    /**
     * Retrieves a subscription management portal session URL for the provided [subscription].
     * Posts a loading state, then either a successful URL or an error state.
     *
     * @param subscription The subscription for which to retrieve the portal session.
     */
    fun getSubscriptionManagementPortalSession(subscription: Subscription) {
        viewModelScope.launch(ioContext) {
            Timber.d("SimViewModel: getSubscriptionManagementPortalSession() - Starting for subscription ${subscription.objectId}")
            CrashlyticsLog.log("Getting management portal session for subscription: ${subscription.objectId}")

            runCatching {
                _subscriptionManagementPortalSession.postValue(Resource(status = Resource.Status.LOADING))
                // Attempt to retrieve the portal session from the repository.
                val portalSession = subscriptionRepository.getSubscriptionManagementPortal(subscription)
                // Assume the portal session is a map containing a URL.
                portalSession?.get("url") as? String
                    ?: throw IllegalStateException("Portal session URL missing")
            }.onSuccess { url ->
                _subscriptionManagementPortalSession.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = url))
                Timber.d("SimViewModel: getSubscriptionManagementPortalSession() - Successfully obtained portal URL")
                CrashlyticsLog.log("Obtained management portal URL for subscription: ${subscription.objectId}")
            }.onFailure { error ->
                _subscriptionManagementPortalSession.postValue(Resource(Resource.Status.LOAD_ERROR, data = error.message))
                Timber.e(error, "SimViewModel: getSubscriptionManagementPortalSession() - Failed to get portal session for subscription ${subscription.objectId}")
                CrashlyticsLog.recordNonFatalError(error, "Failed to get management portal session for subscription: ${subscription.objectId}")
            }
        }
    }

    /**
     * Resets the subscription management portal session to its default state.
     */
    fun setSubscriptionManagementPortalSessionDefault() {
        viewModelScope.launch(ioContext) {
            Timber.d("SimViewModel: setSubscriptionManagementPortalSessionDefault() - Resetting session state")
            CrashlyticsLog.log("Resetting management portal session to default")
            _subscriptionManagementPortalSession.postValue(Resource(status = Resource.Status.DEFAULT))
        }
    }

    /**
     * Starts polling for subscription updates periodically with exponential backoff on errors.
     * The polling is based on the current list of wearers.
     */
    fun startPollingSubscriptions() {
        Timber.d("SimViewModel: startPollingSubscriptions() - Starting subscription polling")
        // Cancel any existing polling job before starting a new one.
        subscriptionListPollingJob?.cancel()
        currentPollingInterval = DEFAULT_POLLING_INTERVAL // Reset interval on new start
        
        subscriptionListPollingJob = viewModelScope.launch(ioContext) {
            while (isActive) {
                try {
                    val tablets = tabletFullList.value
                    if (tablets.isNullOrEmpty()) {
                        Timber.d("SimViewModel: startPollingSubscriptions() - Tablet list empty; stopping poll")
                        stopPollingSubscriptions()
                        return@launch
                    }
                    
                    Timber.d("SimViewModel: startPollingSubscriptions() - Polling subscriptions for ${tablets.size} tablets with interval: ${currentPollingInterval}s")
                    getSubscriptions(tablets)
                    // Reset interval on successful poll
                    currentPollingInterval = DEFAULT_POLLING_INTERVAL
                    delay(TimeUnit.SECONDS.toMillis(currentPollingInterval))
                } catch (e: Exception) {
                    Timber.e(e, "SimViewModel: startPollingSubscriptions() - Exception during polling, current interval: ${currentPollingInterval}s")
                    CrashlyticsLog.recordNonFatalError(e, "Exception in subscription polling loop")
                    
                    // Apply exponential backoff
                    currentPollingInterval = calculateNextPollingInterval()
                    Timber.d("SimViewModel: startPollingSubscriptions() - Backing off, next interval: ${currentPollingInterval}s")
                    delay(TimeUnit.SECONDS.toMillis(currentPollingInterval))
                }
            }
        }
    }

    /**
     * Calculates the next polling interval using exponential backoff.
     * The interval is capped at MAX_POLLING_INTERVAL.
     */
    private fun calculateNextPollingInterval(): Long {
        return (currentPollingInterval * BACKOFF_MULTIPLIER)
            .toLong()
            .coerceAtMost(MAX_POLLING_INTERVAL)
    }

    /**
     * Stops the polling of subscriptions by canceling the polling job
     * and resetting the polling interval.
     */
    fun stopPollingSubscriptions() {
        Timber.d("SimViewModel: stopPollingSubscriptions() - Stopping subscription polling")
        subscriptionListPollingJob?.cancel()
        subscriptionListPollingJob = null
        currentPollingInterval = DEFAULT_POLLING_INTERVAL
    }

}