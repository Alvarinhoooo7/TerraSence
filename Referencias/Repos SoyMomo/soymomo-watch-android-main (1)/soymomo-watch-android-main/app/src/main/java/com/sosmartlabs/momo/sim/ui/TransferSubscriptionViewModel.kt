package com.sosmartlabs.momo.sim.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parse.ParseUser
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.main.model.UserRepository
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.sim.model.*
import com.sosmartlabs.momo.sim.repository.SimRepository
import com.sosmartlabs.momo.sim.repository.SubscriptionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.UUID
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class TransferSubscriptionViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val userRepository: UserRepository,
    private val subscriptionRepository: SubscriptionRepository,
    private val simRepository: SimRepository,
    private val simAnalytics: SimAnalytics,
) : ViewModel() {

    // Current User
    private var _currentUser = MutableLiveData<ParseUser>()
    val currentUser: LiveData<ParseUser>
        get() = _currentUser

    // Current Subscription
    private var _currentSubscription = MutableLiveData<Subscription>()
    val currentSubscription: LiveData<Subscription>
        get() = _currentSubscription

    // New Sim card to transfer Subscription
    private var _newTransferSim = MutableLiveData<Sim>()
    private val newTransferSim: LiveData<Sim>
        get() = _newTransferSim

    // Status of the entered new Sim card to transfer in Subscription
    private var _newSimStatus = MutableLiveData(SimStatus.DEFAULT)
    val newSimStatus: LiveData<SimStatus>
        get() = _newSimStatus

    // Current status of the Transfer
    private var _newTransferSubscriptionStatus = MutableLiveData(TransferSubscriptionStatus.DEFAULT)
    val newTransferSubscriptionStatus: LiveData<TransferSubscriptionStatus>
        get() = _newTransferSubscriptionStatus

    private var transferFlowId = UUID.randomUUID().toString()
    private var hasStartedTransferFlow = false

    fun startTransferAnalytics() {
        transferFlowId = UUID.randomUUID().toString()
        hasStartedTransferFlow = true
        simAnalytics.track(
            SimAnalytics.Events.TRANSFER_STARTED,
            transferContext(screen = SCREEN_TRANSFER_START),
            mapOf(SimAnalytics.Params.RESULT to SimAnalytics.Result.SUCCESS)
        )
    }

    fun getCurrentUser() {
        viewModelScope.launch(ioContext) {
            Timber.d("TransferSubscriptionViewModel: getCurrentUser() - Starting")
            CrashlyticsLog.log("Attempting to get current user")

            userRepository.getCurrentUser()?.let { user ->
                _currentUser.postValue(user)
                Timber.d("TransferSubscriptionViewModel: getCurrentUser() - Success")
                CrashlyticsLog.log("Current user fetched")
            } ?: run {
                Timber.e("TransferSubscriptionViewModel: getCurrentUser() - Failed to fetch user")
                CrashlyticsLog.log("Failed to fetch current user")
            }
        }
    }

    fun getSim(
        iccId: String,
        inputMethod: String = SimAnalytics.InputMethod.MANUAL,
    ) {
        viewModelScope.launch(ioContext) {
            if (!hasStartedTransferFlow) startTransferAnalytics()
            Timber.d("TransferSubscriptionViewModel: getSim() - Starting")
            CrashlyticsLog.log("Checking SIM availability for transfer")
            trackTransferIccidSubmitted(iccId.length, inputMethod)

            _newSimStatus.postValue(SimStatus.SEARCHING)

            when (iccId.length) {
                19, 20 -> {
                    val currentIccId = currentSubscription.value?.sim?.iccId
                    if (currentIccId == iccId) {
                        _newSimStatus.postValue(SimStatus.SIM_ALREADY_IN_USE)
                        Timber.d("TransferSubscriptionViewModel: getSim() - SIM already in use")
                        CrashlyticsLog.log("SIM already in use")
                        trackTransferIccidResult(SimStatus.SIM_ALREADY_IN_USE, iccId.length, inputMethod)
                        return@launch
                    }

                    val sim = simRepository.getSim(iccId)
                    when {
                        sim == null -> {
                            _newSimStatus.postValue(SimStatus.SIM_NOT_FOUND)
                            Timber.d("TransferSubscriptionViewModel: getSim() - SIM not found")
                            CrashlyticsLog.log("SIM not found")
                            trackTransferIccidResult(SimStatus.SIM_NOT_FOUND, iccId.length, inputMethod)
                        }
                        simRepository.isSimRetired(sim) -> {
                            _newSimStatus.postValue(SimStatus.SIM_RETIRED)
                            Timber.d("TransferSubscriptionViewModel: getSim() - SIM is retired")
                            CrashlyticsLog.log("SIM is retired")
                            trackTransferIccidResult(SimStatus.SIM_RETIRED, iccId.length, inputMethod)
                        }
                        simRepository.isSimInUse(sim) -> {
                            _newSimStatus.postValue(SimStatus.SIM_ALREADY_IN_USE)
                            Timber.d("TransferSubscriptionViewModel: getSim() - SIM in use")
                            CrashlyticsLog.log("SIM in use")
                            trackTransferIccidResult(SimStatus.SIM_ALREADY_IN_USE, iccId.length, inputMethod)
                        }
                        else -> {
                            _newSimStatus.postValue(SimStatus.SIM_AVAILABLE)
                            _newTransferSim.postValue(sim)
                            Timber.d("TransferSubscriptionViewModel: getSim() - SIM available")
                            CrashlyticsLog.log("SIM available for transfer")
                            trackTransferIccidResult(
                                status = SimStatus.SIM_AVAILABLE,
                                inputLength = iccId.length,
                                inputMethod = inputMethod,
                                country = sim.mnoProvider.country,
                            )
                        }
                    }
                }
                else -> {
                    _newSimStatus.postValue(SimStatus.ICC_ID_LENGTH)
                    Timber.e("TransferSubscriptionViewModel: getSim() - Invalid ICCID length: ${iccId.length}")
                    CrashlyticsLog.log("Invalid ICCID length: ${iccId.length}")
                    trackTransferIccidResult(SimStatus.ICC_ID_LENGTH, iccId.length, inputMethod)
                }
            }
        }
    }

    fun setCurrentSubscription(subscription: Subscription) {
        viewModelScope.launch(ioContext) {
            Timber.d("TransferSubscriptionViewModel: setCurrentSubscription() - Setting subscription")
            CrashlyticsLog.log("Setting current subscription")
            _currentSubscription.postValue(subscription)
        }
    }

    fun resetNewSimStatus() {
        viewModelScope.launch(ioContext) {
            Timber.d("TransferSubscriptionViewModel: resetNewSimStatus() - Resetting statuses")
            CrashlyticsLog.log("Resetting SIM and transfer statuses to default")
            _newSimStatus.postValue(SimStatus.DEFAULT)
            _newTransferSubscriptionStatus.postValue(TransferSubscriptionStatus.DEFAULT)
        }
    }

    fun transferSubscriptionToNewSim() {
        viewModelScope.launch(ioContext) {
            Timber.d("TransferSubscriptionViewModel: transferSubscriptionToNewSim() - Starting transfer")
            CrashlyticsLog.log("Initiating subscription transfer")

            runCatching {
                _newTransferSubscriptionStatus.postValue(TransferSubscriptionStatus.TRANSFER_IN_PROGRESS)
                val currentSim = currentSubscription.value!!
                val newSim = newTransferSim.value!!
                
                Timber.d("TransferSubscriptionViewModel: transferSubscriptionToNewSim() - Transferring to new SIM")
                CrashlyticsLog.log("Transferring subscription to new SIM")
                
                subscriptionRepository.transferSubscriptionToNewSim(
                    currentIccId = currentSim.iccId,
                    newIccId = newSim.iccId
                )
            }.onSuccess { response ->
                Timber.d("TransferSubscriptionViewModel: transferSubscriptionToNewSim() - Response received: $response")
                
                if (response.isNullOrEmpty()) {
                    _newTransferSubscriptionStatus.postValue(TransferSubscriptionStatus.TRANSFER_ERROR)
                    Timber.e("TransferSubscriptionViewModel: transferSubscriptionToNewSim() - Empty response")
                    CrashlyticsLog.log("Transfer failed: Empty response")
                    return@onSuccess
                }

                val status = response["status"] as Int
                if (status == 200) {
                    val updatedSubscription = subscriptionRepository.fetchSubscription(subscriptionId = currentSubscription.value!!.objectId)
                    if (updatedSubscription != null) {
                        _currentSubscription.postValue(updatedSubscription)
                        _newTransferSubscriptionStatus.postValue(TransferSubscriptionStatus.TRANSFER_SUCCESS)
                        Timber.d("TransferSubscriptionViewModel: transferSubscriptionToNewSim() - Transfer successful")
                        CrashlyticsLog.log("Transfer successful")
                        trackTransferCompleted(
                            result = SimAnalytics.Result.SUCCESS,
                            statusCode = status,
                        )
                    } else {
                        val errorMessage = "Subscription object not found"
                        _newTransferSubscriptionStatus.postValue(TransferSubscriptionStatus.transferError(
                            error = errorMessage,
                            message = "",
                            statusCode = status
                        ))
                        Timber.e("TransferSubscriptionViewModel: transferSubscriptionToNewSim() - $errorMessage")
                        CrashlyticsLog.log("Transfer failed: $errorMessage")
                        trackTransferCompleted(
                            result = SimAnalytics.Result.ERROR,
                            statusCode = status,
                            errorType = "subscription_not_found",
                        )
                    }
                } else {
                    val error = response["error"] as String
                    val message = response["message"] as String
                    _newTransferSubscriptionStatus.postValue(TransferSubscriptionStatus.transferError(
                        error = error,
                        message = message,
                        statusCode = status
                    ))
                    Timber.e("TransferSubscriptionViewModel: transferSubscriptionToNewSim() - Failed")
                    CrashlyticsLog.log("Transfer failed")
                    trackTransferCompleted(
                        result = SimAnalytics.Result.ERROR,
                        statusCode = status,
                        errorType = error,
                    )
                }
            }.onFailure { error ->
                Timber.e("TransferSubscriptionViewModel: transferSubscriptionToNewSim() - Exception: ${error.message}")
                CrashlyticsLog.recordNonFatalError(error, "Transfer failed with exception")
                trackTransferCompleted(
                    result = SimAnalytics.Result.ERROR,
                    errorType = error::class.simpleName,
                )
                _newTransferSubscriptionStatus.postValue(TransferSubscriptionStatus.TRANSFER_ERROR)
            }
        }
    }

    private fun trackTransferIccidSubmitted(inputLength: Int, inputMethod: String) {
        if (inputLength < 19 && inputMethod == SimAnalytics.InputMethod.MANUAL) return

        simAnalytics.track(
            SimAnalytics.Events.TRANSFER_ICCID_SUBMITTED,
            transferContext(screen = SCREEN_TRANSFER_SIM),
            mapOf(
                SimAnalytics.Params.INPUT_LENGTH to inputLength,
                SimAnalytics.Params.INPUT_METHOD to inputMethod,
            )
        )
    }

    private fun trackTransferIccidResult(
        status: SimStatus,
        inputLength: Int,
        inputMethod: String,
        country: String? = null,
    ) {
        if (inputLength < 19 && inputMethod == SimAnalytics.InputMethod.MANUAL) return

        simAnalytics.track(
            SimAnalytics.Events.TRANSFER_ICCID_RESULT,
            transferContext(screen = SCREEN_TRANSFER_SIM)?.copy(country = country ?: currentSubscription.value?.plan?.mnoProvider?.country),
            mapOf(
                SimAnalytics.Params.RESULT to status.analyticsResult(),
                SimAnalytics.Params.STATUS to status.name,
                SimAnalytics.Params.INPUT_LENGTH to inputLength,
                SimAnalytics.Params.INPUT_METHOD to inputMethod,
            )
        )
    }

    private fun trackTransferCompleted(
        result: String,
        statusCode: Int? = null,
        errorType: String? = null,
    ) {
        simAnalytics.track(
            SimAnalytics.Events.TRANSFER_COMPLETED,
            transferContext(screen = SCREEN_TRANSFER_SIM),
            mapOf(
                SimAnalytics.Params.RESULT to result,
                SimAnalytics.Params.HTTP_STATUS_CODE to statusCode,
                SimAnalytics.Params.ERROR_TYPE to errorType,
            )
        )
    }

    private fun transferContext(screen: String? = null): SimAnalytics.SimContext? {
        val subscription = currentSubscription.value
        return SimAnalytics.SimContext(
            flowId = transferFlowId,
            flowType = SimAnalytics.FlowType.TRANSFER,
            entryPoint = SimAnalytics.EntryPoint.SIM_CENTER,
            screen = screen,
            country = subscription?.plan?.mnoProvider?.country,
            watchModel = subscription?.watch?.modelName(),
            paymentProvider = subscription?.plan?.paymentProvider?.name,
            billingPeriod = subscription?.plan?.billingPeriodType,
        )
    }

    private fun SimStatus.analyticsResult(): String =
        when (this) {
            SimStatus.SIM_AVAILABLE,
            SimStatus.SIM_ACTIVATED -> SimAnalytics.Result.SUCCESS
            SimStatus.ALAI,
            SimStatus.SIM_RETIRED -> SimAnalytics.Result.UNAVAILABLE
            else -> SimAnalytics.Result.ERROR
        }

    private companion object {
        const val SCREEN_TRANSFER_START = "transfer_start"
        const val SCREEN_TRANSFER_SIM = "transfer_sim"
    }
}
