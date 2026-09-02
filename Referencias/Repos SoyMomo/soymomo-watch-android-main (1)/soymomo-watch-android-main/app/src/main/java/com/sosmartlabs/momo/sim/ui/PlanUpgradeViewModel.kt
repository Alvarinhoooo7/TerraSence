package com.sosmartlabs.momo.sim.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.sim.repository.SubscriptionPlanRepository
import com.sosmartlabs.momo.sim.util.UpgradePlanEligibility
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class PlanUpgradeViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val subscriptionPlanRepository: SubscriptionPlanRepository
) : ViewModel() {

    private var subscription: Subscription? = null

    /**
     * Guards the money-sensitive plan change against double-submit: a rapid second
     * confirm (re-delivered fragment result, or fast double-tap) is a no-op while a
     * `changeSubscriptionPlan` call is in flight, so we never dispatch it twice.
     */
    @Volatile
    private var isUpgradeInFlight = false

    private val _upgradePlans = MutableLiveData<List<SubscriptionPlan>>(emptyList())
    val upgradePlans: LiveData<List<SubscriptionPlan>> get() = _upgradePlans

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> get() = _isLoading

    private val _errorMessage = MutableLiveData<String?>(null)
    val errorMessage: LiveData<String?> get() = _errorMessage

    private val _selectedPlanForConfirmation = MutableLiveData<SubscriptionPlan?>(null)
    val selectedPlanForConfirmation: LiveData<SubscriptionPlan?> get() = _selectedPlanForConfirmation

    private val _upgradeSuccessMessage = MutableLiveData<String?>(null)
    val upgradeSuccessMessage: LiveData<String?> get() = _upgradeSuccessMessage

    fun consumeUpgradeSuccess() {
        _upgradeSuccessMessage.value = null
    }

    private val _confirmErrorMessage = MutableLiveData<String?>(null)
    val confirmErrorMessage: LiveData<String?> get() = _confirmErrorMessage

    fun consumeConfirmError() {
        _confirmErrorMessage.value = null
    }

    fun setSubscription(subscription: Subscription) {
        this.subscription = subscription
    }

    fun fetchUpgradePlans() {
        val currentSubscription = subscription ?: run {
            _errorMessage.value = "Subscription not available"
            _upgradePlans.value = emptyList()
            return
        }

        viewModelScope.launch(ioContext) {
            runCatching {
                _isLoading.postValue(true)
                _errorMessage.postValue(null)

                subscriptionPlanRepository.getSubscriptionPlans(
                    mnoProvider = currentSubscription.sim.mnoProvider,
                    paymentProviderName = currentSubscription.paymentProvider.name,
                    isQA = false
                )
                    .filter { UpgradePlanEligibility.isUpgradeCandidate(it, currentSubscription) }
                    .sortedBy { it.price }
            }.onSuccess { plans ->
                _upgradePlans.postValue(plans)
            }.onFailure { error ->
                Timber.e(error, "PlanUpgradeViewModel: failed to fetch upgrade plans")
                _errorMessage.postValue(error.localizedMessage ?: "Unknown error")
                _upgradePlans.postValue(emptyList())
            }

            _isLoading.postValue(false)
        }
    }

    fun presentConfirmation(plan: SubscriptionPlan) {
        _selectedPlanForConfirmation.value = plan
    }

    fun dismissConfirmation() {
        _selectedPlanForConfirmation.value = null
    }

    fun confirmUpgrade() {
        val plan = _selectedPlanForConfirmation.value ?: return
        val planId = plan.objectId ?: run {
            _confirmErrorMessage.value = "Missing plan id"
            return
        }
        val currentSubscription = subscription ?: run {
            _confirmErrorMessage.value = "Subscription not available"
            return
        }
        val iccId = currentSubscription.iccId
        if (iccId.isNullOrBlank()) {
            _confirmErrorMessage.value = "Missing iccId"
            return
        }

        if (isUpgradeInFlight) {
            Timber.w("PlanUpgradeViewModel: confirmUpgrade ignored - change already in flight")
            return
        }
        isUpgradeInFlight = true

        viewModelScope.launch(ioContext) {
            _isLoading.postValue(true)
            runCatching {
                subscriptionPlanRepository.changeSubscriptionPlan(
                    iccId = iccId,
                    targetPlanId = planId
                )
            }.onSuccess { message ->
                _selectedPlanForConfirmation.postValue(null)
                _upgradeSuccessMessage.postValue(message.ifBlank { "ok" })
            }.onFailure { error ->
                Timber.e(error, "PlanUpgradeViewModel: confirmUpgrade failed")
                _selectedPlanForConfirmation.postValue(null)
                _confirmErrorMessage.postValue(error.localizedMessage ?: "Unknown error")
            }
            _isLoading.postValue(false)
            isUpgradeInFlight = false
        }
    }
}
