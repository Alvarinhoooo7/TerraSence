package com.sosmartlabs.momo.main.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.Wearer
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

/**
 * Resolves the wearer DisconnectionActivity was opened for, and maps it to
 * [DisconnectionUiState].
 *
 * Every failure lands on [DisconnectionUiState.Generic]. The screen has useful advice to
 * give with no wearer at all, so there is no error state to design and nothing to retry —
 * a watch that cannot be resolved simply gets the page the screen has always shown.
 */
@HiltViewModel
class DisconnectionViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val watchUserRepository: WatchUserRepository
) : ViewModel() {

    private val _state = MutableLiveData<DisconnectionUiState>(DisconnectionUiState.Generic)
    val state: LiveData<DisconnectionUiState> get() = _state

    private var inFlight = false

    /**
     * Loads (or reloads) the wearer.
     *
     * Called from onCreate and again from onResume, so the elapsed strings and the
     * permission gate are recomputed after a trip to the dialer or a maps app. Re-entrant
     * calls are dropped rather than queued: the result is idempotent and the screen has
     * nothing to show in the meantime.
     */
    fun load(wearerId: String) {
        if (inFlight) return
        inFlight = true
        viewModelScope.launch {
            val resolved = withContext(ioContext) { resolve(wearerId) }
            _state.value = resolved
            inFlight = false
        }
    }

    /**
     * All Parse access for this screen happens here, on [ioContext].
     *
     * `WatchUserRepository.findWatchById` returns the shared in-memory Wearer when the list
     * is loaded, but falls through to a BLOCKING `ParseQuery.first.fetchIfNeeded()` that
     * throws when nothing matches — hence both the IO context and the runCatching. An
     * unguarded call here is the crash class fixed in PR #255.
     */
    private fun resolve(wearerId: String): DisconnectionUiState {
        val wearer = runCatching { watchUserRepository.findWatchById(wearerId) }
            .onFailure { Timber.w(it, "DisconnectionViewModel: could not resolve wearer $wearerId") }
            .getOrNull()
            ?: return DisconnectionUiState.Generic

        // MANDATORY, and not interchangeable with the has() guards below. ParseObject.has()
        // compiles to a bare containsKey() with no fetch-state check, so on an UNFETCHED
        // object it reports every column as absent instead of throwing. Without this branch
        // a cold wearer would render as "we know nothing about this watch" — a screen that
        // looks broken rather than one that is still loading.
        if (!wearer.isDataAvailable()) {
            Timber.d("DisconnectionViewModel: wearer $wearerId resolved unfetched, falling back to generic")
            return DisconnectionUiState.Generic
        }

        return DisconnectionUiState.Ready(
            wearerName = wearer.name(),
            // `image` is ParseDelegate<ParseFile?> — declared nullable, so the delegate
            // returns null cleanly for a missing column; has() kept for house consistency.
            wearerImageUrl = if (wearer.has("image")) wearer.image?.url else null,
            lastSeenAt = wearer.lastCheckInAt(),
            position = resolvePosition(wearerId, wearer),
            phone = wearer.phone?.takeIf { it.isNotBlank() },
            // Gated on the same permission every other calling surface enforces
            // (WatchCardAdapter dims and blocks its call button on it). Reported rather
            // than folded into `phone` so the UI can say WHY the action is unavailable —
            // a silently dead button reads as the app being broken.
            callBlockedByPermission = !watchUserRepository.canCallWearer(wearerId)
        )
    }

    /**
     * The permission check comes FIRST, and deliberately so.
     *
     * `MainViewModel` nulls `lastKnownLocation` on the shared in-memory Wearer whenever the
     * user lacks location permission — but this screen re-resolves through Parse and can
     * bypass that mutation entirely. Without this gate a co-parent whose location sharing is
     * off could be shown the child's last position.
     *
     * Unknown permission hides the row rather than defaulting either way. Fail-open is right
     * for call and messages, where a cache miss must not hide a feature the user has; it is
     * wrong for a child's location. But "not shared with you" is also a claim, so unknown
     * renders as nothing at all.
     */
    private fun resolvePosition(wearerId: String, wearer: Wearer): PositionState {
        when (watchUserRepository.locationPermissionOrNull(wearerId)) {
            null -> return PositionState.Hidden
            false -> return PositionState.NotShared
            true -> Unit
        }

        // Both of these are declared nullable on Wearer, so a plain null check is genuinely
        // safe here — unlike accuracy, which is ParseDelegate<Int> declared non-null and
        // would need a has() guard. Accuracy is not read: it buys nothing on a row with no
        // map, and an unused guard is one a later cleanup deletes.
        val location = wearer.lastKnownLocation ?: return PositionState.NoneOnRecord
        val recordedAt = wearer.lastLocationTime ?: return PositionState.Undated

        return PositionState.Located(
            latitude = location.latitude,
            longitude = location.longitude,
            recordedAt = recordedAt
        )
    }
}
