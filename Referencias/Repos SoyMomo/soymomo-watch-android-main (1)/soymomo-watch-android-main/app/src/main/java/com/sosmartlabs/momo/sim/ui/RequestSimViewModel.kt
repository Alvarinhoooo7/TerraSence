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
import com.sosmartlabs.momo.sim.model.SimDiscountCampaign
import com.sosmartlabs.momo.sim.model.SimOrder
import com.sosmartlabs.momo.sim.model.SimOrderStatus
import com.sosmartlabs.momo.sim.model.SimPopupTracking
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.sim.repository.SimPopupRepository
import com.sosmartlabs.momo.sim.repository.SimRepository
import com.sosmartlabs.momo.sim.repository.SubscriptionPlanRepository
import com.sosmartlabs.momo.sim.repository.SubscriptionRepository
import com.sosmartlabs.momo.sim.repository.WearerRepository
import com.sosmartlabs.momo.sim.util.PopupBackoffPolicy
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.Calendar
import java.util.UUID
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class RequestSimViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val userRepository: UserRepository,
    private val wearerRepository: WearerRepository,
    private val subscriptionRepository: SubscriptionRepository,
    private val subscriptionPlanRepository: SubscriptionPlanRepository,
    private val simRepository: SimRepository,
    private val simPopupRepository: SimPopupRepository,
    private val simAnalytics: SimAnalytics,
) : ViewModel() {

    private val _isLoadingPlans = MutableLiveData(false)
    val isLoadingPlans: LiveData<Boolean>
        get() = _isLoadingPlans

    private val _discount = MutableLiveData(0f)
    val discount: LiveData<Float>
        get() = _discount

    private val _availablePlans = MutableLiveData<List<SubscriptionPlan>>(emptyList())
    val availablePlans: LiveData<List<SubscriptionPlan>>
        get() = _availablePlans

    private val _activeCampaign = MutableLiveData<SimDiscountCampaign?>()
    val activeCampaign: LiveData<SimDiscountCampaign?>
        get() = _activeCampaign

    private val _currentPopupTracking = MutableLiveData<SimPopupTracking?>()

    private val _isSubmittingOrder = MutableLiveData(false)
    val isSubmittingOrder: LiveData<Boolean>
        get() = _isSubmittingOrder

    private val _showPopup = MutableLiveData(false)
    val showPopup: LiveData<Boolean>
        get() = _showPopup

    private val _showForm = MutableLiveData(false)
    val showForm: LiveData<Boolean>
        get() = _showForm

    private val _uiEvent = MutableLiveData<RequestSimUiEvent?>()
    val uiEvent: LiveData<RequestSimUiEvent?>
        get() = _uiEvent

    private var activeCampaignModel: SimDiscountCampaign? = null

    private var willShowPopup: Boolean = false
    private var wontShowPopup: Boolean = false
    private var hasShownMain: Boolean = false

    private var currentUser: ParseUser? = null
    private var selectedWearer: Wearer? = null
    private val requestSimFlowId = UUID.randomUUID().toString()
    @Volatile
    private var hasTrackedEligibility = false

    init {
        Timber.d("RequestSimViewModel: init")
        initialize()
    }

    private fun initialize() {
        val user = userRepository.getCurrentUser()
        if (user == null) {
            disablePopup("no current user")
            return
        }
        currentUser = user

        if (!isAccountOldEnough(user)) {
            disablePopup("account too new (createdAt=${user.createdAt})")
            return
        }

        viewModelScope.launch(ioContext) {
            try {
                fetchActiveCampaignAndContinue()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Environmental failure (e.g. DNS/network while backgrounded): skip the popup
                // this session instead of letting the exception escape viewModelScope and
                // crash the process (Crashlytics issues 3861f82b…, a11f0a04…).
                Timber.e(e, "RequestSimViewModel: SIM popup eligibility check failed")
                CrashlyticsLog.recordNonFatalError(e, "RequestSimViewModel: eligibility check failed")
                _isLoadingPlans.postValue(false)
                disablePopup("eligibility check failed: ${e::class.simpleName}")
            }
        }
    }

    private fun isAccountOldEnough(user: ParseUser): Boolean {
        val createdAt = user.createdAt ?: return false
        val threeDaysAgo = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, -3) }.time
        return createdAt.before(threeDaysAgo) || createdAt == threeDaysAgo
    }

    /**
     * The user tapped the CTA for this campaign -> never show it again.
     * Note: form completion is intentionally NOT terminal here (a real CTA tap precedes the
     * form anyway). A future "form completed -> terminal for ALL campaigns" rule would be a
     * user-scoped check, not this campaign-scoped one.
     */
    private fun isTerminalForCampaign(history: List<SimPopupTracking>): Boolean =
        history.any { it.ctaClickedAt != null }

    /** Escalating backoff for repeated dismissals: 1st -> 7d, 2nd -> 21d, 3rd -> retire. */
    private fun backoffAllowsShow(history: List<SimPopupTracking>): Boolean {
        val dismissals = history.mapNotNull { it.popupClosedAt }
        return PopupBackoffPolicy.shouldShow(
            interactionCount = dismissals.size,
            lastInteractionAt = dismissals.maxOrNull()
        )
    }

    private fun disablePopup(reason: String) {
        wontShowPopup = true
        Timber.d("RequestSimViewModel: Popup disabled – $reason")
        trackEligibilityResult(
            result = SimAnalytics.Result.NOT_SHOWN,
            errorType = reason,
        )
    }

    private suspend fun fetchActiveCampaignAndContinue() {
        Timber.d("RequestSimViewModel: Fetching active campaign")

        val campaign = simPopupRepository.getActiveCampaignForUserRegion()
        if (campaign == null) {
            disablePopup("no active campaign for user region")
            return
        }

        activeCampaignModel = campaign
        _activeCampaign.postValue(campaign)
        _discount.postValue(campaign.discountPercentage)

        fetchPopupTrackingHistoryAndContinue()
    }

    private suspend fun fetchPopupTrackingHistoryAndContinue() {
        val user = currentUser ?: run {
            disablePopup("cannot fetch tracking history; user is null")
            return
        }

        val campaign = activeCampaignModel ?: run {
            disablePopup("cannot fetch tracking history; campaign is null")
            return
        }

        val history = simPopupRepository.getTrackingHistory(user, campaign)
        val dismissalCount = history.count { it.popupClosedAt != null }

        if (isTerminalForCampaign(history)) {
            disablePopup("terminal (CTA) for this campaign")
            return
        }

        if (!backoffAllowsShow(history)) {
            disablePopup("backoff active for this campaign (dismissals=$dismissalCount)")
            return
        }

        fetchPlansForCampaign()
        checkSimRequestEligibility()
    }

    private suspend fun fetchPlansForCampaign() {
        val campaign = activeCampaignModel ?: run {
            disablePopup("no active campaign model; cannot fetch plans")
            return
        }

        val mnoProvider = campaign.mnoProvider ?: run {
            disablePopup("campaign missing mnoProvider")
            return
        }

        val paymentProvider = campaign.paymentProvider ?: run {
            disablePopup("campaign missing paymentProvider")
            return
        }

        val paymentProviderName = paymentProvider.name
        Timber.d("RequestSimViewModel: Fetching plans for campaign provider")

        _isLoadingPlans.postValue(true)
        val plans = subscriptionPlanRepository.getSubscriptionPlans(
            mnoProvider = mnoProvider,
            paymentProviderName = paymentProviderName,
            isQA = false
        )
        val monthlyPlans = plans.filter { it.billingPeriodType == "month" }
        _availablePlans.postValue(monthlyPlans)
        _isLoadingPlans.postValue(false)
    }

    private suspend fun checkSimRequestEligibility() {
        val user = currentUser ?: run {
            disablePopup("no current user; cannot check eligibility")
            return
        }

        Timber.d("RequestSimViewModel: Checking SIM request eligibility")

        val wearers = wearerRepository.getWearers(user)
        if (wearers.isEmpty()) {
            disablePopup("user has no wearers")
            return
        }

        val subscriptions = subscriptionRepository.getSubscriptions(wearers)
        if (subscriptions.isNotEmpty()) {
            disablePopup("user has subscriptions (${subscriptions.size})")
            return
        }

        // Show ONLY if NONE of the wearers has a pre-inserted SIM.
        val wearerWithPreInsertedSim = wearers.firstOrNull {
            val sim = simRepository.getSimByWatch(it)
            sim != null && !simRepository.isSimRetired(sim)
        }
        if (wearerWithPreInsertedSim != null) {
            disablePopup("a wearer has a pre-inserted SIM")
            return
        }

        selectedWearer = wearers.first()
        willShowPopup = true
        trackEligibilityResult(
            result = SimAnalytics.Result.SUCCESS,
            wearerCount = wearers.size,
            subscriptionCount = subscriptions.size,
        )

        Timber.d("RequestSimViewModel: Eligibility passed; willShowPopup=true")
    }

    /**
     * Mirrors iOS behavior: show the popup only on the second time the main screen appears.
     */
    fun showPendingPopupIfNeeded() {
        if (!hasShownMain) {
            hasShownMain = true
            Timber.d("RequestSimViewModel: First main appearance; not showing popup")
            return
        }

        if (wontShowPopup) {
            Timber.d("RequestSimViewModel: wontShowPopup=true; skipping")
            return
        }

        if (!willShowPopup) {
            Timber.d("RequestSimViewModel: willShowPopup=false; skipping")
            return
        }

        val wearer = selectedWearer ?: run {
            Timber.w("RequestSimViewModel: No selected wearer; cannot show popup")
            return
        }

        willShowPopup = false
        viewModelScope.launch(ioContext) {
            setupPopupTrackingForWearer(wearer)
        }
    }

    private suspend fun setupPopupTrackingForWearer(wearer: Wearer) {
        val user = currentUser ?: return
        val campaign = activeCampaignModel ?: return

        delay(1000)
        _showPopup.postValue(true)

        createPopupTrackingSession(
            user = user,
            watch = wearer,
            country = resolveCountry(campaign),
            campaign = campaign,
            sessionId = UUID.randomUUID().toString()
        )
    }

    private suspend fun createPopupTrackingSession(
        user: ParseUser,
        watch: Wearer,
        country: String,
        campaign: SimDiscountCampaign,
        sessionId: String
    ) {
        val tracking = SimPopupTracking().apply {
            this.user = user
            this.watch = watch
            this.country = country
            this.campaign = campaign
            this.sessionId = sessionId
        }
        Timber.d("RequestSimViewModel: Tracking session created")

        _currentPopupTracking.postValue(tracking)
        trackPopupShown(tracking)
    }

    private suspend fun trackPopupShown(tracking: SimPopupTracking) {
        simAnalytics.track(
            SimAnalytics.Events.REQUEST_POPUP_SHOWN,
            requestSimContext(screen = SCREEN_POPUP, country = tracking.country),
            campaignParams(tracking.campaign) + mapOf(
                SimAnalytics.Params.RESULT to SimAnalytics.Result.SUCCESS,
                SimAnalytics.Params.COUNTRY to tracking.country,
            )
        )

        runCatching {
            val updated = simPopupRepository.updatePopupShownAt(tracking)
            _currentPopupTracking.postValue(updated)
        }.onFailure {
            Timber.e(it, "RequestSimViewModel: Failed to track popup shown")
        }
    }

    fun closePopup() {
        _showPopup.value = false
        viewModelScope.launch(ioContext) { trackPopupClosed() }
    }

    private suspend fun trackPopupClosed() {
        val tracking = _currentPopupTracking.value ?: return

        simAnalytics.track(
            SimAnalytics.Events.REQUEST_POPUP_RESULT,
            requestSimContext(screen = SCREEN_POPUP, country = tracking.country),
            campaignParams(tracking.campaign) + mapOf(
                SimAnalytics.Params.RESULT to SimAnalytics.Result.CLOSED,
                SimAnalytics.Params.COUNTRY to tracking.country,
            )
        )

        runCatching {
            val updated = simPopupRepository.updatePopupClosedAt(tracking)
            _currentPopupTracking.postValue(updated)
        }.onFailure {
            Timber.e(it, "RequestSimViewModel: Failed to track popup closed")
        }
    }

    fun goToForm() {
        _showForm.value = true
        viewModelScope.launch(ioContext) { trackCtaClicked() }
    }

    fun consumeShowForm() {
        _showForm.value = false
    }

    private suspend fun trackCtaClicked() {
        val tracking = _currentPopupTracking.value ?: return

        simAnalytics.track(
            SimAnalytics.Events.REQUEST_POPUP_RESULT,
            requestSimContext(screen = SCREEN_POPUP, country = tracking.country),
            campaignParams(tracking.campaign) + mapOf(
                SimAnalytics.Params.RESULT to SimAnalytics.Result.CTA_CLICKED,
                SimAnalytics.Params.COUNTRY to tracking.country,
            )
        )

        runCatching {
            val updated = simPopupRepository.updateCtaClickedAt(tracking)
            _currentPopupTracking.postValue(updated)
        }.onFailure {
            Timber.e(it, "RequestSimViewModel: Failed to track CTA click")
        }
    }

    private suspend fun trackFormCompleted() {
        val tracking = _currentPopupTracking.value ?: return

        runCatching {
            val updated = simPopupRepository.updateFormCompletedAt(tracking)
            _currentPopupTracking.postValue(updated)
        }.onFailure {
            Timber.e(it, "RequestSimViewModel: Failed to track form completed")
        }
    }

    private fun resolveCountry(campaign: SimDiscountCampaign): String =
        campaign.mnoProvider?.country ?: simPopupRepository.getUserCountry()

    private suspend fun submitSimOrder(
        user: ParseUser,
        fullName: String,
        userPersonalId: String,
        email: String,
        phone: String,
        address: String,
        optionalAddress: String? = null,
        state: String,
        city: String,
        postalCode: String,
        country: String,
        campaign: SimDiscountCampaign,
        source: String = "appPopup"
    ): SimOrder {
        val popupTracking = _currentPopupTracking.value ?: throw IllegalStateException("No popup tracking session available")

        val order = SimOrder().apply {
            this.user = user
            this.fullName = fullName
            this.userPersonalId = userPersonalId
            this.email = email
            this.phone = phone
            this.address = address
            this.optionalAddress = optionalAddress
            this.state = state
            this.city = city
            this.postalCode = postalCode
            this.country = country
            this.campaign = campaign
            this.source = source
            this.simPopupTracking = popupTracking
            setOrderStatus(SimOrderStatus.PENDING)
            this.isRedeemed = false
        }

        return simPopupRepository.saveSimOrder(order)
    }

    fun submitSimOrderFromForm(
        fullName: String,
        userPersonalId: String,
        email: String,
        phone: String,
        address: String,
        optionalAddress: String?,
        state: String,
        city: String,
        postalCode: String,
        source: String = "appForm"
    ) {
        val user = currentUser
        val campaign = _activeCampaign.value

        if (user == null || campaign == null) {
            Timber.w("RequestSimViewModel: Missing user or campaign for order submission")
            return
        }

        val country = resolveCountry(campaign)

        _isSubmittingOrder.value = true
        viewModelScope.launch(ioContext) {
            runCatching {
                submitSimOrder(
                    user = user,
                    fullName = fullName,
                    userPersonalId = userPersonalId,
                    email = email,
                    phone = phone,
                    address = address,
                    optionalAddress = optionalAddress,
                    state = state,
                    city = city,
                    postalCode = postalCode,
                    country = country,
                    campaign = campaign,
                    source = source
                )
            }.onSuccess {
                Timber.d("RequestSimViewModel: SIM order submitted")
                simAnalytics.track(
                    SimAnalytics.Events.REQUEST_ORDER_RESULT,
                    requestSimContext(screen = SCREEN_ORDER, country = country),
                    campaignParams(campaign) + mapOf(
                        SimAnalytics.Params.RESULT to SimAnalytics.Result.SUCCESS,
                        SimAnalytics.Params.SOURCE to source,
                        SimAnalytics.Params.COUNTRY to country,
                    )
                )
                trackFormCompleted()
                _isSubmittingOrder.postValue(false)
                handleOrderSubmissionSuccess()
            }.onFailure { e ->
                Timber.e(e, "RequestSimViewModel: Failed to submit SIM order")
                CrashlyticsLog.recordNonFatalError(e, "RequestSimViewModel: Failed to submit SIM order")
                simAnalytics.track(
                    SimAnalytics.Events.REQUEST_ORDER_RESULT,
                    requestSimContext(screen = SCREEN_ORDER, country = country),
                    campaignParams(campaign) + mapOf(
                        SimAnalytics.Params.RESULT to SimAnalytics.Result.ERROR,
                        SimAnalytics.Params.SOURCE to source,
                        SimAnalytics.Params.COUNTRY to country,
                        SimAnalytics.Params.ERROR_TYPE to e::class.simpleName,
                    )
                )
                _isSubmittingOrder.postValue(false)
                showOrderSubmissionErrorAlert()
            }
        }
    }

    private fun showOrderSubmissionErrorAlert() {
        _uiEvent.postValue(RequestSimUiEvent.ShowRetryDialog)
    }

    private fun handleOrderSubmissionSuccess() {
        _uiEvent.postValue(RequestSimUiEvent.ShowSuccessDialog)
    }

    fun onUiEventConsumed() {
        _uiEvent.value = null
    }

    fun dismissSuccessAndClosePopup() {
        _showPopup.value = false
    }

    private fun trackEligibilityResult(
        result: String,
        errorType: String? = null,
        wearerCount: Int? = null,
        subscriptionCount: Int? = null,
    ) {
        if (hasTrackedEligibility) return
        hasTrackedEligibility = true
        val campaign = activeCampaignModel
        simAnalytics.track(
            SimAnalytics.Events.REQUEST_ELIGIBILITY_RESULT,
            requestSimContext(screen = SCREEN_ELIGIBILITY),
            campaignParams(campaign) + mapOf(
                SimAnalytics.Params.RESULT to result,
                SimAnalytics.Params.ERROR_TYPE to errorType,
                SimAnalytics.Params.WEARER_COUNT to wearerCount,
                SimAnalytics.Params.SUBSCRIPTION_COUNT to subscriptionCount,
            )
        )
    }

    private fun campaignParams(campaign: SimDiscountCampaign?): Map<String, Any?> =
        mapOf(
            SimAnalytics.Params.CAMPAIGN_ID to campaign?.objectId,
            SimAnalytics.Params.COUNTRY to campaign?.mnoProvider?.country,
            SimAnalytics.Params.HAS_DISCOUNT to (campaign?.discountPercentage ?: 0f > 0f),
            SimAnalytics.Params.DISCOUNT_PERCENT to campaign?.discountPercentage,
        )

    private fun requestSimContext(
        screen: String,
        country: String? = activeCampaignModel?.mnoProvider?.country ?: simPopupRepository.getUserCountry(),
    ): SimAnalytics.SimContext =
        SimAnalytics.SimContext(
            flowId = requestSimFlowId,
            flowType = SimAnalytics.FlowType.REQUEST_SIM,
            entryPoint = SimAnalytics.EntryPoint.POPUP,
            screen = screen,
            country = country,
            watchModel = selectedWearer?.modelName(),
            paymentProvider = activeCampaignModel?.paymentProvider?.name,
        )

    private companion object {
        const val SCREEN_ELIGIBILITY = "request_eligibility"
        const val SCREEN_POPUP = "request_popup"
        const val SCREEN_ORDER = "request_order"
    }
}
