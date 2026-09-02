package com.sosmartlabs.momo.addfirstwatch.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.location.Location
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.location.LocationServices
import com.parse.ParseCloud
import com.parse.ParseException
import com.parse.coroutines.suspendFetch
import com.sosmartlabs.momo.addfirstwatch.analytics.AddWatchAnalytics
import com.sosmartlabs.momo.addfirstwatch.model.FirstContactStatus
import com.sosmartlabs.momo.addfirstwatch.model.KidProfileStatus
import com.sosmartlabs.momo.addfirstwatch.model.WatchAdminInfo
import com.sosmartlabs.momo.addfirstwatch.model.WatchAvailabilityResult
import com.sosmartlabs.momo.addfirstwatch.model.WatchAvailabilityStatus
import com.sosmartlabs.momo.addfirstwatch.repository.WearerRepository
import com.sosmartlabs.momo.addfirstwatch.model.WearerStatus
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.addfirstwatch.repository.MobileNetworkOperatorRepository
import com.sosmartlabs.momo.models.Space2
import com.sosmartlabs.momo.models.Space3
import com.sosmartlabs.momo.models.WatchModel
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.CountryProvider
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Space4
import com.sosmartlabs.momo.watchcontacts.model.WatchContactsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.UUID
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class AddFirstMomoViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val wearerRepository: WearerRepository,
    private val contactRepository: WatchContactsRepository,
    private val mobileNetworkOperatorRepository: MobileNetworkOperatorRepository,
    private val addWatchAnalytics: AddWatchAnalytics,
): ViewModel() {

    val addWatchFlowId: String = UUID.randomUUID().toString()

    @Volatile
    private var hasTrackedStarted = false
    @Volatile
    private var hasTrackedFirstInteractionDetected = false
    @Volatile
    private var hasTrackedCompleted = false
    private var currentSimPath: String? = null

    private var _currentCountry = MutableLiveData<String>()
    val currentCountry: LiveData<String>
        get() = _currentCountry

    private var _wearerStatus = MutableLiveData<WearerStatus>()
    val wearerStatus: LiveData<WearerStatus>
        get() = _wearerStatus

    private var _watchAvailabilityStatus = MutableLiveData<WatchAvailabilityStatus>()
    val watchAvailabilityStatus: LiveData<WatchAvailabilityStatus>
        get() = _watchAvailabilityStatus

    private var _watchAdminInfo = MutableLiveData<WatchAdminInfo?>()
    val watchAdminInfo: LiveData<WatchAdminInfo?>
        get() = _watchAdminInfo

    private var _kidProfileStatus = MutableLiveData<KidProfileStatus>()
    val kidProfileStatus: LiveData<KidProfileStatus>
        get() = _kidProfileStatus

    private var _firstContactStatus = MutableLiveData<FirstContactStatus>()
    val firstContactStatus: LiveData<FirstContactStatus>
        get() = _firstContactStatus

    private var _currentWearer = MutableLiveData<Wearer>()
    val currentWearer: LiveData<Wearer>
        get() = _currentWearer

    private var _currentProgressStep = MutableLiveData<Int>(0)
    val currentProgressStep: LiveData<Int>
        get() = _currentProgressStep

    private var _userLastLocation = MutableLiveData<Location>()
    val userLastLocation: LiveData<Location>
        get() = _userLastLocation

    private var _mobileNetworkOperatorList = MutableLiveData<List<MobileNetworkOperator>>()
    val mobileNetworkOperatorList: LiveData<List<MobileNetworkOperator>>
        get() = _mobileNetworkOperatorList

    private var _selectedMobileNetworkOperator = MutableLiveData<MobileNetworkOperator?>()
    val selectedMobileNetworkOperator: LiveData<MobileNetworkOperator?>
        get() = _selectedMobileNetworkOperator

    fun trackAddWatchStarted() {
        if (hasTrackedStarted) return
        hasTrackedStarted = true
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.STARTED,
            analyticsContext(screen = SCREEN_ENTER_IMEI)
        )
    }

    fun analyticsContext(screen: String? = null): AddWatchAnalytics.AddWatchContext =
        AddWatchAnalytics.AddWatchContext(
            flowId = addWatchFlowId,
            screen = screen,
            country = _currentCountry.value,
            watchModel = currentWearer.value?.model?.analyticsName(),
            simPath = currentSimPath,
        )

    fun trackImeiSubmitted(inputMethod: String, inputLength: Int) {
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.IMEI_SUBMITTED,
            analyticsContext(screen = SCREEN_ENTER_IMEI),
            mapOf(
                AddWatchAnalytics.Params.INPUT_METHOD to inputMethod,
                AddWatchAnalytics.Params.INPUT_LENGTH to inputLength,
            )
        )
    }

    private fun trackImeiResult(status: WatchAvailabilityStatus) {
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.IMEI_RESULT,
            analyticsContext(screen = SCREEN_ENTER_IMEI),
            mapOf(
                AddWatchAnalytics.Params.RESULT to status.analyticsResult(),
                AddWatchAnalytics.Params.STATUS to status.name,
                AddWatchAnalytics.Params.HAS_PREINSERTED_SIM to (status == WatchAvailabilityStatus.SUCCESS_WITH_SIM_PRE_INSERTED),
            )
        )
    }

    private fun trackLinkResult(status: WearerStatus) {
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.LINK_RESULT,
            analyticsContext(screen = SCREEN_ENTER_IMEI),
            mapOf(
                AddWatchAnalytics.Params.RESULT to status.analyticsResult(),
                AddWatchAnalytics.Params.STATUS to status.name,
            )
        )
    }

    private fun trackFirstContactResult(
        status: FirstContactStatus,
        result: String,
        hasPhoto: Boolean,
    ) {
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.FIRST_CONTACT_RESULT,
            analyticsContext(screen = SCREEN_FIRST_CONTACT),
            mapOf(
                AddWatchAnalytics.Params.RESULT to result,
                AddWatchAnalytics.Params.STATUS to status.name,
                AddWatchAnalytics.Params.HAS_PHOTO to hasPhoto,
            )
        )
    }

    private fun trackKidProfileResult(
        result: String,
        hasPhoto: Boolean,
        hasPhone: Boolean,
        hasBirthday: Boolean,
        errorType: String? = null,
    ) {
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.KID_PROFILE_RESULT,
            analyticsContext(screen = SCREEN_KID_PROFILE),
            mapOf(
                AddWatchAnalytics.Params.RESULT to result,
                AddWatchAnalytics.Params.HAS_PHOTO to hasPhoto,
                AddWatchAnalytics.Params.HAS_PHONE to hasPhone,
                AddWatchAnalytics.Params.HAS_BIRTHDAY to hasBirthday,
                AddWatchAnalytics.Params.ERROR_TYPE to errorType,
            )
        )
    }

    fun trackBluetoothSyncStarted() {
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.BLUETOOTH_SYNC_STARTED,
            analyticsContext(screen = SCREEN_ENABLE_BLUETOOTH)
        )
    }

    fun trackBluetoothSyncResult(result: String, errorType: String? = null) {
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.BLUETOOTH_SYNC_RESULT,
            analyticsContext(screen = SCREEN_ENABLE_BLUETOOTH),
            mapOf(
                AddWatchAnalytics.Params.RESULT to result,
                AddWatchAnalytics.Params.ERROR_TYPE to errorType,
            )
        )
    }

    fun trackSimChoiceSelected(
        choice: String,
        result: String = AddWatchAnalytics.Result.SUCCESS,
        hasExtraActivationSteps: Boolean? = null,
    ) {
        currentSimPath = choice
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.SIM_CHOICE_SELECTED,
            analyticsContext(screen = SCREEN_SIM_CHOICE),
            mapOf(
                AddWatchAnalytics.Params.CHOICE to choice,
                AddWatchAnalytics.Params.RESULT to result,
                AddWatchAnalytics.Params.HAS_EXTRA_ACTIVATION_STEPS to hasExtraActivationSteps,
            )
        )
    }

    fun trackFirstInteractionDetected() {
        if (hasTrackedFirstInteractionDetected) return
        hasTrackedFirstInteractionDetected = true
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.FIRST_INTERACTION_DETECTED,
            analyticsContext(screen = SCREEN_INSERT_SIM)
        )
    }

    fun trackContactPromptShown(phoneSource: String, hasPhoto: Boolean) {
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.CONTACT_PROMPT_SHOWN,
            analyticsContext(screen = SCREEN_KID_PROFILE),
            mapOf(
                AddWatchAnalytics.Params.PHONE_SOURCE to phoneSource,
                AddWatchAnalytics.Params.HAS_PHOTO to hasPhoto,
            )
        )
    }

    fun trackContactPromptResult(
        result: String,
        phoneSource: String? = null,
        hasPhoto: Boolean? = null,
        notShownReason: String? = null,
        errorType: String? = null,
    ) {
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.CONTACT_PROMPT_RESULT,
            analyticsContext(screen = SCREEN_KID_PROFILE),
            mapOf(
                AddWatchAnalytics.Params.RESULT to result,
                AddWatchAnalytics.Params.PHONE_SOURCE to phoneSource,
                AddWatchAnalytics.Params.HAS_PHOTO to hasPhoto,
                AddWatchAnalytics.Params.NOT_SHOWN_REASON to notShownReason,
                AddWatchAnalytics.Params.ERROR_TYPE to errorType,
            )
        )
    }

    fun trackAddWatchCompleted() {
        if (hasTrackedCompleted) return
        hasTrackedCompleted = true
        addWatchAnalytics.track(
            AddWatchAnalytics.Events.COMPLETED,
            analyticsContext(screen = SCREEN_FINISH)
        )
    }

    fun getWearerModel(): WatchModel {
        Timber.d("AddFirstMomoViewModel: Getting wearer model")
        CrashlyticsLog.log("Getting wearer model")
        
        _currentWearer.value?.let { wearer ->
            Timber.i("AddFirstMomoViewModel: Found wearer with model: ${wearer.model}")
            CrashlyticsLog.log("Found wearer model: ${wearer.model}")
            return wearer.model
        }
        
        Timber.w("AddFirstMomoViewModel: No wearer found, returning default model Space2")
        CrashlyticsLog.log("No wearer found, returning default model Space2")
        return Space2
    }
    
    fun hasPreInsertedSim(): Boolean {
        val result = _watchAvailabilityStatus.value == WatchAvailabilityStatus.SUCCESS_WITH_SIM_PRE_INSERTED
        Timber.d("AddFirstMomoViewModel: Checking if watch has pre-inserted SIM: $result")
        CrashlyticsLog.log("Watch has pre-inserted SIM: $result")
        return result
    }

    // Progress and country management
    fun setProgressStep(step: Int) {
        Timber.d("AddFirstMomoViewModel: Setting progress step to: $step")
        CrashlyticsLog.log("Setting progress step: $step")
        viewModelScope.launch(ioContext) {
            _currentProgressStep.postValue(step)
        }
    }

    fun setCurrentCountry(context: Context) {
        Timber.d("AddFirstMomoViewModel: Setting current country")
        CrashlyticsLog.log("Attempting to set current country")
        viewModelScope.launch(ioContext) {
            runCatching {
                CountryProvider.getCountry(context)
            }.onSuccess { country ->
                Timber.i("AddFirstMomoViewModel: Successfully set country to: $country")
                CrashlyticsLog.log("Successfully set country: $country")
                _currentCountry.postValue(country)
            }.onFailure { error ->
                Timber.e(error, "AddFirstMomoViewModel: Failed to get country, defaulting to Chile")
                CrashlyticsLog.recordNonFatalError(error, "Failed to get country, defaulting to Chile")
                _currentCountry.postValue(CountryProvider.CHILE)
            }
        }
    }

    // Mobile Network Operator management
    fun setSelectedMobileNetworkOperator(mobileNetworkOperator: MobileNetworkOperator) {
        Timber.d("AddFirstMomoViewModel: Setting selected mobile network operator: ${mobileNetworkOperator.objectId}")
        CrashlyticsLog.log("Setting mobile network operator: ${mobileNetworkOperator.objectId}")
        viewModelScope.launch(ioContext) {
            _selectedMobileNetworkOperator.postValue(mobileNetworkOperator)
        }
    }

    fun removeSelectedMobileNetworkOperator() {
        Timber.d("AddFirstMomoViewModel: Removing selected mobile network operator")
        CrashlyticsLog.log("Removing selected mobile network operator")
        viewModelScope.launch(ioContext) {
            _selectedMobileNetworkOperator.postValue(null)
        }
    }

    fun getMobileNetworkOperatorByCountry(country: String) {
        Timber.d("AddFirstMomoViewModel: Fetching mobile operators for country: $country")
        CrashlyticsLog.log("Fetching mobile operators for country: $country")
        viewModelScope.launch(ioContext) {
            runCatching {
                mobileNetworkOperatorRepository.getMobileNetworkOperatorByCountry(country)
            }.onSuccess { operators ->
                Timber.i("AddFirstMomoViewModel: Successfully retrieved ${operators.size} operators for country: $country")
                CrashlyticsLog.log("Retrieved ${operators.size} operators for country: $country")
                _mobileNetworkOperatorList.postValue(operators.shuffled())
            }.onFailure { error ->
                Timber.e(error, "AddFirstMomoViewModel: Failed to get mobile operators for country: $country")
                CrashlyticsLog.recordNonFatalError(error, "Failed to get mobile operators for country: $country")
            }
        }
    }

    fun setWatchMobileNetworkOperator(mobileNetworkOperator: MobileNetworkOperator?, isOther: Boolean, isSoyMomo: Boolean) {
        Timber.d("AddFirstMomoViewModel: Setting watch mobile network operator - isOther: $isOther, isSoyMomo: $isSoyMomo")
        CrashlyticsLog.log("Setting watch mobile network operator - isOther: $isOther, isSoyMomo: $isSoyMomo")
        viewModelScope.launch(ioContext) {
            runCatching {
                _currentWearer.value?.let { wearer ->
                    wearerRepository.setWatchMobileNetworkOperator(wearer.deviceId, mobileNetworkOperator, isOther, isSoyMomo)
                }
            }.onFailure { error ->
                Timber.e(error, "AddFirstMomoViewModel: Failed to set watch mobile network operator")
                CrashlyticsLog.recordNonFatalError(error, "Failed to set watch mobile network operator")
            }
        }
    }

    fun getUserLastLocation(context: Context) {
        Timber.d("AddFirstMomoViewModel: Getting user's last location")
        CrashlyticsLog.log("Attempting to get user's last location")
        viewModelScope.launch(ioContext) {
            try {
                val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
                fusedLocationClient.lastLocation
                    .addOnSuccessListener { location: Location? ->
                        location?.let {
                            Timber.i("AddFirstMomoViewModel: Successfully retrieved user location")
                            CrashlyticsLog.log("Successfully retrieved user location")
                            _userLastLocation.postValue(it)
                        } ?: run {
                            Timber.w("AddFirstMomoViewModel: User location is null")
                            CrashlyticsLog.log("User location is null")
                        }
                    }
                    .addOnFailureListener { e ->
                        Timber.e(e, "AddFirstMomoViewModel: Failed to get user location")
                        CrashlyticsLog.recordNonFatalError(e, "Failed to get user location")
                    }
            } catch (e: SecurityException) {
                Timber.e(e, "AddFirstMomoViewModel: Location permission denied when requesting lastLocation")
                CrashlyticsLog.recordNonFatalError(e, "Location permission denied when requesting lastLocation")
            } catch (e: Exception) {
                Timber.e(e, "AddFirstMomoViewModel: Unexpected error setting up location request")
                CrashlyticsLog.recordNonFatalError(e, "Unexpected error setting up location request")
            }
        }
    }

    fun setInitialWatchLocation(location: Location) {
        Timber.d("AddFirstMomoViewModel: Setting initial watch location")
        CrashlyticsLog.log("Setting initial watch location")
        viewModelScope.launch(ioContext) {
            runCatching {
                _currentWearer.value?.let { wearer ->
                    wearerRepository.setInitialWatchLocation(wearer.deviceId, location)
                }
            }.onFailure { error ->
                Timber.e(error, "AddFirstMomoViewModel: Failed to set initial watch location")
                CrashlyticsLog.recordNonFatalError(error, "Failed to set initial watch location")
            }
        }
    }

    private fun addSoyMomo(deviceId: String) {
        Timber.d("AddFirstMomoViewModel: Adding SoyMomo device")
        addWatchAnalytics.breadcrumb("adding_soymomo_device", analyticsContext(screen = SCREEN_ENTER_IMEI))

        viewModelScope.launch(ioContext) {
            runCatching {
                _wearerStatus.postValue(WearerStatus.SEARCH_IN_PROGRESS)

                var filtered = deviceId.filter { it.isDigit() }
                if(filtered.length == 10 || filtered.length == 15) {
                    if (filtered.length == 15) filtered = filtered.substring(4, 14)
                } else {
                    Timber.w("AddFirstMomoViewModel: Invalid IMEI length: ${filtered.length}")
                    CrashlyticsLog.log("Invalid IMEI length: ${filtered.length}")
                    trackLinkResult(WearerStatus.IMEI_INVALID)
                    _wearerStatus.postValue(WearerStatus.IMEI_INVALID)
                    return@launch
                }

                when (wearerRepository.addWatch(filtered)) {
                    -2 -> {
                        Timber.d("AddFirstMomoViewModel: IMEI unknown")
                        CrashlyticsLog.log("IMEI unknown")
                        trackLinkResult(WearerStatus.IMEI_UNKNOWN)
                        _wearerStatus.postValue(WearerStatus.IMEI_UNKNOWN)
                    }
                    -1 -> {
                        Timber.d("AddFirstMomoViewModel: Wearer already linked")
                        CrashlyticsLog.log("Wearer already linked")
                        trackLinkResult(WearerStatus.WEARER_ALREADY_LINKED)
                        _wearerStatus.postValue(WearerStatus.WEARER_ALREADY_LINKED)
                    }
                    0 -> {
                        Timber.d("AddFirstMomoViewModel: Wearer belongs to other user")
                        CrashlyticsLog.log("Wearer belongs to other user")
                        trackLinkResult(WearerStatus.WEARER_BELONGS_TO_OTHER_USER)
                        _wearerStatus.postValue(WearerStatus.WEARER_BELONGS_TO_OTHER_USER)
                    }
                    1 -> {
                        Timber.i("AddFirstMomoViewModel: Successfully added wearer, attempting to fetch details.")
                        val wearer = wearerRepository.getWearer(filtered)
                        wearer?.let {
                            _currentWearer.postValue(it)
                            CrashlyticsLog.log("Successfully fetched wearer details after adding")
                            trackLinkResult(WearerStatus.LINK_SUCCESS)
                            _wearerStatus.postValue(WearerStatus.LINK_SUCCESS)
                        } ?: run {
                            Timber.e("AddFirstMomoViewModel: Failed to fetch wearer details after adding")
                            CrashlyticsLog.log("AddFirstMomoViewModel: Failed to fetch wearer details after addWatch success")
                            trackLinkResult(WearerStatus.SEARCH_ERROR)
                            _wearerStatus.postValue(WearerStatus.SEARCH_ERROR)
                        }
                    }
                }
            }.onFailure { error ->
                Timber.e(error, "AddFirstMomoViewModel: Failed to add SoyMomo device")
                CrashlyticsLog.recordNonFatalError(error, "Failed to add SoyMomo device")
                trackLinkResult(WearerStatus.SEARCH_ERROR)
                _wearerStatus.postValue(WearerStatus.SEARCH_ERROR)
            }
        }
    }

    fun validateWatchAvailability(deviceId: String, inputMethod: String = INPUT_METHOD_MANUAL) {
        val inputLength = deviceId.filter { it.isDigit() }.length
        Timber.d("AddFirstMomoViewModel: Validating watch availability")
        trackImeiSubmitted(inputMethod, inputLength)
        viewModelScope.launch(ioContext) {
            runCatching {
                _watchAvailabilityStatus.postValue(WatchAvailabilityStatus.SEARCH_IN_PROGRESS)
                _watchAdminInfo.postValue(null) // Clear stale admin info

                var validatedDeviceId = deviceId.filter { it.isDigit() }
                if (validatedDeviceId.length == 15) {
                    validatedDeviceId = validatedDeviceId.substring(4, 14)
                } else if (validatedDeviceId.length != 10) {
                    Timber.w("AddFirstMomoViewModel: Invalid device ID length: ${validatedDeviceId.length}")
                    CrashlyticsLog.log("Invalid device ID length: ${validatedDeviceId.length}")
                }

                val result = wearerRepository.validateWatchAvailability(validatedDeviceId)
                Timber.d("AddFirstMomoViewModel: Watch availability status: ${result.status}")
                CrashlyticsLog.log("Watch availability status: ${result.status}")
                trackImeiResult(result.status)

                when (result.status) {
                    WatchAvailabilityStatus.SUCCESS,
                    WatchAvailabilityStatus.SUCCESS_WITH_SIM_PRE_INSERTED -> {
                        Timber.i("AddFirstMomoViewModel: Watch validation successful")
                        addSoyMomo(validatedDeviceId)
                    }
                    WatchAvailabilityStatus.SUCCESS_WATCH_BELONGS_TO_OTHER_USER -> {
                        Timber.d("AddFirstMomoViewModel: Watch belongs to another user")
                        CrashlyticsLog.log("Watch belongs to another user")
                        addSoyMomo(validatedDeviceId)
                    }
                    WatchAvailabilityStatus.WATCH_ALREADY_LINKED,
                    WatchAvailabilityStatus.WATCH_ALREADY_LINKED_MISSING_PRE_INSERTED_SIM_ACTIVATION -> {
                        Timber.d("AddFirstMomoViewModel: Watch is already linked, fetching details.")
                        CrashlyticsLog.log("Watch is already linked, fetching details.")
                        val wearer = wearerRepository.getWearer(validatedDeviceId)
                        wearer?.let {
                            _currentWearer.postValue(it)
                            CrashlyticsLog.log("Successfully fetched details for already linked wearer")
                        } ?: run {
                            Timber.e("AddFirstMomoViewModel: Failed to fetch details for an already linked wearer")
                            CrashlyticsLog.log("AddFirstMomoViewModel: Failed to fetch details for already linked wearer")
                        }
                    }
                    WatchAvailabilityStatus.WATCH_NOT_FOUND -> {
                        Timber.d("AddFirstMomoViewModel: Watch not found")
                        CrashlyticsLog.log("Watch not found")
                    }
                    WatchAvailabilityStatus.IMEI_INVALID,
                    WatchAvailabilityStatus.IMEI_LENGTH_ERROR -> {
                        Timber.w("AddFirstMomoViewModel: Invalid IMEI format")
                        CrashlyticsLog.log("Invalid IMEI format")
                    }
                    WatchAvailabilityStatus.IMEI_UNKNOWN -> {
                        Timber.w("AddFirstMomoViewModel: Unknown IMEI")
                        CrashlyticsLog.log("Unknown IMEI")
                    }
                    WatchAvailabilityStatus.SEARCH_ERROR,
                    WatchAvailabilityStatus.INTERNAL_ERROR -> {
                        Timber.e("AddFirstMomoViewModel: Search or internal error occurred")
                        CrashlyticsLog.log("Search or internal error occurred")
                    }
                    else -> {
                        Timber.w("AddFirstMomoViewModel: Unexpected status: ${result.status}")
                        CrashlyticsLog.log("Unexpected status: ${result.status}")
                    }
                }
                _watchAvailabilityStatus.postValue(result.status)
                _watchAdminInfo.postValue(result.adminInfo)
            }.onFailure { error ->
                Timber.e(error, "AddFirstMomoViewModel: Failed to validate watch availability")
                CrashlyticsLog.recordNonFatalError(error, "Failed to validate watch availability")
                trackImeiResult(WatchAvailabilityStatus.SEARCH_ERROR)
                _watchAvailabilityStatus.postValue(WatchAvailabilityStatus.SEARCH_ERROR)
            }
        }
    }

    private fun addContactOtherModel(watch: Wearer, fullName: String, phone: String, bitmap: Bitmap?, hasPhoto: Boolean) {
        Timber.d("AddFirstMomoViewModel: Adding first contact for non-Space model")
        CrashlyticsLog.log("Adding first contact for non-Space model")
        viewModelScope.launch(ioContext) {
            runCatching {
                contactRepository.addNewContact(watch, fullName, phone, bitmap, sos = true, chatEnabled = true)
            }.onFailure { error ->
                when (error) {
                    is ParseException -> {
                        if (error.message == "Contact already exists") {
                            Timber.w("AddFirstMomoViewModel: Contact already exists")
                            CrashlyticsLog.log("Contact already exists")
                            trackFirstContactResult(
                                FirstContactStatus.ERROR_CONTACT_DUPLICATED,
                                AddWatchAnalytics.Result.SKIPPED,
                                hasPhoto
                            )
                            _firstContactStatus.postValue(FirstContactStatus.ERROR_CONTACT_DUPLICATED)
                        } else {
                            Timber.e(error, "AddFirstMomoViewModel: Failed to save contact")
                            CrashlyticsLog.recordNonFatalError(error, "Failed to save contact")
                            trackFirstContactResult(
                                FirstContactStatus.ERROR_SAVING,
                                AddWatchAnalytics.Result.ERROR,
                                hasPhoto
                            )
                            _firstContactStatus.postValue(FirstContactStatus.ERROR_SAVING)
                        }
                    }
                    else -> {
                        Timber.e(error, "AddFirstMomoViewModel: Unknown error while saving contact")
                        CrashlyticsLog.recordNonFatalError(error, "Unknown error while saving contact")
                        trackFirstContactResult(
                            FirstContactStatus.ERROR_SAVING,
                            AddWatchAnalytics.Result.ERROR,
                            hasPhoto
                        )
                        _firstContactStatus.postValue(FirstContactStatus.ERROR_SAVING)
                    }
                }
            }.onSuccess {
                Timber.i("AddFirstMomoViewModel: Successfully added contact")
                CrashlyticsLog.log("Successfully added contact")
                trackFirstContactResult(
                    FirstContactStatus.CONTACT_SAVED,
                    AddWatchAnalytics.Result.SUCCESS,
                    hasPhoto
                )
                _firstContactStatus.postValue(FirstContactStatus.CONTACT_SAVED)
                ParseCloud.callFunctionInBackground("wContacts", mutableMapOf<String, String>("deviceId" to watch.getString("deviceId")!!)) { _: Any?, e: ParseException? ->
                    e?.let { error ->
                        Timber.e(error, "AddFirstMomoViewModel: Error calling wContacts cloud function")
                        CrashlyticsLog.recordNonFatalError(error, "Error calling wContacts cloud function")
                    }
                }
            }
        }
    }

    private fun addContactSpace2(watch: Wearer, fullName: String, phone: String, bitmap: Bitmap?, hasPhoto: Boolean) {
        Timber.d("AddFirstMomoViewModel: Adding first contact for Space model")
        CrashlyticsLog.log("Adding first contact for Space model")
        viewModelScope.launch(ioContext) {
            runCatching {
                contactRepository.addNewContactSpace(watch, fullName, phone, bitmap, sos = true)
            }.onFailure { error ->
                Timber.e(error, "AddFirstMomoViewModel: Failed to save Space2 contact")
                CrashlyticsLog.recordNonFatalError(error, "Failed to save Space2 contact")
                trackFirstContactResult(
                    FirstContactStatus.ERROR_SAVING,
                    AddWatchAnalytics.Result.ERROR,
                    hasPhoto
                )
                _firstContactStatus.postValue(FirstContactStatus.ERROR_SAVING)
            }.onSuccess {
                Timber.i("AddFirstMomoViewModel: Successfully added Space2 contact")
                CrashlyticsLog.log("Successfully added Space2 contact")
                trackFirstContactResult(
                    FirstContactStatus.CONTACT_SAVED,
                    AddWatchAnalytics.Result.SUCCESS,
                    hasPhoto
                )
                _firstContactStatus.postValue(FirstContactStatus.CONTACT_SAVED)
            }
        }
    }

    fun onContactEntered(fullName: String, phone: String, imagePath: String?) {
        Timber.d("AddFirstMomoViewModel: Processing new first contact entry")
        CrashlyticsLog.log("Processing new first contact entry")
        viewModelScope.launch(ioContext) {
            _firstContactStatus.postValue(FirstContactStatus.SAVING_CONTACT)

            var contactBitmap: Bitmap? = null
            val hasPhoto = !imagePath.isNullOrBlank()
            if (!imagePath.isNullOrBlank()) {
                try {
                    contactBitmap = BitmapFactory.decodeFile(imagePath)
                    if (contactBitmap == null) {
                        Timber.w("AddFirstMomoViewModel: Failed to decode first contact image")
                        CrashlyticsLog.log("Failed to decode first contact image")
                    }
                } catch (e: Exception) {
                    Timber.e(e, "AddFirstMomoViewModel: Error decoding first contact image")
                    CrashlyticsLog.recordNonFatalError(e, "Error decoding first contact image")
                    // contactBitmap remains null
                }
            }

            _currentWearer.value?.let { watch ->
                when (watch.model) {
                    Space2, Space3, Space4 -> {
                        addContactSpace2(watch, fullName, phone, contactBitmap, hasPhoto)
                    }
                    else -> {
                        addContactOtherModel(watch, fullName, phone, contactBitmap, hasPhoto)
                    }
                }
            }
        }
    }

    fun onKidDetailsEntered(params: MutableMap<String,Any>, hasCustomPhoto: Boolean = params.containsKey("image")) {
        Timber.d("AddFirstMomoViewModel: Saving kid details")
        CrashlyticsLog.log("Saving kid details")
        viewModelScope.launch(ioContext) {
            _kidProfileStatus.postValue(KidProfileStatus.KID_DETAILS_SAVING)
            val hasPhone = params.containsKey("phone")
            val hasBirthday = params.containsKey("birthday")
            _currentWearer.value?.let { wearer ->
                runCatching {
                    wearerRepository.editWearer(wearer, params)
                }.onFailure { error ->
                    Timber.e(error, "AddFirstMomoViewModel: Failed to save kid details")
                    CrashlyticsLog.recordNonFatalError(error, "Failed to save kid details")
                    trackKidProfileResult(
                        result = AddWatchAnalytics.Result.ERROR,
                        hasPhoto = hasCustomPhoto,
                        hasPhone = hasPhone,
                        hasBirthday = hasBirthday,
                        errorType = error::class.simpleName,
                    )
                    _kidProfileStatus.postValue(KidProfileStatus.ERROR_LOADING)
                }.onSuccess {
                    Timber.i("AddFirstMomoViewModel: Successfully saved kid details")
                    CrashlyticsLog.log("Successfully saved kid details")
                    trackKidProfileResult(
                        result = AddWatchAnalytics.Result.SUCCESS,
                        hasPhoto = hasCustomPhoto,
                        hasPhone = hasPhone,
                        hasBirthday = hasBirthday,
                    )
                    _kidProfileStatus.postValue(KidProfileStatus.KID_DETAILS_SUCCESS)
                }
            }
        }
    }

    fun refreshCurrentWearer() {
        Timber.d("AddFirstMomoViewModel: Refreshing current wearer")
        CrashlyticsLog.log("Refreshing current wearer")
        viewModelScope.launch(ioContext) {
            _currentWearer.value?.let { existingWearer ->
                runCatching {
                    val refreshedWearer = existingWearer.suspendFetch<Wearer>()
                    refreshedWearer.let {
                        Timber.i("AddFirstMomoViewModel: Successfully refreshed wearer")
                        CrashlyticsLog.log("Successfully refreshed wearer")
                        _currentWearer.postValue(it)
                    }
                }.onFailure { error ->
                    Timber.e(error, "AddFirstMomoViewModel: Failed to refresh wearer")
                    CrashlyticsLog.recordNonFatalError(error, "Failed to refresh wearer")
                }
            } ?: run {
                Timber.d("AddFirstMomoViewModel: No current wearer to refresh")
                CrashlyticsLog.log("No current wearer to refresh")
            }
        }
    }

    private fun WatchModel.analyticsName(): String =
        this::class.simpleName ?: "unknown"

    private fun WatchAvailabilityStatus.analyticsResult(): String =
        when (this) {
            WatchAvailabilityStatus.SUCCESS,
            WatchAvailabilityStatus.SUCCESS_WITH_SIM_PRE_INSERTED,
            WatchAvailabilityStatus.SUCCESS_WATCH_BELONGS_TO_OTHER_USER,
            WatchAvailabilityStatus.WATCH_ALREADY_LINKED,
            WatchAvailabilityStatus.WATCH_ALREADY_LINKED_MISSING_PRE_INSERTED_SIM_ACTIVATION -> AddWatchAnalytics.Result.SUCCESS
            else -> AddWatchAnalytics.Result.ERROR
        }

    private fun WearerStatus.analyticsResult(): String =
        if (this == WearerStatus.LINK_SUCCESS) {
            AddWatchAnalytics.Result.SUCCESS
        } else {
            AddWatchAnalytics.Result.ERROR
        }

    companion object {
        const val INPUT_METHOD_MANUAL = "manual"
        const val INPUT_METHOD_BARCODE = "barcode"

        const val SIM_PATH_SOYMOMO = "soymomo_sim"
        const val SIM_PATH_OTHER = "other_sim"
        const val SIM_PATH_PREINSERTED = "preinserted_sim"

        private const val SCREEN_ENTER_IMEI = "enter_imei"
        private const val SCREEN_ENABLE_BLUETOOTH = "enable_bluetooth"
        private const val SCREEN_FIRST_CONTACT = "first_contact"
        private const val SCREEN_SIM_CHOICE = "sim_choice"
        private const val SCREEN_INSERT_SIM = "insert_sim"
        private const val SCREEN_KID_PROFILE = "kid_profile"
        private const val SCREEN_FINISH = "finish"
    }
}
