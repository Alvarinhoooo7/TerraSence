package com.sosmartlabs.momotabletpadres.sim.ui

import android.os.Bundle
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.analytics.FirebaseAnalytics
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.sim.model.*
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.sim.repository.SimRepository
import com.sosmartlabs.momotabletpadres.sim.repository.SubscriptionPlanRepository
import com.sosmartlabs.momotabletpadres.sim.repository.SubscriptionRepository
import com.sosmartlabs.momotabletpadres.sim.repository.SubscriptionUserInfoRepository
import com.sosmartlabs.momotabletpadres.utils.Resource
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
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
    private val tabletRepository: TabletRepository,
    private val firebaseAnalytics: FirebaseAnalytics
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
     * Current selected device
     */
    private var _currentTablet = MutableLiveData<Tablet>()
    val currentTablet: LiveData<Tablet>
        get() = _currentTablet

    /**
     * Current HashMap of User Info
     */
    private var _currentUserInfoParams= MutableLiveData<HashMap<String, Any>>()
    val currentUserInfoParams: LiveData<HashMap<String, Any>>
        get() = _currentUserInfoParams

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
     * Loads the current user
     */
    fun getCurrentUser() {
        viewModelScope.launch(ioContext) {
            userRepository.getCurrentParseUser()?.let {
                _currentUser.postValue(it)
                Timber.d("NewSubscriptionViewModel: getCurrentUser() - User loaded: ${it.objectId}")
                CrashlyticsLog.log("Current user loaded: ${it.objectId}")
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
        Timber.d("NewSubscriptionViewModel: getSubscriptionPlansForSim() - Starting for ${sim.iccId}, isQA: $isQA")
        CrashlyticsLog.log("Getting subscription plans for Sim: ${sim.iccId}, isQA: $isQA")

        viewModelScope.launch(ioContext) {
            runCatching {
                val mnoProvider = sim.mnoProvider
                Timber.d("NewSubscriptionViewModel: getSubscriptionPlansForSim() - Using MNO provider: ${mnoProvider.name}")
                CrashlyticsLog.log("Using MNO provider: ${mnoProvider.name}")

                val paymentProviderName = sim.paymentProvider.name
                Timber.d("NewSubscriptionViewModel: getSubscriptionPlansForSim() - Using payment provider: $paymentProviderName")
                CrashlyticsLog.log("Using payment provider: $paymentProviderName")

                val subscriptionPlans = subscriptionPlanRepository.getSubscriptionPlans(mnoProvider = mnoProvider, paymentProviderName = paymentProviderName, isQA = isQA)
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
                Timber.e("NewSubscriptionViewModel: getSubscriptionPlansForSim() - Error: ${it.message}")
                CrashlyticsLog.recordNonFatalError(it, "Error getting subscription plans for Sim: ${sim.iccId}")
            }
        }
    }

    /**
     * Loads the SubscriptionUserInfo
     */
    fun getSubscriptionUserInfo(user: ParseUser, country: String) {
        Timber.d("NewSubscriptionViewModel: getSubscriptionUserInfo() - Starting for user ${user.objectId} and country $country")
        CrashlyticsLog.log("Getting subscription user info for user ${user.objectId} and country $country")
        
        viewModelScope.launch(ioContext) {
            val userInfo = subscriptionUserInfoRepository.getSubscriptionUserInfo(user, country)
            userInfo?.let {
                Timber.d("NewSubscriptionViewModel: getSubscriptionUserInfo() - Loaded userInfo: ${it.objectId}")
                CrashlyticsLog.log("Successfully loaded subscription user info: ${it.objectId}")
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
    fun getSim(iccId: String) {
        Timber.d("NewSubscriptionViewModel: getSim() - Starting for iccId: $iccId")
        CrashlyticsLog.log("Getting SIM for iccId: $iccId")
        
        firebaseAnalytics.logEvent(
            "getSim",
            Bundle().apply { putString("iccId", iccId) }
        )

        viewModelScope.launch(ioContext) {
            _simStatus.postValue(SimStatus.SEARCHING)
            Timber.d("NewSubscriptionViewModel: getSim() - Set status to SEARCHING")
            
            when (iccId.length) {
                19, 20 -> {
                    // Prepare the iccId by removing any non-digit characters like 'F' at the end for T-Mobile SIMs
                    val cleanedIccId = if (iccId.endsWith("F")) iccId.dropLast(1) else iccId
                    Timber.d("NewSubscriptionViewModel: getSim() - Cleaned iccId: $cleanedIccId")
                    CrashlyticsLog.log("Cleaned iccId: $cleanedIccId")
                    
                    val sim = simRepository.getSim(cleanedIccId)
                    if (sim != null) {
                        Timber.d("NewSubscriptionViewModel: getSim() - SIM found: ${sim.objectId}")
                        CrashlyticsLog.log("SIM found: ${sim.objectId}")
                        
                        val isSimInUse = simRepository.isSimInUse(sim)
                        if (isSimInUse) {
                            Timber.d("NewSubscriptionViewModel: getSim() - SIM already in use")
                            CrashlyticsLog.log("SIM already in use: ${sim.objectId}")
                            _simStatus.postValue(SimStatus.SIM_ALREADY_IN_USE)
                        } else {
                            Timber.d("NewSubscriptionViewModel: getSim() - SIM available, checking for Alai")
                            val mnoProviderName = sim.mnoProvider.name
                            if (mnoProviderName.equals("Alai", ignoreCase = true)) {
                                Timber.d("NewSubscriptionViewModel: getSim() - SIM available, but is Alai")
                                CrashlyticsLog.log("SIM is Alai provider: ${sim.objectId}")
                                _simStatus.postValue(SimStatus.ALAI)
                            } else {
                                Timber.d("NewSubscriptionViewModel: getSim() - SIM available, all ok, setting current SIM")
                                CrashlyticsLog.log("SIM available and valid: ${sim.objectId}")
                                _simStatus.postValue(SimStatus.SIM_AVAILABLE)
                                setCurrentSim(sim)
                            }
                        }
                    } else {
                        Timber.d("NewSubscriptionViewModel: getSim() - SIM not found")
                        CrashlyticsLog.log("SIM not found for iccId: $cleanedIccId")
                        _simStatus.postValue(SimStatus.SIM_NOT_FOUND)
                    }
                }
                else -> {
                    Timber.d("NewSubscriptionViewModel: getSim() - Invalid ICC ID length: ${iccId.length}")
                    CrashlyticsLog.log("Invalid ICC ID length: ${iccId.length}")
                    _simStatus.postValue(SimStatus.ICC_ID_LENGTH)
                }
            }
        }
    }

    /**
     * Sets the selected Tablet
     */
    fun setCurrentTablet(tablet: Tablet) {
        viewModelScope.launch(ioContext) {
            _currentTablet.postValue(tablet)
            getPreInsertedSimForCurrentTablet(tablet)
            Timber.d("NewSubscriptionViewModel: setCurrentTablet() - Set tablet: ${tablet.objectId}")
            CrashlyticsLog.log("Set current tablet: ${tablet.objectId}")
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
                        _currentSubscriptionPlan.postValue(subscriptionPlanMnoProviderListByMonth.value!![index])
                        Timber.d("NewSubscriptionViewModel: setCurrentSubscriptionPlan() - Set monthly plan at index $index")
                        CrashlyticsLog.log("Set monthly subscription plan at index $index")
                    }
                    BillingPeriod.YEARLY -> {
                        _currentSubscriptionPlan.postValue(subscriptionPlanMnoProviderListByYear.value!![index])
                        Timber.d("NewSubscriptionViewModel: setCurrentSubscriptionPlan() - Set yearly plan at index $index")
                        CrashlyticsLog.log("Set yearly subscription plan at index $index")
                    }
                }
            }.onSuccess {
                Timber.d("NewSubscriptionViewModel: setCurrentSubscriptionPlan() - Successfully set subscription plan")
            }.onFailure {
                Timber.e("NewSubscriptionViewModel: setCurrentSubscriptionPlan() - Error: ${it.message}")
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
            Timber.d("NewSubscriptionViewModel: setCurrentSim() - Set SIM ${sim.objectId}, status: SIM_AVAILABLE, country: ${sim.mnoProvider.country}")
            CrashlyticsLog.log("Set current SIM: ${sim.objectId}, country: ${sim.mnoProvider.country}")
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
     * Check for a SIM related to the selected Tablet
     */
    private fun getPreInsertedSimForCurrentTablet(tablet: Tablet) {
        viewModelScope.launch(ioContext) {
            Timber.d("NewSubscriptionViewModel: getPreInsertedSimForCurrentTablet() - Searching SIM for tablet ${tablet.objectId}")
            CrashlyticsLog.log("Searching pre-inserted SIM for tablet: ${tablet.objectId}")
            val imei = tablet.imei ?: ""
            val sim = simRepository.getSimByImei(imei)
            if (sim != null) {
                Timber.d("NewSubscriptionViewModel: getPreInsertedSimForCurrentTablet() - SIM found: ${sim.objectId}")
                CrashlyticsLog.log("Pre-inserted SIM found: ${sim.objectId}")
                val isSimInUse = simRepository.isSimInUse(sim)
                if (isSimInUse) {
                    Timber.d("NewSubscriptionViewModel: getPreInsertedSimForCurrentTablet() - SIM already in use")
                    CrashlyticsLog.log("SIM available and valid: ${sim.objectId}")
                    _simStatus.postValue(SimStatus.SIM_ALREADY_IN_USE)
                } else {
                    Timber.d("NewSubscriptionViewModel: getPreInsertedSimForCurrentTablet() - SIM available, setting current SIM")
                    CrashlyticsLog.log("SIM available and valid: ${sim.objectId}")
                    _simStatus.postValue(SimStatus.SIM_AVAILABLE)
                    setCurrentSim(sim)
                }
            } else {
                Timber.d("NewSubscriptionViewModel: getPreInsertedSimForCurrentTablet() - No SIM found for tablet")
                CrashlyticsLog.log("No pre-inserted SIM found for tablet: ${tablet.objectId}")
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
                Timber.d("NewSubscriptionViewModel: setCurrentSubscriptionUserInfo() - Set user info: ${subscriberUserInfo.objectId}, status: SUCCESS")
                CrashlyticsLog.log("Set subscription user info: ${subscriberUserInfo.objectId}")
            }.onFailure {
                Timber.e("NewSubscriptionViewModel: setCurrentSubscriptionUserInfo() - Error: ${it.message}")
                CrashlyticsLog.recordNonFatalError(it, "Error setting subscription user info: ${subscriberUserInfo.objectId}")
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
            Timber.d("NewSubscriptionViewModel: setCurrentApioCard() - Set card: ${apioCard.objectId}")
            CrashlyticsLog.log("Set Apio card: ${apioCard.objectId}")
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
            val subscriptionUserInfo = subscriptionUserInfoRepository.createSubscriptionUserInfo(params, country)
            Timber.d("NewSubscriptionViewModel: createSubscriptionUserInfo() - Created user info: ${subscriptionUserInfo.objectId}")
            CrashlyticsLog.log("Created subscription user info: ${subscriptionUserInfo.objectId}")
            setCurrentSubscriptionUserInfo(subscriptionUserInfo)
        }
    }

    /**
     * Sets the new created Subscription after flow
     */
    private fun setNewCreatedSubscription(subscription: Subscription) {
        viewModelScope.launch(ioContext) {
            _newCreatedSubscription.postValue(subscription)
            Timber.d("NewSubscriptionViewModel: setNewCreatedSubscription() - Set subscription: ${subscription.objectId}")
            CrashlyticsLog.log("Set new created subscription: ${subscription.objectId}")
            
            when (subscription.getSubscriptionStatus()) {
                SubscriptionStatus.ACTIVE -> {
                    Timber.d("NewSubscriptionViewModel: setNewCreatedSubscription() - Status: ACTIVE")
                    CrashlyticsLog.log("Subscription status: ACTIVE")
                    _newCreatedSubscriptionActivationStatus.postValue(SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS)
                }
                SubscriptionStatus.PREACTIVATED -> {
                    Timber.d("NewSubscriptionViewModel: setNewCreatedSubscription() - Status: PREACTIVATED")
                    CrashlyticsLog.log("Subscription status: PREACTIVATED")
                    _newCreatedSubscriptionActivationStatus.postValue(SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS_NO_PHONE)
                }
                else -> {
                    Timber.d("NewSubscriptionViewModel: setNewCreatedSubscription() - Status: ERROR")
                    CrashlyticsLog.log("Subscription status: ERROR")
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
            Timber.d("NewSubscriptionViewModel: activateSimCard() - Starting activation for SIM: ${currentSim.value!!.iccId}")
            CrashlyticsLog.log("Starting SIM activation for: ${currentSim.value!!.iccId}")
            
            firebaseAnalytics.logEvent(
                "activate_sim_card",
                Bundle().apply {
                    putString("icc_id", currentSim.value!!.iccId)
                    putString("subscription_user_info", currentSubscriptionUserInfo.value!!.objectId)
                }
            )
            
            viewModelScope.launch(ioContext) {
                _newCreatedSubscriptionActivationStatus.postValue(SubscriptionActivationStatus.SUBSCRIPTION_SAVING)
                val currentTablet = currentTablet.value!!
                val currentSim = currentSim.value!!
                val currentSubscriptionPlan = currentSubscriptionPlan.value!!
                val currentSubscriptionsUserInfo = currentSubscriptionUserInfo.value!!
                
                Timber.d("NewSubscriptionViewModel: activateSimCard() - Activating subscription for tablet: ${currentTablet.objectId}, SIM: ${currentSim.iccId}, plan: ${currentSubscriptionPlan.objectId}, user info: ${currentSubscriptionsUserInfo.objectId}")
                CrashlyticsLog.log("Activating subscription - Tablet: ${currentTablet.objectId}, SIM: ${currentSim.iccId}, Plan: ${currentSubscriptionPlan.objectId}")

                val imei = currentTablet.imei ?: ""
                val deviceName = currentTablet.model?.name ?: "Unknown Device"
                val subscription = subscriptionRepository.activateSubscription(
                    imei = imei,
                    deviceName = deviceName,
                    iccId = currentSim.iccId,
                    planId = currentSubscriptionPlan.objectId,
                    subscriberId = currentSubscriptionsUserInfo.objectId,
                )
                
                Timber.d("NewSubscriptionViewModel: activateSimCard() - Activation complete, setting new subscription")
                CrashlyticsLog.log("SIM activation complete: ${subscription.objectId}")
                setNewCreatedSubscription(subscription)
            }
        } else {
            Timber.e("NewSubscriptionViewModel: activateSimCard() - Sim is null")
            CrashlyticsLog.log("Cannot activate SIM - current SIM is null")
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
                CrashlyticsLog.log("Creating Apio auth bypass for subscriptionUserInfo ${subscriptionUserInfo.objectId}")
                Timber.d("NewSubscriptionViewModel: createApioAuthBypass() - Creating for user info: ${subscriptionUserInfo.objectId}")
                
                val apioAuthBypassUrl = subscriptionRepository.createApioAuthBypass(subscriptionUserInfo.objectId)
                Timber.d("NewSubscriptionViewModel: createApioAuthBypass() - Raw response: $apioAuthBypassUrl")
                
                val data = apioAuthBypassUrl!!["data"] as HashMap<*, *>
                val url = data["data"] as String
                url
            }.onSuccess {
                _apioAuthBypassUrl.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = it))
                Timber.d("NewSubscriptionViewModel: createApioAuthBypass() - Success, URL: $it")
                CrashlyticsLog.log("Successfully created Apio auth bypass URL")
                
                firebaseAnalytics.logEvent(
                    "opening_apio_auth_bypass_subscription",
                    Bundle().apply { putString("subscriber_id", subscriptionUserInfo.objectId) }
                )
            }.onFailure {
                _apioAuthBypassUrl.postValue(Resource(Resource.Status.LOAD_ERROR))
                Timber.e("NewSubscriptionViewModel: createApioAuthBypass() - Error: ${it.message}")
                CrashlyticsLog.recordNonFatalError(it, "Error creating Apio auth bypass for subscriptionUserInfo ${subscriptionUserInfo.objectId}")
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
                val user = currentUser.value!!
                CrashlyticsLog.log("Getting Apio cards for user ${user.objectId}")
                Timber.d("NewSubscriptionViewModel: getApioUserCards() - Fetching for user: ${user.objectId}")

                val apioCards = subscriptionRepository.getApioUserCards(user, subscriptionUserInfo)
                Timber.d("NewSubscriptionViewModel: getApioUserCards() - Fetched cards: $apioCards")
                apioCards
            }.onSuccess { cards ->
                Timber.d("NewSubscriptionViewModel: getApioUserCards() - Success, ${cards.size} cards fetched")
                CrashlyticsLog.log("Successfully fetched ${cards.size} Apio cards")
                _apioUserCards.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = cards))
            }.onFailure {
                _apioUserCards.postValue(Resource(status = Resource.Status.LOAD_ERROR))
                Timber.e("NewSubscriptionViewModel: getApioUserCards() - Error: ${it.message}")
                CrashlyticsLog.recordNonFatalError(it, "Error getting Apio user cards")
            }
        }
    }

    /**
     * Creates an Apio Subscription
     */
    fun createApioSubscription(subscription: Subscription) {
        viewModelScope.launch(ioContext) {
            runCatching {
                CrashlyticsLog.log("Creating Apio Subscription for ${subscription.objectId}")
                Timber.d("NewSubscriptionViewModel: createApioSubscription() - Creating for subscription: ${subscription.objectId}")
                
                val paymentUserCardId = currentApioCard.value?.objectId ?: ""
                Timber.d("NewSubscriptionViewModel: createApioSubscription() - Using payment card: $paymentUserCardId")
                CrashlyticsLog.log("Using payment card: $paymentUserCardId")
                
                subscriptionRepository.createApioSubscription(subscriptionId = subscription.objectId, paymentUserCardId = paymentUserCardId)
            }.onSuccess {
                Timber.d("NewSubscriptionViewModel: createApioSubscription() - Success")
                firebaseAnalytics.logEvent(
                    "creating_apio_subscription",
                    Bundle().apply { putString("subscription_id", subscription.objectId) }
                )
            }.onFailure {
                Timber.e("NewSubscriptionViewModel: createApioSubscription() - Error: ${it.message}")
                CrashlyticsLog.recordNonFatalError(it, "Error creating Apio Subscription")
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
     * Get tablet by IMEI
     */
    fun setCurrentTabletByImei(imei: String) {
        Timber.d("NewSubscriptionViewModel: getTabletByImei() - Searching tablet by IMEI: $imei")
        CrashlyticsLog.log("Searching tablet by IMEI: $imei")
        viewModelScope.launch(ioContext) {
            val tablet = tabletRepository.getTabletByImei(imei)
            Timber.d("NewSubscriptionViewModel: getTabletByImei() - Tablet found: ${tablet.objectId}")
            CrashlyticsLog.log("Tablet found: ${tablet.objectId}")
            _currentTablet.postValue(tablet)
            getPreInsertedSimForCurrentTablet(tablet)
        }
    }

}