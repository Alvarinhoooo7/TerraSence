package com.sosmartlabs.momotabletpadres.sim.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.sim.model.*
import com.sosmartlabs.momotabletpadres.sim.repository.SimRepository
import com.sosmartlabs.momotabletpadres.sim.repository.SubscriptionRepository
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class TransferSubscriptionViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val userRepository: UserRepository,
    private val subscriptionRepository: SubscriptionRepository,
    private val simRepository: SimRepository
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

    fun getCurrentUser() {
        viewModelScope.launch(ioContext) {
            Timber.d("TransferSubscriptionViewModel: getCurrentUser() - Starting")
            CrashlyticsLog.log("Attempting to get current user")

            userRepository.getCurrentParseUser()?.let { user ->
                _currentUser.postValue(user)
                Timber.d("TransferSubscriptionViewModel: getCurrentUser() - Success: ${user.objectId}")
                CrashlyticsLog.log("Current user fetched: ${user.objectId}")
            } ?: run {
                Timber.e("TransferSubscriptionViewModel: getCurrentUser() - Failed to fetch user")
                CrashlyticsLog.log("Failed to fetch current user")
            }
        }
    }

    fun getSim(iccId: String) {
        viewModelScope.launch(ioContext) {
            Timber.d("TransferSubscriptionViewModel: getSim() - Starting for ICCID: $iccId")
            CrashlyticsLog.log("Checking SIM availability for ICCID: $iccId")

            _newSimStatus.postValue(SimStatus.SEARCHING)

            when (iccId.length) {
                19, 20 -> {
                    val currentIccId = currentSubscription.value?.sim?.iccId
                    if (currentIccId == iccId) {
                        _newSimStatus.postValue(SimStatus.SIM_ALREADY_IN_USE)
                        Timber.d("TransferSubscriptionViewModel: getSim() - SIM already in use: $iccId")
                        CrashlyticsLog.log("SIM already in use: $iccId")
                        return@launch
                    }

                    val sim = simRepository.getSim(iccId)
                    when {
                        sim == null -> {
                            _newSimStatus.postValue(SimStatus.SIM_NOT_FOUND)
                            Timber.d("TransferSubscriptionViewModel: getSim() - SIM not found: $iccId")
                            CrashlyticsLog.log("SIM not found: $iccId")
                        }
                        simRepository.isSimInUse(sim) -> {
                            _newSimStatus.postValue(SimStatus.SIM_ALREADY_IN_USE)
                            Timber.d("TransferSubscriptionViewModel: getSim() - SIM in use: $iccId")
                            CrashlyticsLog.log("SIM in use: $iccId")
                        }
                        else -> {
                            _newSimStatus.postValue(SimStatus.SIM_AVAILABLE)
                            _newTransferSim.postValue(sim!!)
                            Timber.d("TransferSubscriptionViewModel: getSim() - SIM available: $iccId")
                            CrashlyticsLog.log("SIM available for transfer: $iccId")
                        }
                    }
                }
                else -> {
                    _newSimStatus.postValue(SimStatus.ICC_ID_LENGTH)
                    Timber.e("TransferSubscriptionViewModel: getSim() - Invalid ICCID length: ${iccId.length}")
                    CrashlyticsLog.log("Invalid ICCID length: ${iccId.length}")
                }
            }
        }
    }

    fun setCurrentSubscription(subscription: Subscription) {
        viewModelScope.launch(ioContext) {
            Timber.d("TransferSubscriptionViewModel: setCurrentSubscription() - Setting subscription: ${subscription.objectId}")
            CrashlyticsLog.log("Setting current subscription: ${subscription.objectId}")
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
                
                Timber.d("TransferSubscriptionViewModel: transferSubscriptionToNewSim() - Transferring from ${currentSim.iccId} to ${newSim.iccId}")
                CrashlyticsLog.log("Transferring subscription from ${currentSim.iccId} to ${newSim.iccId}")
                
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
                        _currentSubscription.postValue(updatedSubscription!!)
                        _newTransferSubscriptionStatus.postValue(TransferSubscriptionStatus.TRANSFER_SUCCESS)
                        Timber.d("TransferSubscriptionViewModel: transferSubscriptionToNewSim() - Transfer successful: ${updatedSubscription.objectId}")
                        CrashlyticsLog.log("Transfer successful for subscription: ${updatedSubscription.objectId}")
                    } else {
                        val errorMessage = "Subscription object not found"
                        _newTransferSubscriptionStatus.postValue(TransferSubscriptionStatus.transferError(
                            error = errorMessage,
                            message = "",
                            statusCode = status
                        ))
                        Timber.e("TransferSubscriptionViewModel: transferSubscriptionToNewSim() - $errorMessage")
                        CrashlyticsLog.log("Transfer failed: $errorMessage")
                    }
                } else {
                    val error = response["error"] as String
                    val message = response["message"] as String
                    _newTransferSubscriptionStatus.postValue(TransferSubscriptionStatus.transferError(
                        error = error,
                        message = message,
                        statusCode = status
                    ))
                    Timber.e("TransferSubscriptionViewModel: transferSubscriptionToNewSim() - Failed: $error - $message")
                    CrashlyticsLog.log("Transfer failed: $error - $message")
                }
            }.onFailure { error ->
                Timber.e("TransferSubscriptionViewModel: transferSubscriptionToNewSim() - Exception: ${error.message}")
                CrashlyticsLog.recordNonFatalError(error, "Transfer failed with exception")
                _newTransferSubscriptionStatus.postValue(TransferSubscriptionStatus.TRANSFER_ERROR)
            }
        }
    }
}