package com.sosmartlabs.momo.sim.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parse.ParseUser
import com.sosmartlabs.momo.addfirstwatch.analytics.AddWatchAnalytics
import com.sosmartlabs.momo.main.model.UserRepository
import com.sosmartlabs.momo.sim.model.SimDiscountCampaign
import com.sosmartlabs.momo.sim.model.SimOrder
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.sim.model.*
import com.sosmartlabs.momo.sim.repository.SimPopupRepository
import com.sosmartlabs.momo.sim.repository.SimRepository
import com.sosmartlabs.momo.sim.repository.SubscriptionPlanRepository
import com.sosmartlabs.momo.sim.repository.SubscriptionRepository
import com.sosmartlabs.momo.sim.repository.SubscriptionUserInfoRepository
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import com.sosmartlabs.momo.testlab.TestLab
import timber.log.Timber
import java.util.UUID
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class NewSubscriptionViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val userRepository: UserRepository,
    private val subscriptionRepository: SubscriptionRepository,
    private val subscriptionPlanRepository: SubscriptionPlanRepository,
    private val subscriptionUserInfoRepository: SubscriptionUserInfoRepository,
    private val simRepository: SimRepository,
    private val simPopupRepository: SimPopupRepository,
    private val addWatchAnalytics: AddWatchAnalytics,
    private val simAnalytics: SimAnalytics,
) : ViewModel() {

    /**
     * Current Sim Country
     */
    private var _currentSimCountry = MutableLiveData<String>()
    val currentSimCountry: LiveData<String>
        get() = _currentSimCountry

    /**
     * Current User
     */
    private var _currentUser = MutableLiveData<ParseUser>()
    val currentUser: LiveData<ParseUser>
        get() = _currentUser

    /**
     * SubscriptionPlan list
     */
    private var _subscriptionPlanMnoProviderList = MutableLiveData<List<SubscriptionPlan>>()
    val subscriptionPlanMnoProviderList: LiveData<List<SubscriptionPlan>>
        get() = _subscriptionPlanMnoProviderList

    /**
     * SubscriptionPlan list filtered by [BillingPeriod.MONTHLY]
     */
    private var _subscriptionPlanMnoProviderListByMonth = MutableLiveData<List<SubscriptionPlan>>()
    val subscriptionPlanMnoProviderListByMonth: LiveData<List<SubscriptionPlan>>
        get() = _subscriptionPlanMnoProviderListByMonth

    /**
     * SubscriptionPlan list filtered by [BillingPeriod.YEARLY]
     */
    private var _subscriptionPlanMnoProviderListByYear = MutableLiveData<List<SubscriptionPlan>>()
    val subscriptionPlanMnoProviderListByYear: LiveData<List<SubscriptionPlan>>
        get() = _subscriptionPlanMnoProviderListByYear

    /**
     * Flag to indicate if QA mode is enabled
     */
    private var _qaModeEnabled = MutableLiveData(false)
    val qaModeEnabled: LiveData<Boolean>
        get() = _qaModeEnabled

    /**
     * Current selected Wearer
     */
    private var _currentWearer = MutableLiveData<Wearer>()
    val currentWearer: LiveData<Wearer>
        get() = _currentWearer

    /**
     * Current selected SubscriptionPlan for buying
     */
    private var _currentSubscriptionPlan = MutableLiveData<SubscriptionPlan>()
    val currentSubscriptionPlan: LiveData<SubscriptionPlan>
        get() = _currentSubscriptionPlan

    /**
     * Current selected BillingPeriod for buying
     */
    private var _currentBillingPeriodSelected = MutableLiveData<BillingPeriod>(BillingPeriod.MONTHLY)
    val currentBillingPeriodSelected: LiveData<BillingPeriod>
        get() = _currentBillingPeriodSelected

    /**
     * Status of the entered Sim card to use in Subscription
     */
    private var _simStatus = MutableLiveData<SimStatus>(SimStatus.DEFAULT)
    val simStatus: LiveData<SimStatus>
        get() = _simStatus

    /**
     * Current selected Sim card to activate
     */
    private var _currentSim = MutableLiveData<Sim?>()
    val currentSim: LiveData<Sim?>
        get() = _currentSim

    /**
     * Current selected SubscriptionsUserInfo to activate
     */
    private var _currentSubscriptionUserInfo = MutableLiveData<SubscriptionsUserInfo>()
    val currentSubscriptionUserInfo: LiveData<SubscriptionsUserInfo>
        get() = _currentSubscriptionUserInfo

    /**
     * Current status of new SubscriptionUserInfo form
     */
    private var _currentSubscriptionUserInfoFormStatus = MutableLiveData<SubscriptionUserInfoFormStatus>(
        SubscriptionUserInfoFormStatus.DEFAULT)
    val currentSubscriptionUserInfoFormStatus: LiveData<SubscriptionUserInfoFormStatus>
        get() = _currentSubscriptionUserInfoFormStatus

    /**
     * New created Subscription after creation flow
     */
    private var _newCreatedSubscription = MutableLiveData<Subscription>()
    val newCreatedSubscription: LiveData<Subscription>
        get() = _newCreatedSubscription

    /**
     * Current status of new Subscription
     */
    private var _newCreatedSubscriptionActivationStatus = MutableLiveData<SubscriptionActivationStatus>(
        SubscriptionActivationStatus.DEFAULT)
    val newCreatedSubscriptionActivationStatus: LiveData<SubscriptionActivationStatus>
        get() = _newCreatedSubscriptionActivationStatus

    /**
     * Apio auth bypass to open
     */
    private var _apioAuthBypassUrl = MutableLiveData<Resource<String, Unit>>()
    val apioAuthBypassUrl: LiveData<Resource<String, Unit>>
        get() = _apioAuthBypassUrl

    /**
     * Apio user cards data object
     */
    private var _apioUserCards = MutableLiveData<Resource<List<PaymentUserCard>, Unit>>()
    val apioUserCards: LiveData<Resource<List<PaymentUserCard>, Unit>>
        get() = _apioUserCards

    /**
     * Apio user cards data object
     */
    private var _currentApioCard = MutableLiveData<PaymentUserCard>()
    val currentApioCard: LiveData<PaymentUserCard>
        get() = _currentApioCard

    /**
     * Pre-inserted SIM for dialog
     */
    private var _preInsertedSimForDialog = MutableLiveData<Sim?>()
    val preInsertedSimForDialog: LiveData<Sim?>
        get() = _preInsertedSimForDialog

    private var _hasShownPreInsertedSimDialog = false

    private val _hasSimDiscount = MutableLiveData(false)
    val hasSimDiscount: LiveData<Boolean>
        get() = _hasSimDiscount

    private val _simDiscountPercentage = MutableLiveData(0f)
    val simDiscountPercentage: LiveData<Float>
        get() = _simDiscountPercentage

    private val _simDiscountOrder = MutableLiveData<SimOrder?>()

    private val _simDiscountCampaign = MutableLiveData<SimDiscountCampaign?>()

    /** Eligibility from the user's unredeemed SimOrder (set by resolveSimDiscount). */
    private var simDiscountEligible: Boolean = false

    /**
     * Fail-safe: the SIM promo discount is treated as blocked until evaluatePreInsertedRestriction
     * confirms the SIM being activated / the assigned wearer is not pre-inserted.
     */
    private var blockedByPreInsertedSim: Boolean = true

    /** Raw campaign discount %. The UI-facing `_simDiscountPercentage` is gated to 0 unless applicable. */
    private var rawSimDiscountPercentage: Float = 0f

    private var addWatchAnalyticsFlowId: String? = null
    private var simAnalyticsFlowId: String? = null
    private var simAnalyticsEntryPoint: String? = null
    @Volatile
    private var hasTrackedSimPaymentResult = false
    @Volatile
    private var hasTrackedSimCompleted = false

    fun setAddWatchAnalyticsContext(flowId: String?) {
        addWatchAnalyticsFlowId = flowId?.takeIf { it.isNotBlank() }
    }

    fun startSimSubscriptionAnalytics(
        entryPoint: String,
        hasPrefilledIccid: Boolean = false,
    ) {
        if (addWatchAnalyticsFlowId != null) return

        simAnalyticsFlowId = UUID.randomUUID().toString()
        simAnalyticsEntryPoint = entryPoint
        hasTrackedSimPaymentResult = false
        hasTrackedSimCompleted = false

        simAnalytics.track(
            SimAnalytics.Events.SUB_STARTED,
            simContext(SCREEN_SUB_STARTED),
            mapOf(
                SimAnalytics.Params.RESULT to SimAnalytics.Result.SUCCESS,
                SimAnalytics.Params.HAS_PREFILLED_ICCID to hasPrefilledIccid,
            )
        )
    }

    fun trackSimPaymentPathSelected(paymentPath: String) {
        simAnalytics.track(
            SimAnalytics.Events.SUB_PAYMENT_PATH_SELECTED,
            simContext(SCREEN_PAYMENT),
            mapOf(
                SimAnalytics.Params.RESULT to SimAnalytics.Result.SUCCESS,
                SimAnalytics.Params.PAYMENT_PATH to paymentPath,
                SimAnalytics.Params.CARD_COUNT to apioUserCards.value?.data?.size,
            )
        )
    }

    fun trackSimPaymentResult(
        result: String,
        paymentPath: String,
        errorType: String? = null,
        httpStatusCode: Int? = null,
    ) {
        // Keep the first terminal non-error result per payment attempt, but allow later provider
        // errors to surface because webviews can fail after intermediate redirects.
        if (hasTrackedSimPaymentResult && result != SimAnalytics.Result.ERROR) return
        hasTrackedSimPaymentResult = true

        simAnalytics.track(
            SimAnalytics.Events.SUB_PAYMENT_RESULT,
            simContext(SCREEN_PAYMENT),
            mapOf(
                SimAnalytics.Params.RESULT to result,
                SimAnalytics.Params.PAYMENT_PATH to paymentPath,
                SimAnalytics.Params.ERROR_TYPE to errorType,
                SimAnalytics.Params.HTTP_STATUS_CODE to httpStatusCode,
            )
        )
    }

    fun resetSimPaymentResultTracking() {
        hasTrackedSimPaymentResult = false
    }

    fun trackSimSubscriptionCompleted() {
        if (hasTrackedSimCompleted) return
        hasTrackedSimCompleted = true

        val subscription = newCreatedSubscription.value
        simAnalytics.track(
            SimAnalytics.Events.SUB_COMPLETED,
            simContext(SCREEN_COMPLETED),
            mapOf(
                SimAnalytics.Params.RESULT to SimAnalytics.Result.SUCCESS,
                SimAnalytics.Params.STATUS to subscription?.getSubscriptionStatus()?.name,
                SimAnalytics.Params.HAS_PHONE to !subscription?.msisdn.isNullOrBlank(),
            )
        )
    }

    private fun simContext(screen: String): SimAnalytics.SimContext? {
        if (addWatchAnalyticsFlowId != null) return null
        val flowId = simAnalyticsFlowId ?: return null
        val plan = currentSubscriptionPlan.value
        return SimAnalytics.SimContext(
            flowId = flowId,
            flowType = SimAnalytics.FlowType.NEW_SUBSCRIPTION,
            entryPoint = simAnalyticsEntryPoint,
            screen = screen,
            country = currentSimCountry.value ?: currentSim.value?.mnoProvider?.country,
            watchModel = currentWearer.value?.modelName(),
            paymentProvider = plan?.paymentProvider?.name ?: currentSim.value?.paymentProvider?.name,
            billingPeriod = plan?.billingPeriodType ?: currentBillingPeriodSelected.value?.key,
        )
    }

    private fun addWatchContext(
        screen: String,
        simPath: String = SIM_PATH_SOYMOMO,
        country: String? = null,
    ): AddWatchAnalytics.AddWatchContext? {
        val flowId = addWatchAnalyticsFlowId ?: return null
        return AddWatchAnalytics.AddWatchContext(
            flowId = flowId,
            screen = screen,
            country = country ?: currentSimCountry.value ?: currentSim.value?.mnoProvider?.country,
            watchModel = currentWearer.value?.model?.let { it::class.simpleName },
            simPath = simPath,
        )
    }

    private fun trackAddWatchSimLookupResult(
        status: SimStatus,
        inputLength: Int? = null,
        country: String? = null,
        simPath: String = SIM_PATH_SOYMOMO,
        hasPreInsertedSim: Boolean? = null,
    ) {
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.SIM_LOOKUP_RESULT,
            addWatchContext(SCREEN_SIM_LOOKUP, simPath, country),
            mapOf(
                AddWatchAnalytics.Params.RESULT to status.analyticsResult(),
                AddWatchAnalytics.Params.STATUS to status.name,
                AddWatchAnalytics.Params.INPUT_LENGTH to inputLength,
                AddWatchAnalytics.Params.HAS_PREINSERTED_SIM to hasPreInsertedSim,
            )
        )
    }

    private fun trackAddWatchPlanSelected(plan: SubscriptionPlan) {
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.PLAN_SELECTED,
            addWatchContext(SCREEN_PLAN_SELECTED, country = plan.paymentProvider.country),
            mapOf(
                AddWatchAnalytics.Params.RESULT to AddWatchAnalytics.Result.SUCCESS,
                AddWatchAnalytics.Params.PLAN_ID to plan.objectId,
                AddWatchAnalytics.Params.BILLING_PERIOD to plan.billingPeriodType,
                AddWatchAnalytics.Params.PAYMENT_PROVIDER to plan.paymentProvider.name,
            )
        )
    }

    private fun trackAddWatchSubscriptionResult(
        status: SubscriptionActivationStatus,
        result: String,
        errorType: String? = null,
    ) {
        val plan = currentSubscriptionPlan.value
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.SUBSCRIPTION_RESULT,
            addWatchContext(SCREEN_SUBSCRIPTION_RESULT),
            mapOf(
                AddWatchAnalytics.Params.RESULT to result,
                AddWatchAnalytics.Params.STATUS to status.name,
                AddWatchAnalytics.Params.ERROR_TYPE to errorType,
                AddWatchAnalytics.Params.PLAN_ID to plan?.objectId,
                AddWatchAnalytics.Params.BILLING_PERIOD to plan?.billingPeriodType,
                AddWatchAnalytics.Params.PAYMENT_PROVIDER to plan?.paymentProvider?.name,
            )
        )
    }

    private fun trackSimIccidSubmitted(inputLength: Int, inputMethod: String) {
        if (inputLength < 19 && inputMethod == SimAnalytics.InputMethod.MANUAL) return

        simAnalytics.track(
            SimAnalytics.Events.SUB_ICCID_SUBMITTED,
            simContext(SCREEN_SIM_LOOKUP),
            mapOf(
                SimAnalytics.Params.INPUT_LENGTH to inputLength,
                SimAnalytics.Params.INPUT_METHOD to inputMethod,
            )
        )
    }

    private fun trackSimIccidResult(
        status: SimStatus,
        inputLength: Int? = null,
        inputMethod: String? = null,
        country: String? = null,
        hasPreInsertedSim: Boolean? = null,
    ) {
        simAnalytics.track(
            SimAnalytics.Events.SUB_ICCID_RESULT,
            simContext(SCREEN_SIM_LOOKUP)?.copy(country = country ?: currentSimCountry.value ?: currentSim.value?.mnoProvider?.country),
            mapOf(
                SimAnalytics.Params.RESULT to status.analyticsResult(),
                SimAnalytics.Params.STATUS to status.name,
                SimAnalytics.Params.INPUT_LENGTH to inputLength,
                SimAnalytics.Params.INPUT_METHOD to inputMethod,
                SimAnalytics.Params.HAS_PREINSERTED_SIM to hasPreInsertedSim,
            )
        )
    }

    private fun trackSimPlanSelected(plan: SubscriptionPlan) {
        simAnalytics.track(
            SimAnalytics.Events.SUB_PLAN_SELECTED,
            simContext(SCREEN_PLAN_SELECTED)?.copy(
                country = plan.paymentProvider.country,
                paymentProvider = plan.paymentProvider.name,
                billingPeriod = plan.billingPeriodType,
            ),
            mapOf(
                SimAnalytics.Params.RESULT to SimAnalytics.Result.SUCCESS,
                SimAnalytics.Params.PLAN_ID to plan.objectId,
                SimAnalytics.Params.BILLING_PERIOD to plan.billingPeriodType,
                SimAnalytics.Params.PAYMENT_PROVIDER to plan.paymentProvider.name,
                SimAnalytics.Params.HAS_DISCOUNT to (hasSimDiscount.value == true),
                SimAnalytics.Params.DISCOUNT_PERCENT to simDiscountPercentage.value,
                SimAnalytics.Params.CAMPAIGN_ID to _simDiscountCampaign.value?.objectId,
            )
        )
    }

    private fun trackSimUserInfoResult(result: String, errorType: String? = null) {
        simAnalytics.track(
            SimAnalytics.Events.SUB_USER_INFO_RESULT,
            simContext(SCREEN_USER_INFO),
            mapOf(
                SimAnalytics.Params.RESULT to result,
                SimAnalytics.Params.ERROR_TYPE to errorType,
                SimAnalytics.Params.HAS_PHONE to true,
            )
        )
    }

    private fun trackSimActivationResult(
        status: SubscriptionActivationStatus,
        result: String,
        errorType: String? = null,
        hasPhone: Boolean? = null,
    ) {
        val plan = currentSubscriptionPlan.value
        simAnalytics.track(
            SimAnalytics.Events.SUB_ACTIVATION_RESULT,
            simContext(SCREEN_SUBSCRIPTION_RESULT),
            mapOf(
                SimAnalytics.Params.RESULT to result,
                SimAnalytics.Params.STATUS to status.name,
                SimAnalytics.Params.ERROR_TYPE to errorType,
                SimAnalytics.Params.HAS_PHONE to hasPhone,
                SimAnalytics.Params.PLAN_ID to plan?.objectId,
            )
        )
    }

    /**
     * Loads the current user
     */
    fun getCurrentUser() {
        viewModelScope.launch(ioContext) {
            userRepository.getCurrentUser()?.let {
                _currentUser.postValue(it)
                Timber.d("NewSubscriptionViewModel: getCurrentUser() - User loaded")
                CrashlyticsLog.log("Current user loaded")
                resolveSimDiscount()
            } ?: run {
                Timber.e("NewSubscriptionViewModel: getCurrentUser() - Failed to load user")
                CrashlyticsLog.log("Failed to load current user")
            }
        }
    }

    /**
     * Loads the SubscriptionPlans for a given Sim and saves for each [BillingPeriod] type
     */
    fun getSubscriptionPlansForSim(sim: Sim, isQA: Boolean = false) {
        Timber.d("NewSubscriptionViewModel: getSubscriptionPlansForSim() - Starting, isQA: $isQA")
        CrashlyticsLog.log("Getting subscription plans for SIM, isQA: $isQA")

        viewModelScope.launch(ioContext) {
            runCatching {
                val mnoProvider = sim.mnoProvider
                Timber.d("NewSubscriptionViewModel: getSubscriptionPlansForSim() - Using MNO provider: ${mnoProvider.name}")
                CrashlyticsLog.log("Using MNO provider: ${mnoProvider.name}")

                val paymentProviderName = sim.paymentProvider.name
                Timber.d("NewSubscriptionViewModel: getSubscriptionPlansForSim() - Using payment provider: $paymentProviderName")
                CrashlyticsLog.log("Using payment provider: $paymentProviderName")

                val subscriptionPlans = TestLab.mockSubscriptionPlans(sim)
                    ?: subscriptionPlanRepository.getSubscriptionPlans(mnoProvider = mnoProvider, paymentProviderName = paymentProviderName, isQA = isQA)
                subscriptionPlans
            }.onSuccess { subscriptionPlans ->
                Timber.d("NewSubscriptionViewModel: getSubscriptionPlansForSim() - Loaded ${subscriptionPlans.size} plans")
                CrashlyticsLog.log("Successfully loaded ${subscriptionPlans.size} subscription plans")

                val subscriptionPlansByMonth = subscriptionPlans.filter { it.billingPeriodType == BillingPeriod.MONTHLY.key }
                val subscriptionPlansByYear = subscriptionPlans.filter { it.billingPeriodType == BillingPeriod.YEARLY.key }

                _subscriptionPlanMnoProviderList.postValue(subscriptionPlans)
                _subscriptionPlanMnoProviderListByMonth.postValue(subscriptionPlansByMonth)
                _subscriptionPlanMnoProviderListByYear.postValue(subscriptionPlansByYear)

                Timber.d("NewSubscriptionViewModel: getSubscriptionPlansForSim() - Posted ${subscriptionPlansByMonth.size} monthly and ${subscriptionPlansByYear.size} yearly plans")
            }.onFailure {
                Timber.e("NewSubscriptionViewModel: getSubscriptionPlansForSim() - Error")
                CrashlyticsLog.recordNonFatalError(it, "Error getting subscription plans for SIM")
            }
        }
    }

    /**
     * Loads the SubscriptionUserInfo
     */
    fun getSubscriptionUserInfo(user: ParseUser, country: String) {
        Timber.d("NewSubscriptionViewModel: getSubscriptionUserInfo() - Starting for country $country")
        CrashlyticsLog.log("Getting subscription user info for country $country")
        
        viewModelScope.launch(ioContext) {
            val userInfo = subscriptionUserInfoRepository.getSubscriptionUserInfo(user, country)
            userInfo?.let {
                Timber.d("NewSubscriptionViewModel: getSubscriptionUserInfo() - Loaded user info")
                CrashlyticsLog.log("Successfully loaded subscription user info")
                _currentSubscriptionUserInfo.postValue(it)
            } ?: run {
                Timber.d("NewSubscriptionViewModel: getSubscriptionUserInfo() - No user info found")
                CrashlyticsLog.log("No subscription user info found")
            }
        }
    }

    /**
     * Get Sim to activate
     */
    fun getSim(
        iccId: String,
        inputMethod: String = SimAnalytics.InputMethod.MANUAL,
    ) {
        Timber.d("NewSubscriptionViewModel: getSim() - Starting lookup")
        CrashlyticsLog.log("Getting SIM")
        val inputLength = iccId.length
        trackSimIccidSubmitted(inputLength, inputMethod)

        viewModelScope.launch(ioContext) {
            _simStatus.postValue(SimStatus.SEARCHING)
            Timber.d("NewSubscriptionViewModel: getSim() - Set status to SEARCHING")
            
            when (iccId.length) {
                19, 20 -> {
                    // Prepare the iccId by removing any non-digit characters like 'F' at the end for T-Mobile SIMs
                    val cleanedIccId = if (iccId.endsWith("F")) iccId.dropLast(1) else iccId
                    Timber.d("NewSubscriptionViewModel: getSim() - Cleaned ICC ID for lookup")
                    CrashlyticsLog.log("Cleaned ICC ID for lookup")
                    
                    val sim = simRepository.getSim(cleanedIccId)
                    if (sim != null) {
                        Timber.d("NewSubscriptionViewModel: getSim() - SIM found")
                        CrashlyticsLog.log("SIM found")
                        
                        if (simRepository.isSimRetired(sim)) {
                            Timber.d("NewSubscriptionViewModel: getSim() - SIM is retired")
                            CrashlyticsLog.log("SIM is retired")
                            trackAddWatchSimLookupResult(
                                status = SimStatus.SIM_RETIRED,
                                inputLength = inputLength,
                                country = sim.mnoProvider.country,
                            )
                            trackSimIccidResult(
                                status = SimStatus.SIM_RETIRED,
                                inputLength = inputLength,
                                inputMethod = inputMethod,
                                country = sim.mnoProvider.country,
                            )
                            _simStatus.postValue(SimStatus.SIM_RETIRED)
                        } else if (simRepository.isSimInUse(sim)) {
                            Timber.d("NewSubscriptionViewModel: getSim() - SIM already in use")
                            CrashlyticsLog.log("SIM already in use")
                            trackAddWatchSimLookupResult(
                                status = SimStatus.SIM_ALREADY_IN_USE,
                                inputLength = inputLength,
                                country = sim.mnoProvider.country,
                            )
                            trackSimIccidResult(
                                status = SimStatus.SIM_ALREADY_IN_USE,
                                inputLength = inputLength,
                                inputMethod = inputMethod,
                                country = sim.mnoProvider.country,
                            )
                            _simStatus.postValue(SimStatus.SIM_ALREADY_IN_USE)
                        } else {
                            Timber.d("NewSubscriptionViewModel: getSim() - SIM available, checking for Alai")
                            val mnoProviderName = sim.mnoProvider.name
                            if (mnoProviderName.equals("Alai", ignoreCase = true)) {
                                Timber.d("NewSubscriptionViewModel: getSim() - SIM available, but is Alai")
                                CrashlyticsLog.log("SIM is Alai provider")
                                trackAddWatchSimLookupResult(
                                    status = SimStatus.ALAI,
                                    inputLength = inputLength,
                                    country = sim.mnoProvider.country,
                                )
                                trackSimIccidResult(
                                    status = SimStatus.ALAI,
                                    inputLength = inputLength,
                                    inputMethod = inputMethod,
                                    country = sim.mnoProvider.country,
                                )
                                _simStatus.postValue(SimStatus.ALAI)
                            } else {
                                Timber.d("NewSubscriptionViewModel: getSim() - SIM available, all ok, setting current SIM")
                                CrashlyticsLog.log("SIM available and valid")
                                trackAddWatchSimLookupResult(
                                    status = SimStatus.SIM_AVAILABLE,
                                    inputLength = inputLength,
                                    country = sim.mnoProvider.country,
                                )
                                trackSimIccidResult(
                                    status = SimStatus.SIM_AVAILABLE,
                                    inputLength = inputLength,
                                    inputMethod = inputMethod,
                                    country = sim.mnoProvider.country,
                                )
                                _simStatus.postValue(SimStatus.SIM_AVAILABLE)
                                setCurrentSim(sim)
                            }
                        }
                    } else {
                        Timber.d("NewSubscriptionViewModel: getSim() - SIM not found")
                        CrashlyticsLog.log("SIM not found")
                        trackAddWatchSimLookupResult(
                            status = SimStatus.SIM_NOT_FOUND,
                            inputLength = inputLength,
                        )
                        trackSimIccidResult(
                            status = SimStatus.SIM_NOT_FOUND,
                            inputLength = inputLength,
                            inputMethod = inputMethod,
                        )
                        _simStatus.postValue(SimStatus.SIM_NOT_FOUND)
                    }
                }
                else -> {
                    Timber.d("NewSubscriptionViewModel: getSim() - Invalid ICC ID length: ${iccId.length}")
                    CrashlyticsLog.log("Invalid ICC ID length: ${iccId.length}")
                    trackAddWatchSimLookupResult(
                        status = SimStatus.ICC_ID_LENGTH,
                        inputLength = inputLength,
                    )
                    trackSimIccidResult(
                        status = SimStatus.ICC_ID_LENGTH,
                        inputLength = inputLength,
                        inputMethod = inputMethod,
                    )
                    _simStatus.postValue(SimStatus.ICC_ID_LENGTH)
                }
            }
        }
    }

    /**
     * Sets the selected Wearer
     */
    fun setCurrentWearer(wearer: Wearer) {
        viewModelScope.launch(ioContext) {
            _currentWearer.postValue(wearer)
            getPreInsertedSimForCurrentWatch(wearer)
            Timber.d("NewSubscriptionViewModel: setCurrentWearer() - Set wearer")
            CrashlyticsLog.log("Set current wearer")
            simAnalytics.track(
                SimAnalytics.Events.SUB_WEARER_SELECTED,
                simContext(SCREEN_WEARER_SELECTED)?.copy(watchModel = wearer.modelName()),
                mapOf(SimAnalytics.Params.RESULT to SimAnalytics.Result.SUCCESS)
            )
        }
    }

    /**
     * Sets the selected SubscriptionPlan for buying
     */
    fun setCurrentSubscriptionPlan(index: Int) {
        viewModelScope.launch(ioContext) {
            runCatching {
                when(currentBillingPeriodSelected.value ?: BillingPeriod.MONTHLY) {
                    BillingPeriod.MONTHLY -> {
                        val selectedPlan = subscriptionPlanMnoProviderListByMonth.value!![index]
                        _currentSubscriptionPlan.postValue(selectedPlan)
                        trackAddWatchPlanSelected(selectedPlan)
                        trackSimPlanSelected(selectedPlan)
                        Timber.d("NewSubscriptionViewModel: setCurrentSubscriptionPlan() - Set monthly plan at index $index")
                        CrashlyticsLog.log("Set monthly subscription plan at index $index")
                    }
                    BillingPeriod.YEARLY -> {
                        val selectedPlan = subscriptionPlanMnoProviderListByYear.value!![index]
                        _currentSubscriptionPlan.postValue(selectedPlan)
                        trackAddWatchPlanSelected(selectedPlan)
                        trackSimPlanSelected(selectedPlan)
                        Timber.d("NewSubscriptionViewModel: setCurrentSubscriptionPlan() - Set yearly plan at index $index")
                        CrashlyticsLog.log("Set yearly subscription plan at index $index")
                    }
                }
            }.onSuccess {
                Timber.d("NewSubscriptionViewModel: setCurrentSubscriptionPlan() - Successfully set subscription plan")
            }.onFailure {
                Timber.e("NewSubscriptionViewModel: setCurrentSubscriptionPlan() - Error")
                CrashlyticsLog.recordNonFatalError(it, "Error setting subscription plan at index $index")
            }
        }
    }

    /**
     * Sets the selected BillingPeriod for buying
     */
    fun setCurrentBillingPeriod(billingPeriod: BillingPeriod) {
        viewModelScope.launch(ioContext) {
            _currentBillingPeriodSelected.postValue(billingPeriod)
            Timber.d("NewSubscriptionViewModel: setCurrentBillingPeriod() - Set to $billingPeriod")
            CrashlyticsLog.log("Set billing period to $billingPeriod")
        }
    }

    /**
     * Sets the selected SIM and country
     */
    private fun setCurrentSim(sim: Sim) {
        viewModelScope.launch(ioContext) {
            _currentSim.postValue(sim)
            _currentSimCountry.postValue(sim.mnoProvider.country)
            Timber.d("NewSubscriptionViewModel: setCurrentSim() - Set SIM, status: SIM_AVAILABLE, country: ${sim.mnoProvider.country}")
            CrashlyticsLog.log("Set current SIM, country: ${sim.mnoProvider.country}")
        }
    }

    /**
     * Sets the selected SIM to null
     */
    fun setNullSim() {
        viewModelScope.launch(ioContext) {
            _currentSim.postValue(null)
            Timber.d("NewSubscriptionViewModel: setNullSim() - Current SIM set to null")
            CrashlyticsLog.log("Current SIM set to null")
        }
    }

    /**
     * Check for a SIM related to the selected Wearer
     */
    private fun getPreInsertedSimForCurrentWatch(watch: Wearer) {
        viewModelScope.launch(ioContext) {
            Timber.d("NewSubscriptionViewModel: getSimByWatch() - Searching SIM for watch")
            CrashlyticsLog.log("Searching pre-inserted SIM for watch")
            val sim = simRepository.getSimByWatch(watch)
            if (sim != null) {
                Timber.d("NewSubscriptionViewModel: getSimByWatch() - SIM found")
                CrashlyticsLog.log("Pre-inserted SIM found")
                if (simRepository.isSimRetired(sim)) {
                    Timber.d("NewSubscriptionViewModel: getSimByWatch() - SIM is retired, ignoring as pre-inserted")
                    CrashlyticsLog.log("Pre-inserted SIM is retired")
                    trackAddWatchSimLookupResult(
                        status = SimStatus.SIM_RETIRED,
                        country = sim.mnoProvider.country,
                        simPath = SIM_PATH_PREINSERTED,
                        hasPreInsertedSim = false,
                    )
                    trackSimIccidResult(
                        status = SimStatus.SIM_RETIRED,
                        country = sim.mnoProvider.country,
                        hasPreInsertedSim = false,
                    )
                    _simStatus.postValue(SimStatus.DEFAULT)
                } else if (simRepository.isSimInUse(sim)) {
                    Timber.d("NewSubscriptionViewModel: getSimByWatch() - SIM already in use")
                    CrashlyticsLog.log("Pre-inserted SIM already in use")
                    trackAddWatchSimLookupResult(
                        status = SimStatus.SIM_ALREADY_IN_USE,
                        country = sim.mnoProvider.country,
                        simPath = SIM_PATH_PREINSERTED,
                        hasPreInsertedSim = true,
                    )
                    trackSimIccidResult(
                        status = SimStatus.SIM_ALREADY_IN_USE,
                        country = sim.mnoProvider.country,
                        hasPreInsertedSim = true,
                    )
                    _simStatus.postValue(SimStatus.SIM_ALREADY_IN_USE)
                } else {
                    Timber.d("NewSubscriptionViewModel: getSimByWatch() - SIM available, setting current SIM")
                    CrashlyticsLog.log("Pre-inserted SIM available and valid")
                    trackAddWatchSimLookupResult(
                        status = SimStatus.SIM_AVAILABLE,
                        country = sim.mnoProvider.country,
                        simPath = SIM_PATH_PREINSERTED,
                        hasPreInsertedSim = true,
                    )
                    trackSimIccidResult(
                        status = SimStatus.SIM_AVAILABLE,
                        country = sim.mnoProvider.country,
                        hasPreInsertedSim = true,
                    )
                    _simStatus.postValue(SimStatus.SIM_AVAILABLE)
                    setCurrentSim(sim)
                }
            } else {
                Timber.d("NewSubscriptionViewModel: getSimByWatch() - No SIM found for watch")
                CrashlyticsLog.log("No pre-inserted SIM found for watch")
                trackAddWatchSimLookupResult(
                    status = SimStatus.SIM_NOT_FOUND,
                    simPath = SIM_PATH_PREINSERTED,
                    hasPreInsertedSim = false,
                )
                trackSimIccidResult(
                    status = SimStatus.SIM_NOT_FOUND,
                    hasPreInsertedSim = false,
                )
                _simStatus.postValue(SimStatus.DEFAULT)
            }
        }
    }

    /**
     * Sets the current SubscriptionUserInfo
     */
    private fun setCurrentSubscriptionUserInfo(subscriberUserInfo: SubscriptionsUserInfo){
        viewModelScope.launch(ioContext) {
            runCatching {
                _currentSubscriptionUserInfo.postValue(subscriberUserInfo)
                setCurrentSubscriptionUserInfoFormStatus(SubscriptionUserInfoFormStatus.SUCCESS)
                Timber.d("NewSubscriptionViewModel: setCurrentSubscriptionUserInfo() - Set user info, status: SUCCESS")
                CrashlyticsLog.log("Set subscription user info")
                trackSimUserInfoResult(SimAnalytics.Result.SUCCESS)
            }.onFailure {
                Timber.e("NewSubscriptionViewModel: setCurrentSubscriptionUserInfo() - Error")
                CrashlyticsLog.recordNonFatalError(it, "Error setting subscription user info")
                trackSimUserInfoResult(SimAnalytics.Result.ERROR, it::class.simpleName)
            }
        }
    }

    /**
     * Sets the selected SubscriptionUserInfoFormStatus for current form
     */
    fun setCurrentSubscriptionUserInfoFormStatus(status: SubscriptionUserInfoFormStatus) {
        viewModelScope.launch(ioContext) {
            Timber.d("NewSubscriptionViewModel: setCurrentSubscriptionUserInfoFormStatus() - Set status: $status")
            CrashlyticsLog.log("Set subscription user info form status: $status")
            _currentSubscriptionUserInfoFormStatus.postValue(status)
        }
    }

    /**
     * Sets the selected ApioCard
     */
    fun setCurrentApioCard(apioCard: PaymentUserCard) {
        viewModelScope.launch(ioContext) {
            _currentApioCard.postValue(apioCard)
            Timber.d("NewSubscriptionViewModel: setCurrentApioCard() - Set card")
            CrashlyticsLog.log("Set Apio card")
        }
    }

    /**
     * Creates the selected SubscriptionUserInfoFormStatus for current form
     */
    fun createSubscriptionUserInfo(params: MutableMap<String,Any>, country: String) {
        setCurrentSubscriptionUserInfoFormStatus(SubscriptionUserInfoFormStatus.SAVING)
        Timber.d("NewSubscriptionViewModel: createSubscriptionUserInfo() - Starting creation for country: $country")
        CrashlyticsLog.log("Creating subscription user info for country: $country")
        
        viewModelScope.launch(ioContext) {
            runCatching {
                subscriptionUserInfoRepository.createSubscriptionUserInfo(params, country)
            }.onSuccess { subscriptionUserInfo ->
                Timber.d("NewSubscriptionViewModel: createSubscriptionUserInfo() - Created user info")
                CrashlyticsLog.log("Created subscription user info")
                setCurrentSubscriptionUserInfo(subscriptionUserInfo)
            }.onFailure { error ->
                Timber.e(error, "NewSubscriptionViewModel: createSubscriptionUserInfo() - Error")
                CrashlyticsLog.recordNonFatalError(error, "Error creating subscription user info")
                trackSimUserInfoResult(SimAnalytics.Result.ERROR, error::class.simpleName)
                _currentSubscriptionUserInfoFormStatus.postValue(SubscriptionUserInfoFormStatus.ERROR_SAVE)
            }
        }
    }

    /**
     * Sets the new created Subscription after flow
     */
    private fun setNewCreatedSubscription(subscription: Subscription) {
        viewModelScope.launch(ioContext) {
            _newCreatedSubscription.postValue(subscription)
            Timber.d("NewSubscriptionViewModel: setNewCreatedSubscription() - Set subscription")
            CrashlyticsLog.log("Set new created subscription")
            
            when (subscription.getSubscriptionStatus()) {
                SubscriptionStatus.ACTIVE -> {
                    Timber.d("NewSubscriptionViewModel: setNewCreatedSubscription() - Status: ACTIVE")
                    CrashlyticsLog.log("Subscription status: ACTIVE")
                    trackAddWatchSubscriptionResult(
                        status = SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS,
                        result = AddWatchAnalytics.Result.SUCCESS,
                    )
                    trackSimActivationResult(
                        status = SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS,
                        result = SimAnalytics.Result.SUCCESS,
                        hasPhone = !subscription.msisdn.isNullOrBlank(),
                    )
                    _newCreatedSubscriptionActivationStatus.postValue(SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS)
                }
                SubscriptionStatus.PREACTIVATED -> {
                    Timber.d("NewSubscriptionViewModel: setNewCreatedSubscription() - Status: PREACTIVATED")
                    CrashlyticsLog.log("Subscription status: PREACTIVATED")
                    trackAddWatchSubscriptionResult(
                        status = SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS_NO_PHONE,
                        result = AddWatchAnalytics.Result.SUCCESS,
                    )
                    trackSimActivationResult(
                        status = SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS_NO_PHONE,
                        result = SimAnalytics.Result.SUCCESS,
                        hasPhone = false,
                    )
                    _newCreatedSubscriptionActivationStatus.postValue(SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS_NO_PHONE)
                }
                else -> {
                    Timber.d("NewSubscriptionViewModel: setNewCreatedSubscription() - Status: ERROR")
                    CrashlyticsLog.log("Subscription status: ERROR")
                    trackAddWatchSubscriptionResult(
                        status = SubscriptionActivationStatus.SUBSCRIPTION_ERROR,
                        result = AddWatchAnalytics.Result.ERROR,
                    )
                    trackSimActivationResult(
                        status = SubscriptionActivationStatus.SUBSCRIPTION_ERROR,
                        result = SimAnalytics.Result.ERROR,
                    )
                    _newCreatedSubscriptionActivationStatus.postValue(SubscriptionActivationStatus.SUBSCRIPTION_ERROR)
                }
            }
        }
    }

    /**
     * Activates the Sim card
     */
    fun activateSimCard() {
        if (currentSim.value != null) {
            Timber.d("NewSubscriptionViewModel: activateSimCard() - Starting activation")
            CrashlyticsLog.log("Starting SIM activation")
            
            viewModelScope.launch(ioContext) {
                runCatching {
                    _newCreatedSubscriptionActivationStatus.postValue(SubscriptionActivationStatus.SUBSCRIPTION_SAVING)
                    val currentWearer = currentWearer.value!!
                    val currentSim = currentSim.value!!
                    val currentSubscriptionPlan = currentSubscriptionPlan.value!!
                    val currentSubscriptionsUserInfo = currentSubscriptionUserInfo.value!!

                    Timber.d("NewSubscriptionViewModel: activateSimCard() - Activating subscription for selected plan")
                    CrashlyticsLog.log("Activating subscription for selected plan")

                    val subscription = TestLab.mockActivatedSubscription(
                        watch = currentWearer,
                        sim = currentSim,
                        plan = currentSubscriptionPlan,
                        subscriber = currentSubscriptionsUserInfo,
                    ) ?: subscriptionRepository.activateSubscription(
                        watch = currentWearer,
                        iccId = currentSim.iccId,
                        planId = currentSubscriptionPlan.objectId,
                        subscriberId = currentSubscriptionsUserInfo.objectId,
                    )

                    Timber.d("NewSubscriptionViewModel: activateSimCard() - Activation complete, setting new subscription")
                    CrashlyticsLog.log("SIM activation complete")
                    subscription
                }.onSuccess { subscription ->
                    setNewCreatedSubscription(subscription)
                }.onFailure { error ->
                    Timber.e("NewSubscriptionViewModel: activateSimCard() - Error during activation")
                    CrashlyticsLog.recordNonFatalError(error, "Error activating SIM")
                    trackAddWatchSubscriptionResult(
                        status = SubscriptionActivationStatus.SUBSCRIPTION_ERROR,
                        result = AddWatchAnalytics.Result.ERROR,
                        errorType = error::class.simpleName,
                    )
                    trackSimActivationResult(
                        status = SubscriptionActivationStatus.SUBSCRIPTION_ERROR,
                        result = SimAnalytics.Result.ERROR,
                        errorType = error::class.simpleName,
                    )
                    _newCreatedSubscriptionActivationStatus.postValue(SubscriptionActivationStatus.SUBSCRIPTION_ERROR)
                }

            }
        } else {
            Timber.e("NewSubscriptionViewModel: activateSimCard() - Sim is null")
            CrashlyticsLog.log("Cannot activate SIM - current SIM is null")
            trackAddWatchSubscriptionResult(
                status = SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS_NO_PHONE,
                result = AddWatchAnalytics.Result.SKIPPED,
                errorType = "sim_missing",
            )
            trackSimActivationResult(
                status = SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS_NO_PHONE,
                result = SimAnalytics.Result.SKIPPED,
                errorType = "sim_missing",
                hasPhone = false,
            )
            _newCreatedSubscriptionActivationStatus.postValue(SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS_NO_PHONE)
        }
    }

    /**
     * Resets the SimStatus to DEFAULT
     */
    fun resetSimStatus() {
        viewModelScope.launch(ioContext) {
            _simStatus.postValue(SimStatus.DEFAULT)
            Timber.d("NewSubscriptionViewModel: resetSimStatus() - Reset to DEFAULT")
            CrashlyticsLog.log("Reset SIM status to DEFAULT")
        }
    }

    /**
     * Resets the SubscriptionUserInfoFormStatus to DEFAULT
     */
    fun resetCurrentSubscriptionUserInfoStatus() {
        viewModelScope.launch(ioContext) {
            _currentSubscriptionUserInfoFormStatus.postValue(SubscriptionUserInfoFormStatus.DEFAULT)
            Timber.d("NewSubscriptionViewModel: resetCurrentSubscriptionUserInfoStatus() - Reset to DEFAULT")
            CrashlyticsLog.log("Reset subscription user info form status to DEFAULT")
        }
    }

    /**
     * Creates an Apio auth bypass url
     */
    fun createApioAuthBypass(subscriptionUserInfo: SubscriptionsUserInfo) {
        viewModelScope.launch(ioContext) {
            runCatching {
                _apioAuthBypassUrl.postValue(Resource(status = Resource.Status.LOADING))
                CrashlyticsLog.log("Creating Apio auth bypass")
                Timber.d("NewSubscriptionViewModel: createApioAuthBypass() - Creating")
                
                val apioAuthBypassUrl = subscriptionRepository.createApioAuthBypass(subscriptionUserInfo.objectId)
                Timber.d("NewSubscriptionViewModel: createApioAuthBypass() - Response received")
                
                val data = apioAuthBypassUrl!!["data"] as HashMap<*, *>
                val url = data["data"] as String
                url
            }.onSuccess {
                _apioAuthBypassUrl.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = it))
                Timber.d("NewSubscriptionViewModel: createApioAuthBypass() - Success")
                CrashlyticsLog.log("Successfully created Apio auth bypass URL")
            }.onFailure {
                _apioAuthBypassUrl.postValue(Resource(Resource.Status.LOAD_ERROR))
                Timber.e("NewSubscriptionViewModel: createApioAuthBypass() - Error")
                CrashlyticsLog.recordNonFatalError(it, "Error creating Apio auth bypass")
            }
        }
    }

    /**
     * Get Apio user cards
     */
    fun getApioUserCards(subscriptionUserInfo: SubscriptionsUserInfo) {
        viewModelScope.launch(ioContext) {
            runCatching {
                _apioUserCards.postValue(Resource(status = Resource.Status.LOADING))
                // Read the repository directly instead of currentUser.value, which
                // may not have been posted yet when this screen loads (same pattern
                // as resolveSimDiscount). A genuinely missing user lands in
                // onFailure below as LOAD_ERROR.
                val user = userRepository.getCurrentUser()
                    ?: throw IllegalStateException("No current user when fetching Apio cards")
                CrashlyticsLog.log("Getting Apio cards")
                Timber.d("NewSubscriptionViewModel: getApioUserCards() - Fetching")
                val apioCards = subscriptionRepository.getApioUserCards(user, subscriptionUserInfo)
                Timber.d("NewSubscriptionViewModel: getApioUserCards() - Fetched cards")
                apioCards
            }.onSuccess { cards ->
                Timber.d("NewSubscriptionViewModel: getApioUserCards() - Success, ${cards.size} cards fetched")
                CrashlyticsLog.log("Successfully fetched ${cards.size} Apio cards")
                _apioUserCards.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = cards))
            }.onFailure {
                _apioUserCards.postValue(Resource(status = Resource.Status.LOAD_ERROR))
                Timber.e("NewSubscriptionViewModel: getApioUserCards() - Error")
                CrashlyticsLog.recordNonFatalError(it, "Error getting Apio user cards")
            }
        }
    }

    /**
     * Creates an Apio Subscription
     */
    fun createApioSubscription(subscription: Subscription) {
        if (TestLab.isTestSim(subscription.iccId)) {
            Timber.w("NewSubscriptionViewModel: createApioSubscription() - Skipped for Test Lab SIM")
            return
        }
        viewModelScope.launch(ioContext) {
            runCatching {
                CrashlyticsLog.log("Creating Apio Subscription")
                Timber.d("NewSubscriptionViewModel: createApioSubscription() - Creating")
                
                val paymentUserCardId = currentApioCard.value?.objectId ?: ""
                Timber.d("NewSubscriptionViewModel: createApioSubscription() - Using selected payment card")
                CrashlyticsLog.log("Using selected payment card")
                
                subscriptionRepository.createApioSubscription(subscriptionId = subscription.objectId, paymentUserCardId = paymentUserCardId)
            }.onSuccess {
                Timber.d("NewSubscriptionViewModel: createApioSubscription() - Success")
                trackSimPaymentResult(
                    result = SimAnalytics.Result.SUCCESS,
                    paymentPath = SimAnalytics.PaymentPath.APIO_SAVED_CARD,
                )
            }.onFailure {
                Timber.e("NewSubscriptionViewModel: createApioSubscription() - Error")
                CrashlyticsLog.recordNonFatalError(it, "Error creating Apio Subscription")
                trackSimPaymentResult(
                    result = SimAnalytics.Result.ERROR,
                    paymentPath = SimAnalytics.PaymentPath.APIO_SAVED_CARD,
                    errorType = it::class.simpleName,
                )
            }
        }
    }

    /**
     * Enables QA mode and reloads subscription plans
     */
    fun enableQaModeAndReload() {
        viewModelScope.launch(ioContext) {
            Timber.d("NewSubscriptionViewModel: enableQaModeAndReload() - Enabling QA mode")
            CrashlyticsLog.log("Enabling QA mode for subscription plans")
            _qaModeEnabled.postValue(true)
            
            // Reload subscription plans with QA flag
            currentSim.value?.let { 
                getSubscriptionPlansForSim(it, isQA = true) 
            }
        }
    }

    /**
     * Disables QA mode and reloads subscription plans
     */
    fun disableQaModeAndReload() {
        viewModelScope.launch(ioContext) {
            Timber.d("NewSubscriptionViewModel: disableQaModeAndReload() - Disabling QA mode")
            CrashlyticsLog.log("Disabling QA mode for subscription plans")
            _qaModeEnabled.postValue(false)
            
            // Reload subscription plans without QA flag
            currentSim.value?.let { 
                getSubscriptionPlansForSim(it, isQA = false) 
            }
        }
    }

    /**
     * Provides the daily QA PIN required to enable QA mode
     * Delegates to repository for calculation
     */
    fun getQaAccessPin(): String {
        Timber.d("NewSubscriptionViewModel: Getting QA access PIN from repository")
        return subscriptionPlanRepository.calculateDailyQaPin()
    }

    /**
     * Check if the current wearer has a pre-inserted SIM that is not in use
     */
    fun checkPreInsertedSimForDialog() {
        if (_hasShownPreInsertedSimDialog) {
            Timber.d("NewSubscriptionViewModel: Pre-inserted SIM dialog already shown, skipping check")
            return
        }

        viewModelScope.launch(ioContext) {
            Timber.d("NewSubscriptionViewModel: Checking for pre-inserted SIM for dialog")
            val wearer = currentWearer.value
            if (wearer == null) {
                Timber.w("NewSubscriptionViewModel: No current wearer set, cannot check for pre-inserted SIM")
                return@launch
            }

            val sim = simRepository.getSimByWatch(wearer)
            if (sim == null) {
                Timber.d("NewSubscriptionViewModel: No pre-inserted SIM found for watch")
                return@launch
            }

            val isInUse = simRepository.isSimInUse(sim)
            if (!isInUse && !simRepository.isSimRetired(sim)) {
                Timber.i("NewSubscriptionViewModel: Found unused pre-inserted SIM for dialog")
                _hasShownPreInsertedSimDialog = true
                _preInsertedSimForDialog.postValue(sim)
            } else {
                Timber.d("NewSubscriptionViewModel: Pre-inserted SIM found but is already in use")
            }
        }
    }

    /**
     * Sets the current SIM from the pre-inserted SIM dialog confirmation.
     * This method sets the SIM synchronously to ensure it's available before navigation,
     * then loads subscription plans asynchronously.
     */
    fun setCurrentSimFromPreInsertedById(simId: String?) {
        if (simId.isNullOrBlank()) {
            Timber.e("NewSubscriptionViewModel: Cannot set pre-inserted SIM, ID is null or blank")
            return
        }

        val sim = _preInsertedSimForDialog.value?.takeIf { it.objectId == simId }

        if (sim != null) {
            Timber.d("NewSubscriptionViewModel: Setting current SIM from dialog")
            
            // Set SIM synchronously so it's available before navigation
            _currentSim.value = sim
            _currentSimCountry.value = sim.mnoProvider.country
            _simStatus.value = SimStatus.SIM_AVAILABLE
            
            CrashlyticsLog.log("Set current SIM from pre-inserted dialog")
            
            // Load subscription plans and user info asynchronously
            viewModelScope.launch(ioContext) {
                getSubscriptionPlansForSim(sim)
                
                currentUser.value?.let { user ->
                    getSubscriptionUserInfo(user, sim.mnoProvider.country)
                }
            }
        } else {
            Timber.e("NewSubscriptionViewModel: Could not find SIM object for provided ID")
            CrashlyticsLog.log("Failed to set pre-inserted SIM: SIM not found")
        }
    }

    /**
     * Resets the pre-inserted SIM dialog state
     */
    fun resetPreInsertedSimDialogState() {
        _hasShownPreInsertedSimDialog = false
        _preInsertedSimForDialog.postValue(null)
    }

    /**
     * Resolves whether the current user is eligible for a SIM discount.
     */
    fun resolveSimDiscount() {
        Timber.d("NewSubscriptionViewModel: resolveSimDiscount() - Starting")

        viewModelScope.launch(ioContext) {
            // instead of currentUser.value which may not have been posted yet.
            val user = userRepository.getCurrentUser() ?: run {
                Timber.d("NewSubscriptionViewModel: resolveSimDiscount() - No current user")
                return@launch
            }

            Timber.d("NewSubscriptionViewModel: resolveSimDiscount() - Resolving for user")

            runCatching {
                simPopupRepository.resolveSimDiscountForUser(user)
            }.onSuccess { result ->
                if (result != null) {
                    val (order, campaign) = result
                    val pct = campaign.discountPercentage
                    Timber.d("NewSubscriptionViewModel: resolveSimDiscount() - Eligible: discount=${pct.toInt()}%")
                    CrashlyticsLog.log("SIM discount eligible: ${pct.toInt()}%")
                    _simDiscountOrder.postValue(order)
                    _simDiscountCampaign.postValue(campaign)
                    rawSimDiscountPercentage = pct
                    simDiscountEligible = true
                    recomputeHasSimDiscount()
                } else {
                    Timber.d("NewSubscriptionViewModel: resolveSimDiscount() - Not eligible")
                    clearSimDiscount()
                }
            }.onFailure { e ->
                Timber.e(e, "NewSubscriptionViewModel: resolveSimDiscount() - Error")
                CrashlyticsLog.recordNonFatalError(e, "Error resolving SIM discount")
                clearSimDiscount()
            }
        }
    }

    private fun clearSimDiscount() {
        rawSimDiscountPercentage = 0f
        simDiscountEligible = false
        recomputeHasSimDiscount()
        _simDiscountOrder.postValue(null)
        _simDiscountCampaign.postValue(null)
    }

    fun discountedPrice(fullPrice: Float): Float {
        val pct = (simDiscountPercentage.value ?: 0f).coerceIn(0f, 100f) / 100f
        return fullPrice * (1f - pct)
    }

    private fun recomputeHasSimDiscount() {
        val applicable = simDiscountEligible && !blockedByPreInsertedSim
        _hasSimDiscount.postValue(applicable)
        // The percentage the UI prices off of is the effective discount: 0 unless applicable.
        _simDiscountPercentage.postValue(if (applicable) rawSimDiscountPercentage else 0f)
    }

    /**
     * The SIM promo does not apply when the SIM being activated is pre-inserted, or when the
     * assigned wearer already has a pre-inserted SIM associated (also enforced on the backend).
     * Fails safe: stays blocked while resolving and when there is no wearer/SIM context.
     */
    fun evaluatePreInsertedRestriction() {
        viewModelScope.launch(ioContext) {
            // Condition 1: the SIM being activated for this subscription is pre-inserted.
            val registeringSim = currentSim.value
            if (registeringSim?.isPreInsertedInWatch == true) {
                Timber.d("NewSubscriptionViewModel: SIM discount blocked - registering SIM is pre-inserted")
                blockedByPreInsertedSim = true
                recomputeHasSimDiscount()
                return@launch
            }

            // Condition 2: the assigned wearer has a pre-inserted SIM associated.
            val wearer = currentWearer.value
            if (wearer == null) {
                Timber.d("NewSubscriptionViewModel: SIM discount blocked - no wearer context")
                blockedByPreInsertedSim = true
                recomputeHasSimDiscount()
                return@launch
            }

            val wearerHasPreInsertedSim = simRepository.getSimByWatch(wearer)
                ?.takeUnless { simRepository.isSimRetired(it) } != null
            Timber.d("NewSubscriptionViewModel: pre-inserted SIM check for wearer hasPreInserted=$wearerHasPreInsertedSim")
            blockedByPreInsertedSim = wearerHasPreInsertedSim
            recomputeHasSimDiscount()
        }
    }

    private fun SimStatus.analyticsResult(): String =
        when (this) {
            SimStatus.SIM_AVAILABLE,
            SimStatus.SIM_ACTIVATED -> AddWatchAnalytics.Result.SUCCESS
            SimStatus.ALAI,
            SimStatus.SIM_RETIRED -> AddWatchAnalytics.Result.UNAVAILABLE
            else -> AddWatchAnalytics.Result.ERROR
        }

    companion object {
        private const val SCREEN_SUB_STARTED = "subscription_start"
        private const val SCREEN_WEARER_SELECTED = "choose_wearer"
        private const val SCREEN_SIM_LOOKUP = "sim_lookup"
        private const val SCREEN_PLAN_SELECTED = "choose_plan"
        private const val SCREEN_USER_INFO = "user_info"
        private const val SCREEN_PAYMENT = "payment"
        private const val SCREEN_SUBSCRIPTION_RESULT = "subscription"
        private const val SCREEN_COMPLETED = "completed"
        private const val SIM_PATH_SOYMOMO = "soymomo_sim"
        private const val SIM_PATH_PREINSERTED = "preinserted_sim"
    }

}
