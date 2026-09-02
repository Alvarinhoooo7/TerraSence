package com.sosmartlabs.momo.sim.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parse.ParseUser
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.main.model.UserRepository
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionStatus
import com.sosmartlabs.momo.sim.repository.SubscriptionPlanRepository
import com.sosmartlabs.momo.sim.repository.SubscriptionRepository
import com.sosmartlabs.momo.sim.repository.WearerRepository
import com.sosmartlabs.momo.sim.util.UpgradePlanEligibility
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.Date
import java.util.UUID
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class SimViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val userRepository: UserRepository,
    private val wearerRepository: WearerRepository,
    private val subscriptionRepository: SubscriptionRepository,
    private val subscriptionPlanRepository: SubscriptionPlanRepository,
    private val simAnalytics: SimAnalytics,
) : ViewModel() {

    companion object {
        private const val DEFAULT_POLLING_INTERVAL = 5L
        private const val MAX_POLLING_INTERVAL = 30L
        private const val BACKOFF_MULTIPLIER = 1.5
        private const val SCREEN_CENTER = "sim_center"
        private const val SCREEN_LIST = "subscription_list"
        private const val SCREEN_DETAIL = "subscription_detail"
        private const val SCREEN_RESTORE = "restore"
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

    // Complete list of wearers for the current user
    private val _wearerFullList = MutableLiveData<List<Wearer>>()
    val wearerFullList: LiveData<List<Wearer>> get() = _wearerFullList

    // List of wearers without an active subscription
    private val _wearerNoSubscriptionList = MutableLiveData<List<Wearer>>()
    val wearerNoSubscriptionList: LiveData<List<Wearer>> get() = _wearerNoSubscriptionList

    // Subscription Management Portal Session state
    private val _subscriptionManagementPortalSession = MutableLiveData<Resource<String, Unit>>()
    val subscriptionManagementPortalSession: LiveData<Resource<String, Unit>> get() = _subscriptionManagementPortalSession

    // Pending Payment URL state
    private val _pendingPaymentUrl = MutableLiveData<Resource<String, Unit>>()
    val pendingPaymentUrl: LiveData<Resource<String, Unit>> get() = _pendingPaymentUrl

    private val _hasAvailableUpgradePlans = MutableLiveData(false)
    val hasAvailableUpgradePlans: LiveData<Boolean> get() = _hasAvailableUpgradePlans

    // Deep-link state: when the upgrade popup CTA fires, MainActivity launches
    // SimActivity with Intent extras; SimActivity stores them here. Consumed by
    // SubscriptionDispatchFragment (to skip the list and open the detail directly)
    // and SubscriptionDetailFragment (to scroll the detail to the upgrade entry).
    private var pendingDeepLinkSubscriptionId: String? = null
    private val _deepLinkScrollToUpgrade = MutableLiveData(false)
    val deepLinkScrollToUpgrade: LiveData<Boolean> get() = _deepLinkScrollToUpgrade

    fun setPendingDeepLink(subscriptionId: String?, scrollToUpgrade: Boolean) {
        pendingDeepLinkSubscriptionId = subscriptionId
        _deepLinkScrollToUpgrade.value = scrollToUpgrade
    }

    fun consumePendingDeepLinkSubscriptionId(): String? {
        val id = pendingDeepLinkSubscriptionId
        pendingDeepLinkSubscriptionId = null
        return id
    }

    fun consumeDeepLinkScrollToUpgrade() {
        _deepLinkScrollToUpgrade.value = false
    }

    // Job for polling subscriptions periodically
    private var subscriptionListPollingJob: Job? = null

    private var currentPollingInterval = DEFAULT_POLLING_INTERVAL
    private val managementFlowId = UUID.randomUUID().toString()
    @Volatile
    private var hasTrackedCenterOpened = false

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
            userRepository.getCurrentUser()?.let { user ->
                _currentUser.postValue(user)
                Timber.d("SimViewModel: getCurrentUser() - Successfully fetched user")
                CrashlyticsLog.log("Current user fetched")
            } ?: run {
                Timber.e("SimViewModel: getCurrentUser() - Failed to fetch user")
                CrashlyticsLog.log("Failed to fetch current user")
            }
        }
    }

    /**
     * Retrieves wearers for the given [user] from the [WearerRepository] and posts the full list.
     *
     * @param user The current ParseUser.
     */
    fun getWearers(user: ParseUser) {
        viewModelScope.launch(ioContext) {
            Timber.d("SimViewModel: getWearers() - Fetching wearers")
            CrashlyticsLog.log("Getting wearers")
            val wearers = wearerRepository.getWearers(user)
            _wearerFullList.postValue(wearers)
            Timber.d("SimViewModel: getWearers() - Fetched ${wearers.size} wearers")
            CrashlyticsLog.log("Fetched ${wearers.size} wearers")
        }
    }

    /**
     * Fetches subscriptions for a given list of [wearerList] using the [SubscriptionRepository].
     * It sorts the subscriptions by putting active ones first and ordering by creation date (newest first).
     * If a subscription was previously selected, it updates it with the latest data.
     *
     * @param wearerList The list of wearers for which to fetch subscriptions.
     */
    fun getSubscriptions(wearerList: List<Wearer>) {
        viewModelScope.launch(ioContext) {
            Timber.d("SimViewModel: getSubscriptions() - Starting for ${wearerList.size} wearers")
            CrashlyticsLog.log("Getting subscriptions for ${wearerList.size} wearers")

            runCatching {
                // Preserve the current subscription selection if available
                val currentSelectedSubscription = currentSubscription.value

                // Fetch and sort subscriptions:
                // 1. Active and suspended subscriptions are placed first (suspended
                //    needs the user's attention — its Pay Now card must surface).
                // 2. Within each group, subscriptions are ordered by creation date (newest first).
                val unsortedSubscriptionList = subscriptionRepository.getSubscriptions(wearerList)
                val sortedSubscriptions = unsortedSubscriptionList.sortedWith(
                    compareByDescending<Subscription> {
                        val status = it.getSubscriptionStatus()
                        status == SubscriptionStatus.ACTIVE || status == SubscriptionStatus.SUSPENDED
                    }
                        .thenByDescending { it.createdAt ?: Date(0) }
                ).toMutableList()

                _subscriptionList.postValue(sortedSubscriptions)
                Timber.d("SimViewModel: getSubscriptions() - Fetched ${sortedSubscriptions.size} subscriptions")
                CrashlyticsLog.log("Fetched ${sortedSubscriptions.size} subscriptions")
                trackSubscriptionListResult(
                    result = SimAnalytics.Result.SUCCESS,
                    subscriptionCount = sortedSubscriptions.size,
                    wearerCount = wearerList.size,
                )

                // Update the current selected subscription if applicable
                currentSelectedSubscription?.let { selected ->
                    val index = sortedSubscriptions.indexOfFirst { it.objectId == selected.objectId }
                    if (index != -1) {
                        setCurrentSubscription(sortedSubscriptions[index])
                    } else {
                        Timber.w("SimViewModel: getSubscriptions() - Previously selected subscription not found")
                        CrashlyticsLog.log("Previously selected subscription not found in refreshed list")
                    }
                }

                // Update the list of wearers without an active subscription
                updateWearersWithoutActiveSubscription(wearerList, sortedSubscriptions)
            }.onFailure { error ->
                Timber.e(error, "SimViewModel: getSubscriptions() - Failed to fetch subscriptions")
                CrashlyticsLog.recordNonFatalError(error, "Failed to fetch SIM subscriptions")
                trackSubscriptionListResult(
                    result = SimAnalytics.Result.ERROR,
                    subscriptionCount = 0,
                    wearerCount = wearerList.size,
                    errorType = error::class.simpleName,
                )
            }
        }
    }

    /**
     * Refetches subscriptions for the cached wearer list. Mirrors iOS `refresh()`.
     * No-op if wearers haven't been loaded yet.
     */
    fun refreshSubscriptions() {
        val wearers = _wearerFullList.value
        if (wearers.isNullOrEmpty()) {
            Timber.w("SimViewModel: refreshSubscriptions() - No wearers cached, skipping refresh")
            return
        }
        getSubscriptions(wearers)
    }

    /**
     * Posts the provided [subscription] as the current selected subscription.
     *
     * @param subscription The subscription to be set as current.
     */
    fun setCurrentSubscription(subscription: Subscription) {
        viewModelScope.launch(ioContext) {
            Timber.d("SimViewModel: setCurrentSubscription() - Setting subscription")
            CrashlyticsLog.log("Setting current subscription")
            _currentSubscription.postValue(subscription)
        }
    }

    fun isSubscriptionOwner(subscription: Subscription): Boolean {
        val currentUserId = currentUser.value?.objectId
            ?: ParseUser.getCurrentUser()?.objectId
            ?: return false
        // `subscriber.user` is null for co-parents (owner's _User row is ACL-restricted);
        // read the pointer null-safely so a missing user means "not owner", not a crash.
        val ownerId = subscription.subscriber.getParseUser("user")?.objectId ?: return false
        return currentUserId == ownerId
    }

    fun checkUpgradePlansAvailable(subscription: Subscription) {
        if (!UpgradePlanEligibility.isSubscriptionEligibleForUpgrade(subscription)) {
            _hasAvailableUpgradePlans.postValue(false)
            return
        }
        viewModelScope.launch(ioContext) {
            runCatching {
                subscriptionPlanRepository.getSubscriptionPlans(
                    mnoProvider = subscription.sim.mnoProvider,
                    paymentProviderName = subscription.paymentProvider.name,
                    isQA = false
                ).any { plan ->
                    UpgradePlanEligibility.isUpgradeCandidate(plan, subscription)
                }
            }.onSuccess { hasUpgradePlans ->
                _hasAvailableUpgradePlans.postValue(hasUpgradePlans)
            }.onFailure { error ->
                Timber.e(error, "SimViewModel: failed to check upgrade plans availability")
                CrashlyticsLog.recordNonFatalError(
                    error,
                    "Failed to check upgrade plans for subscription ${subscription.objectId}"
                )
                _hasAvailableUpgradePlans.postValue(false)
            }
        }
    }

    fun resetUpgradePlanAvailability() {
        _hasAvailableUpgradePlans.postValue(false)
    }

    /**
     * Updates the list of wearers who do not have any active or preactivated subscriptions.
     *
     * @param wearerList The complete list of wearers.
     * @param subscriptionList The list of subscriptions.
     */
    private fun updateWearersWithoutActiveSubscription(
        wearerList: List<Wearer>,
        subscriptionList: List<Subscription>
    ) {
        Timber.d("SimViewModel: updateWearersWithoutActiveSubscription() - Updating wearers list")
        CrashlyticsLog.log("Updating wearers without active subscriptions")
        val wearersWithoutActiveSubscription = wearerList.filter { wearer ->
            val subscriptionsOfWearer = subscriptionList.filter { it.watch.objectId == wearer.objectId }
            subscriptionsOfWearer.isEmpty() || subscriptionsOfWearer.none { subscription ->
                // SUSPENDED counts as having a subscription: offering a brand-new
                // plan for a wearer whose plan is merely unpaid would create a
                // duplicate-plan trap — the right action is paying, not re-buying.
                subscription.getSubscriptionStatus() == SubscriptionStatus.ACTIVE ||
                        subscription.getSubscriptionStatus() == SubscriptionStatus.PREACTIVATED ||
                        subscription.getSubscriptionStatus() == SubscriptionStatus.SUSPENDED
            }
        }
        _wearerNoSubscriptionList.postValue(wearersWithoutActiveSubscription)
        Timber.d("SimViewModel: updateWearersWithoutActiveSubscription() - Found ${wearersWithoutActiveSubscription.size} wearers without active subscription")
        CrashlyticsLog.log("Found ${wearersWithoutActiveSubscription.size} wearers without active subscription")
    }

    /**
     * Retrieves a subscription management portal session URL for the provided [subscription].
     * Posts a loading state, then either a successful URL or an error state.
     *
     * @param subscription The subscription for which to retrieve the portal session.
     */
    fun getSubscriptionManagementPortalSession(subscription: Subscription) {
        viewModelScope.launch(ioContext) {
            Timber.d("SimViewModel: getSubscriptionManagementPortalSession() - Starting")
            CrashlyticsLog.log("Getting management portal session")

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
                CrashlyticsLog.log("Obtained management portal URL")
                trackPortalResult(
                    result = SimAnalytics.Result.SUCCESS,
                    subscription = subscription,
                )
            }.onFailure { error ->
                _subscriptionManagementPortalSession.postValue(Resource(Resource.Status.LOAD_ERROR, data = error.message))
                Timber.e(error, "SimViewModel: getSubscriptionManagementPortalSession() - Failed to get portal session")
                CrashlyticsLog.recordNonFatalError(error, "Failed to get management portal session")
                trackPortalResult(
                    result = SimAnalytics.Result.ERROR,
                    subscription = subscription,
                    errorType = error::class.simpleName,
                )
            }
        }
    }

    /**
     * Resets the subscription management portal session to its default state.
     * Guarded: posting DEFAULT over DEFAULT would re-fire observers (LiveData has
     * no value-equality dedup), which used to ping-pong with the fragments'
     * observer branches in an infinite loop.
     */
    fun setSubscriptionManagementPortalSessionDefault() {
        if (_subscriptionManagementPortalSession.value?.status == Resource.Status.DEFAULT) return
        Timber.d("SimViewModel: setSubscriptionManagementPortalSessionDefault() - Resetting session state")
        _subscriptionManagementPortalSession.postValue(Resource(status = Resource.Status.DEFAULT))
    }

    /**
     * Retrieves the pending payment URL for the provided [subscription].
     * Calls the "getPendingPaymentUrl" cloud function and posts the resulting URL.
     *
     * @param subscription The subscription for which to retrieve the pending payment URL.
     */
    fun getPendingPaymentUrl(subscription: Subscription) {
        viewModelScope.launch(ioContext) {
            Timber.d("SimViewModel: getPendingPaymentUrl() - Starting")
            CrashlyticsLog.log("Getting pending payment URL")

            runCatching {
                _pendingPaymentUrl.postValue(Resource(status = Resource.Status.LOADING))
                val result = subscriptionRepository.getPendingPaymentUrl(subscription)
                result?.get("url") as? String
                    ?: throw IllegalStateException("Pending payment URL missing")
            }.onSuccess { url ->
                _pendingPaymentUrl.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = url))
                Timber.d("SimViewModel: getPendingPaymentUrl() - Successfully obtained pending payment URL")
                CrashlyticsLog.log("Obtained pending payment URL")
                trackPendingPaymentResult(
                    result = SimAnalytics.Result.SUCCESS,
                    subscription = subscription,
                )
            }.onFailure { error ->
                _pendingPaymentUrl.postValue(Resource(Resource.Status.LOAD_ERROR, data = error.message))
                Timber.e(error, "SimViewModel: getPendingPaymentUrl() - Failed to get pending payment URL")
                CrashlyticsLog.recordNonFatalError(error, "Failed to get pending payment URL")
                trackPendingPaymentResult(
                    result = SimAnalytics.Result.ERROR,
                    subscription = subscription,
                    errorType = error::class.simpleName,
                )
            }
        }
    }

    /**
     * Resets the pending payment URL state to its default state.
     * Guarded against DEFAULT-over-DEFAULT re-posts (see
     * [setSubscriptionManagementPortalSessionDefault]).
     */
    fun setPendingPaymentUrlDefault() {
        if (_pendingPaymentUrl.value?.status == Resource.Status.DEFAULT) return
        Timber.d("SimViewModel: setPendingPaymentUrlDefault() - Resetting state")
        _pendingPaymentUrl.postValue(Resource(status = Resource.Status.DEFAULT))
    }

    /**
     * Starts polling for subscription updates periodically with exponential backoff on errors.
     * The polling is based on the current list of wearers; if the wearer cache is
     * missing (e.g. process death restored the list screen without the dispatch
     * bootstrap re-running), it re-bootstraps user → wearers itself instead of
     * silently stopping, which used to leave the restored list permanently blank.
     */
    fun startPollingSubscriptions() {
        Timber.d("SimViewModel: startPollingSubscriptions() - Starting subscription polling")
        // Cancel any existing polling job before starting a new one.
        subscriptionListPollingJob?.cancel()
        currentPollingInterval = DEFAULT_POLLING_INTERVAL // Reset interval on new start

        subscriptionListPollingJob = viewModelScope.launch(ioContext) {
            while (isActive) {
                try {
                    val wearers = ensureWearersLoaded()
                    if (wearers == null) {
                        // No current user (logged out mid-session): nothing to poll.
                        Timber.w("SimViewModel: startPollingSubscriptions() - No user; stopping poll")
                        stopPollingSubscriptions()
                        return@launch
                    }
                    if (wearers.isEmpty()) {
                        Timber.d("SimViewModel: startPollingSubscriptions() - Wearer list empty; stopping poll")
                        stopPollingSubscriptions()
                        return@launch
                    }

                    Timber.d("SimViewModel: startPollingSubscriptions() - Polling subscriptions for ${wearers.size} wearers with interval: ${currentPollingInterval}s")
                    getSubscriptions(wearers)

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
     * Returns the cached wearer list, re-bootstrapping current user → wearers when
     * the cache is gone (process death). Returns null only when there is no
     * current user. Bootstrap failures throw and are handled by the polling
     * loop's backoff.
     */
    private suspend fun ensureWearersLoaded(): List<Wearer>? {
        wearerFullList.value?.let { return it }
        Timber.w("SimViewModel: ensureWearersLoaded() - Wearer cache empty; re-bootstrapping")
        CrashlyticsLog.log("SimViewModel: re-bootstrapping wearers for polling")
        val user = userRepository.getCurrentUser() ?: return null
        _currentUser.postValue(user)
        val wearers = wearerRepository.getWearers(user)
        _wearerFullList.postValue(wearers)
        return wearers
    }

    /** Whether the subscription polling loop is currently running. */
    fun isPollingSubscriptions(): Boolean = subscriptionListPollingJob?.isActive == true

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

    fun trackSimCenterOpened() {
        if (hasTrackedCenterOpened) return
        hasTrackedCenterOpened = true
        simAnalytics.track(
            SimAnalytics.Events.CENTER_OPENED,
            simContext(screen = SCREEN_CENTER),
            mapOf(SimAnalytics.Params.RESULT to SimAnalytics.Result.SUCCESS)
        )
    }

    fun trackSubscriptionSelected(subscription: Subscription) {
        simAnalytics.track(
            SimAnalytics.Events.SUBSCRIPTION_SELECTED,
            simContext(screen = SCREEN_LIST, subscription = subscription),
            mapOf(
                SimAnalytics.Params.RESULT to SimAnalytics.Result.SUCCESS,
                SimAnalytics.Params.STATUS to subscription.getSubscriptionStatus().name,
                SimAnalytics.Params.PAYMENT_PROVIDER to subscription.plan.paymentProvider.name,
                SimAnalytics.Params.BILLING_PERIOD to subscription.plan.billingPeriodType,
            )
        )
    }

    fun trackManageActionSelected(action: String, subscription: Subscription? = currentSubscription.value) {
        simAnalytics.track(
            SimAnalytics.Events.MANAGE_ACTION_SELECTED,
            simContext(screen = SCREEN_DETAIL, subscription = subscription),
            mapOf(
                SimAnalytics.Params.ACTION to action,
                SimAnalytics.Params.STATUS to subscription?.getSubscriptionStatus()?.name,
                SimAnalytics.Params.PAYMENT_PROVIDER to subscription?.plan?.paymentProvider?.name,
                SimAnalytics.Params.BILLING_PERIOD to subscription?.plan?.billingPeriodType,
            )
        )
    }

    fun trackRestoreStarted(hasPrefilledIccid: Boolean, subscription: Subscription? = currentSubscription.value) {
        simAnalytics.track(
            SimAnalytics.Events.RESTORE_STARTED,
            simContext(screen = SCREEN_RESTORE, subscription = subscription),
            mapOf(
                SimAnalytics.Params.RESULT to SimAnalytics.Result.SUCCESS,
                SimAnalytics.Params.HAS_PREFILLED_ICCID to hasPrefilledIccid,
                SimAnalytics.Params.STATUS to subscription?.getSubscriptionStatus()?.name,
            )
        )
    }

    fun trackPortalLaunchFailed(subscription: Subscription? = currentSubscription.value) {
        subscription ?: return
        trackPortalResult(
            result = SimAnalytics.Result.ERROR,
            subscription = subscription,
            errorType = "launch_failed",
        )
    }

    fun trackPendingPaymentLaunchFailed(subscription: Subscription? = currentSubscription.value) {
        subscription ?: return
        trackPendingPaymentResult(
            result = SimAnalytics.Result.ERROR,
            subscription = subscription,
            errorType = "launch_failed",
        )
    }

    private fun trackSubscriptionListResult(
        result: String,
        subscriptionCount: Int,
        wearerCount: Int,
        errorType: String? = null,
    ) {
        simAnalytics.track(
            SimAnalytics.Events.SUBSCRIPTION_LIST_RESULT,
            simContext(screen = SCREEN_LIST),
            mapOf(
                SimAnalytics.Params.RESULT to result,
                SimAnalytics.Params.SUBSCRIPTION_COUNT to subscriptionCount,
                SimAnalytics.Params.WEARER_COUNT to wearerCount,
                SimAnalytics.Params.NO_SUB_WEARER_COUNT to wearerNoSubscriptionList.value?.size,
                SimAnalytics.Params.ERROR_TYPE to errorType,
            )
        )
    }

    private fun trackPortalResult(
        result: String,
        subscription: Subscription,
        errorType: String? = null,
    ) {
        simAnalytics.track(
            SimAnalytics.Events.PORTAL_RESULT,
            simContext(screen = SCREEN_DETAIL, subscription = subscription),
            mapOf(
                SimAnalytics.Params.RESULT to result,
                SimAnalytics.Params.ERROR_TYPE to errorType,
            )
        )
    }

    private fun trackPendingPaymentResult(
        result: String,
        subscription: Subscription,
        errorType: String? = null,
    ) {
        simAnalytics.track(
            SimAnalytics.Events.PENDING_PAYMENT_RESULT,
            simContext(screen = SCREEN_DETAIL, subscription = subscription),
            mapOf(
                SimAnalytics.Params.RESULT to result,
                SimAnalytics.Params.ERROR_TYPE to errorType,
            )
        )
    }

    private fun simContext(
        screen: String? = null,
        subscription: Subscription? = currentSubscription.value,
    ): SimAnalytics.SimContext {
        return SimAnalytics.SimContext(
            flowId = managementFlowId,
            flowType = SimAnalytics.FlowType.MANAGEMENT,
            entryPoint = SimAnalytics.EntryPoint.SIM_CENTER,
            screen = screen,
            country = subscription?.plan?.mnoProvider?.country,
            watchModel = subscription?.watch?.modelName(),
            paymentProvider = subscription?.plan?.paymentProvider?.name,
            billingPeriod = subscription?.plan?.billingPeriodType,
        )
    }

}
