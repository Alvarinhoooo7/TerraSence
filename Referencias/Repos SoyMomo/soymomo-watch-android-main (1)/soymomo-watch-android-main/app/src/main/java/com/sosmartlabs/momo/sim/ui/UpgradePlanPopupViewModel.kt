package com.sosmartlabs.momo.sim.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parse.ParseUser
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.sim.model.UpgradePopupTracking
import com.sosmartlabs.momo.sim.repository.SubscriptionPlanRepository
import com.sosmartlabs.momo.sim.repository.UpgradePopupRepository
import com.sosmartlabs.momo.sim.util.PopupBackoffPolicy
import com.sosmartlabs.momo.sim.util.UpgradePlanEligibility
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

/**
 * Mirrors iOS `UpgradePlanPopupViewModel` — gates the upgrade-plan promo popup on the
 * **3rd** `onResume` of `MainActivity` when the signed-in user owns at least one
 * upgrade-eligible subscription with at least one valid candidate plan in the catalog.
 *
 * Backoff (server-side via [UpgradePopupTracking], scoped to the **user** — never the
 * target plan, so a plan change does not reset it): 1st interaction -> 7d, 2nd -> 21d,
 * 3rd -> retire. Both dismiss (X) and CTA tap count as interactions.
 */
@HiltViewModel
class UpgradePlanPopupViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val subscriptionPlanRepository: SubscriptionPlanRepository,
    private val upgradePopupRepository: UpgradePopupRepository,
) : ViewModel() {

    private val _showPopup = MutableLiveData(false)
    val showPopup: LiveData<Boolean> get() = _showPopup

    private val _cheapestUpgradePlan = MutableLiveData<SubscriptionPlan?>(null)
    val cheapestUpgradePlan: LiveData<SubscriptionPlan?> get() = _cheapestUpgradePlan

    private val _primarySubscription = MutableLiveData<Subscription?>(null)
    val primarySubscription: LiveData<Subscription?> get() = _primarySubscription

    private val _navigateToUpgrade = MutableLiveData<Boolean>(false)
    val navigateToUpgrade: LiveData<Boolean> get() = _navigateToUpgrade

    private var willShowPopup: Boolean = false
    private var wontShowPopup: Boolean = false
    private var isEvaluating: Boolean = false
    private var mainAppearanceCount: Int = 0

    /**
     * Set once the popup is actually shown this ViewModel lifetime (one MainActivity
     * lifecycle; survives config changes). Stops [evaluate] from re-arming and
     * re-showing on every subsequent onResume — and from creating a fresh tracking
     * row each time — when the user dismissed via back-press/outside-tap. Cross-session
     * suppression is handled by [backoffAllowsShow].
     */
    private var hasShownPopup: Boolean = false

    /**
     * In-flight (or completed) create of the tracking row for the currently displayed popup.
     * Interactions await this so a fast close/CTA can't be dropped before the row exists.
     */
    @Volatile
    private var trackingDeferred: Deferred<UpgradePopupTracking?>? = null

    fun evaluate(subscriptions: List<Subscription>) {
        if (hasShownPopup) return
        if (wontShowPopup) return
        if (willShowPopup) return
        if (isEvaluating) return

        val currentUserId = ParseUser.getCurrentUser()?.objectId ?: return

        // `subscriber.user` is null for co-parents (the owner's _User row is
        // ACL-restricted, so the `include` resolves to null). Read the pointer
        // null-safely, and never let an unexpected Parse shape crash onResume.
        val eligible = runCatching {
            subscriptions.filter { sub ->
                sub.subscriber.getParseUser("user")?.objectId == currentUserId &&
                    UpgradePlanEligibility.isSubscriptionEligibleForUpgrade(sub)
            }
        }.getOrElse { error ->
            Timber.e(error, "UpgradePlanPopupVM: evaluate failed")
            CrashlyticsLog.recordNonFatalError(error, "UpgradePlanPopupViewModel.evaluate failed")
            wontShowPopup = true
            return
        }

        if (eligible.isEmpty()) return

        // Multiple eligible subscriptions usually share the same (MNO + paymentProvider)
        // and therefore the same plan catalog — one `getSubscriptionPlans` answers them all.
        // Group first so we make at most one network call per distinct catalog.
        val groups = groupForFetching(eligible)
        Timber.i(
            "UpgradePlanPopupVM: %d eligible sub(s) in %d fetch group(s)",
            eligible.size, groups.size
        )
        isEvaluating = true
        viewModelScope.launch(ioContext) {
            checkGroups(groups)
        }
    }

    private data class CandidateGroup(
        val mnoProviderId: String?,
        val paymentProviderName: String,
        val subscriptions: List<Subscription>,
    )

    private fun groupForFetching(subs: List<Subscription>): List<CandidateGroup> {
        val buckets = linkedMapOf<String, MutableList<Subscription>>()
        for (sub in subs) {
            val mnoId = sub.sim.mnoProvider.objectId.orEmpty()
            val ppName = sub.paymentProvider.name
            val key = "$mnoId|$ppName"
            buckets.getOrPut(key) { mutableListOf() }.add(sub)
        }
        return buckets.map { (_, members) ->
            val first = members.first()
            CandidateGroup(
                mnoProviderId = first.sim.mnoProvider.objectId,
                paymentProviderName = first.paymentProvider.name,
                subscriptions = members
            )
        }
    }

    private suspend fun checkGroups(groups: List<CandidateGroup>) {
        for (group in groups) {
            val plans = subscriptionPlanRepository.getSubscriptionPlans(
                mnoProvider = group.subscriptions.first().sim.mnoProvider,
                paymentProviderName = group.paymentProviderName,
                isQA = false
            )
            // Same catalog, but each subscription has its own current-price baseline.
            // Take the first sub in the group with at least one candidate; arm with the
            // cheapest candidate for that sub.
            for (sub in group.subscriptions) {
                val cheapest = plans
                    .filter { UpgradePlanEligibility.isUpgradeCandidate(it, sub) }
                    .minByOrNull { it.price }
                if (cheapest != null) {
                    // Escalating backoff scoped to the user (not the plan), so a plan
                    // change never resets it. 3 interactions ever → retired.
                    if (!backoffAllowsShow(sub)) {
                        Timber.i("UpgradePlanPopupVM: backoff active for upgrade popup - suppressing")
                        isEvaluating = false
                        wontShowPopup = true
                        return
                    }
                    Timber.i(
                        "UpgradePlanPopupVM: armed - sub %s with cheapest plan %s",
                        sub.objectId, cheapest.objectId
                    )
                    isEvaluating = false
                    _cheapestUpgradePlan.postValue(cheapest)
                    _primarySubscription.postValue(sub)
                    willShowPopup = true
                    tryShowIfReady(siblingPopupVisible = false)
                    return
                }
            }
        }
        Timber.i("UpgradePlanPopupVM: no candidates across any group - suppressing")
        isEvaluating = false
        wontShowPopup = true
    }

    fun showPendingPopupIfNeeded(siblingPopupVisible: Boolean) {
        if (mainAppearanceCount < 3) {
            mainAppearanceCount += 1
        }
        tryShowIfReady(siblingPopupVisible)
    }

    private fun tryShowIfReady(siblingPopupVisible: Boolean) {
        if (mainAppearanceCount < 3) return
        if (wontShowPopup) return
        if (!willShowPopup) return
        if (siblingPopupVisible) return
        Timber.i("UpgradePlanPopupVM: showing popup")
        willShowPopup = false
        hasShownPopup = true
        _showPopup.postValue(true)
        createTrackingForCurrentOffer()
    }

    fun closePopup() {
        Timber.i("UpgradePlanPopupVM: closed")
        _showPopup.value = false
        stampInteraction { upgradePopupRepository.updatePopupClosedAt(it) }
    }

    fun goToUpgrade() {
        Timber.i("UpgradePlanPopupVM: CTA tapped")
        _showPopup.value = false
        stampInteraction { upgradePopupRepository.updateCtaClickedAt(it) }
        _navigateToUpgrade.value = true
    }

    fun consumeNavigateToUpgrade() {
        _navigateToUpgrade.value = false
    }

    // MARK: - Backoff (backend-tracked)

    /**
     * Escalating backoff scoped to the user: 1st interaction -> 7d, 2nd -> 21d, 3rd -> retire.
     * Deliberately NOT scoped to the target plan — a plan change must not reset the backoff,
     * so once the user has dismissed or tapped the CTA 3 times the popup is retired for good.
     */
    private suspend fun backoffAllowsShow(subscription: Subscription): Boolean {
        val user = subscription.subscriber.user
        val history = upgradePopupRepository.getTrackingHistory(user)
        // An interaction = the row was dismissed (X) or its CTA was tapped.
        val interactionDates = history.mapNotNull { row ->
            listOfNotNull(row.popupClosedAt, row.ctaClickedAt).maxOrNull()
        }
        val allowed = PopupBackoffPolicy.shouldShow(
            interactionCount = interactionDates.size,
            lastInteractionAt = interactionDates.maxOrNull()
        )
        Timber.d(
            "UpgradePlanPopupVM: backoff - interactions=%d allowed=%b",
            interactionDates.size, allowed
        )
        return allowed
    }

    private fun createTrackingForCurrentOffer() {
        val subscription = _primarySubscription.value ?: run {
            Timber.e("UpgradePlanPopupVM: cannot create tracking - missing subscription")
            return
        }
        val plan = _cheapestUpgradePlan.value ?: run {
            Timber.e("UpgradePlanPopupVM: cannot create tracking - missing plan")
            return
        }
        val user = subscription.subscriber.user
        // Kept as a Deferred (not a post-hoc field assignment) so an interaction that lands
        // before the create finishes saving can await the row instead of being dropped.
        trackingDeferred = viewModelScope.async(ioContext) {
            runCatching {
                upgradePopupRepository.createTracking(user, subscription, plan)
            }.onSuccess {
                Timber.d("UpgradePlanPopupVM: upgrade popup shown tracked")
            }.onFailure {
                Timber.e(it, "UpgradePlanPopupVM: failed to track popup shown")
            }.getOrNull()
        }
    }

    private fun stampInteraction(update: suspend (UpgradePopupTracking) -> UpgradePopupTracking) {
        val deferred = trackingDeferred ?: run {
            Timber.w("UpgradePlanPopupVM: no tracking row to stamp interaction")
            return
        }
        viewModelScope.launch(ioContext) {
            runCatching {
                // Await the in-flight create so a close/CTA before the save completes is
                // applied to the row rather than lost to the race.
                val tracking = deferred.await()
                if (tracking == null) {
                    Timber.w("UpgradePlanPopupVM: tracking create failed; nothing to stamp")
                } else {
                    update(tracking)
                }
            }.onFailure { Timber.e(it, "UpgradePlanPopupVM: failed to stamp interaction") }
        }
    }
}
