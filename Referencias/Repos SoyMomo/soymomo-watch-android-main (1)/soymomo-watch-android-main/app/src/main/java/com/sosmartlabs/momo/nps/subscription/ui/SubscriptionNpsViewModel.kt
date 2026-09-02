package com.sosmartlabs.momo.nps.subscription.ui

import android.content.Context
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.nps.subscription.data.SubscriptionNpsRepository
import com.sosmartlabs.momo.nps.subscription.model.SubscriptionNpsScheduler
import com.sosmartlabs.momo.utils.CountryProvider
import com.sosmartlabs.momo.utils.SingleLiveEvent
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.util.Locale
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import androidx.core.content.edit

@HiltViewModel
class SubscriptionNpsViewModel @Inject constructor(
    private val repository: SubscriptionNpsRepository,
    @param:ApplicationContext private val context: Context,
) : ViewModel() {

    private var pendingScheduler: SubscriptionNpsScheduler? = null
    private var consumedScheduler: SubscriptionNpsScheduler? = null
    private var mainAppearanceCount = 0
    private var hasShownThisSession = false

    private val _scheduleEvaluation = MutableLiveData<Unit>()
    val scheduleEvaluation: LiveData<Unit> = _scheduleEvaluation

    /** One-shot result of a feedback submission: true = stored by the backend, false = failed. */
    private val _submitResult = SingleLiveEvent<Boolean>()
    val submitResult: LiveData<Boolean> = _submitResult

    fun checkForNps(userId: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val lastCheck = prefs.getLong(KEY_LAST_CHECK_TIME, 0L)
        val now = System.currentTimeMillis()

        if (now - lastCheck < CHECK_INTERVAL_MS) {
            Timber.d("SubscriptionNpsViewModel: skipping check, within 24h window")
            return
        }

        Timber.d("SubscriptionNpsViewModel: checking subscription NPS for userId=$userId")

        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { repository.findNpsScheduler(userId) }
            }.onSuccess { scheduler ->
                prefs.edit { putLong(KEY_LAST_CHECK_TIME, now) }
                if (scheduler != null) {
                    pendingScheduler = scheduler
                    _scheduleEvaluation.postValue(Unit)
                    Timber.d("SubscriptionNpsViewModel: pending scheduler queued=$scheduler")
                } else {
                    Timber.d("SubscriptionNpsViewModel: no pending scheduler")
                }
            }.onFailure {
                Timber.e(it, "SubscriptionNpsViewModel: checkForNps failed")
                CrashlyticsLog.recordNonFatalError(it, "SubscriptionNpsViewModel: checkForNps failed")
            }
        }
    }

    fun onMainAppearance() {
        mainAppearanceCount += 1
    }

    fun canShowPending(initialWatchLoadComplete: Boolean): Boolean {
        if (pendingScheduler == null || hasShownThisSession) {
            return false
        }
        if (!initialWatchLoadComplete) {
            Timber.d("SubscriptionNpsViewModel: deferring show, initial watch load incomplete")
            return false
        }
        if (mainAppearanceCount < MIN_MAIN_APPEARANCES) {
            Timber.d(
                "SubscriptionNpsViewModel: deferring show, appearanceCount=$mainAppearanceCount/${MIN_MAIN_APPEARANCES}",
            )
            return false
        }
        return true
    }

    fun consumePendingScheduler(): SubscriptionNpsScheduler? {
        val scheduler = pendingScheduler ?: return null
        pendingScheduler = null
        hasShownThisSession = true
        consumedScheduler = scheduler
        return scheduler
    }

    fun submitFeedback(
        schedulerId: String,
        score: Int,
        cancellationReasons: List<String>,
        otherReason: String?,
        comment: String?,
    ) {
        Timber.d("SubscriptionNpsViewModel: submitFeedback schedulerId=$schedulerId score=$score reasons=$cancellationReasons")

        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) {
                val country = runCatching { CountryProvider.getCountry(context) }.getOrDefault("unknown")
                val language = Locale.getDefault().toLanguageTag()
                repository.submitFeedback(schedulerId, score, cancellationReasons, otherReason, comment, country, language)
            }
            if (!success) {
                // Backend never recorded the feedback; keep the scheduler pending so it can be
                // re-offered instead of telling the user it was received.
                pendingScheduler = consumedScheduler
                hasShownThisSession = false
            }
            _submitResult.value = success
        }
    }

    fun rejectFeedback(schedulerId: String) {
        Timber.d("SubscriptionNpsViewModel: rejectFeedback schedulerId=$schedulerId")

        viewModelScope.launch(Dispatchers.IO) {
            repository.rejectFeedback(schedulerId)
        }
    }

    companion object {
        private const val PREFS_NAME = "subscription_nps_prefs"
        private const val KEY_LAST_CHECK_TIME = "last_check_time"
        private val CHECK_INTERVAL_MS = TimeUnit.DAYS.toMillis(1)

        /** Minimum MainActivity onResume count before the dialog can appear. */
        const val MIN_MAIN_APPEARANCES = 2
    }
}
