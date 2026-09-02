package com.sosmartlabs.momotabletpadres.tablet

import android.app.Application
import android.widget.Toast
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.google.firebase.Firebase
import com.google.firebase.crashlytics.crashlytics
import com.parse.ParseCloud
import com.parse.ParseException
import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.TabletPresenceState
import com.sosmartlabs.momotabletpadres.tablet.ui.TabletViewModelBase
import com.sosmartlabs.momotabletpadres.utils.NewNetworkStateChecker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.*
import java.util.concurrent.TimeUnit
import javax.inject.Inject

@HiltViewModel
class TabletViewModel @Inject constructor(
    application: Application,
    private val tabletRepository: TabletRepository
) : TabletViewModelBase(application) {

    private val scopeIO = CoroutineScope(Dispatchers.IO)

    private val _currentTablet = MutableLiveData<Tablet>()
    val currentTablet: LiveData<Tablet> get() = _currentTablet

    private val _presence = MutableLiveData<TabletPresenceState>(TabletPresenceState.Loading)
    val presence: LiveData<TabletPresenceState> get() = _presence

    init {
        Timber.d("TabletViewModel: init")
    }

    override fun setCurrentTablet(tablet: Tablet) {
        super.setCurrentTablet(tablet)
        _currentTablet.postValue(tablet)
        Timber.d("TabletViewModel: Setting current tablet - ${tablet.objectId}")
    }

    /**
     * Re-fetches the current tablet from the backend and republishes it. The
     * kid-profile edit screen writes to a separate (activity-scoped)
     * KidProfileViewModel, so edits made there — photo, name, birthday — never
     * reach this view model's [currentTablet]. The main screen calls this on
     * resume so those changes show up when the user navigates back, instead of
     * staying stale until the activity is recreated. No-op until a tablet is set.
     */
    fun refreshCurrentTablet() {
        val objectId = currentTablet.value?.objectId ?: return
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                tabletRepository.getTabletByObjectId(objectId)
            }.onSuccess { fresh ->
                Timber.d("TabletViewModel: refreshed current tablet ${fresh.objectId}")
                _currentTablet.postValue(fresh)
            }.onFailure { e ->
                Timber.e(e, "TabletViewModel: failed to refresh current tablet")
            }
        }
    }

    fun supportsInAppPaymentBlock(tablet: Tablet): Boolean {
        val supports = tablet.appVersionCode!! >= 76
        Timber.d("TabletViewModel: Tablet ${tablet.objectId} supports in-app payment block: $supports")
        return supports
    }

    fun savePin(tablet: Tablet, currentPin: String, newPin: String) {
        Timber.d("TabletViewModel: Attempting to save new PIN for tablet ${tablet.objectId}")
        if (currentPin == tablet.pin) {
            scopeIO.launch {
                tablet.pin = newPin
                tabletRepository.update(tablet)
                Timber.d("TabletViewModel: Successfully updated PIN for tablet ${tablet.objectId}")
            }
        } else {
            Timber.w("TabletViewModel: Invalid current PIN provided for tablet ${tablet.objectId}")
            Toast.makeText(getApplication(), "Pin incorrecto", Toast.LENGTH_SHORT).show()
        }
    }

    fun recoverPin(mTablet: Tablet, email: String, callback: (ParseException?) -> Unit) {
        Timber.d("TabletViewModel: Initiating PIN recovery for tablet ${mTablet.objectId} with email $email")
        val parameters = HashMap<String, String>()
        parameters["objectId"] = mTablet.objectId!!
        parameters["email"] = email
        ParseCloud.callFunctionInBackground<ParseObject>("recoverPin", parameters) { _, error ->
            if (error != null) {
                Timber.e("TabletViewModel: PIN recovery failed for tablet ${mTablet.objectId}: ${error.message}")
                Firebase.crashlytics.recordException(error)
            } else {
                Timber.d("TabletViewModel: PIN recovery successful for tablet ${mTablet.objectId}")
            }
            callback(error)
        }
    }

    fun saveInAppPaymentEnabled(tablet: Tablet, isEnabled: Boolean) {
        Timber.d("TabletViewModel: Setting in-app payments to $isEnabled for tablet ${tablet.objectId}")
        scopeIO.launch {
            tablet.inAppPaymentsEnabled = isEnabled
            tabletRepository.update(tablet)
            Timber.d("TabletViewModel: Successfully updated in-app payment status for tablet ${tablet.objectId}")
        }
    }

    fun remoteBlock(isRemoteBlocked: Boolean, callback: (ParseException?) -> Unit) {
        Timber.d("TabletViewModel: Setting remote block to $isRemoteBlocked for tablet ${currentTablet.value?.objectId}")
        Firebase.crashlytics.log("Performing remote block")

        val parameters = HashMap<String, Any>()
        parameters["tabletId"] = currentTablet.value!!.objectId!!
        parameters["remoteBlockStatus"] = isRemoteBlocked

        ParseCloud.callFunctionInBackground<ParseObject>("remoteBlock_v2", parameters) { _, error ->
            if (error != null) {
                Timber.e("TabletViewModel: Remote block failed: ${error.message}")
                with(Firebase.crashlytics) {
                    log("Error on performing remote block")
                    recordException(error)
                }
            } else {
                Timber.d("TabletViewModel: Remote block successful")
                _currentTablet.postValue(currentTablet.value?.apply { remoteBlocked = isRemoteBlocked })
            }
            callback(error)
        }
    }

    /**
     * Fetches the tablet's connection status via the `getTabletPresence` cloud
     * function (Pushy presence) and posts a [TabletPresenceState]. When the
     * server reports presence is unavailable — or the call fails — falls back to
     * a 10-minute staleness check on `lastTKQ`. Mirrors the iOS parents app.
     *
     * Safe to call repeatedly (e.g. on screen re-entry); the backend caches
     * presence for ~5 min, so back-to-back calls don't hammer Pushy.
     */
    fun loadTabletPresence() {
        val tablet = currentTablet.value
        val tabletId = tablet?.objectId
        if (tablet == null || tabletId == null) {
            // Tablet not delivered yet (it's set via async postValue from the
            // activity). Stay in Loading rather than flashing Unknown — the
            // currentTablet observer re-triggers this once the tablet arrives.
            Timber.d("TabletViewModel: loadTabletPresence - tablet not ready yet, staying in Loading")
            return
        }

        // If the PARENT's phone is offline we can't reach the backend — that's
        // our connectivity, not the child's device. Show a neutral "no internet"
        // state instead of ever implying the tablet is disconnected.
        if (!NewNetworkStateChecker.isThereInternetConnection(getApplication())) {
            Timber.d("TabletViewModel: loadTabletPresence - parent device offline; showing NoInternet")
            _presence.postValue(TabletPresenceState.NoInternet)
            return
        }

        Timber.d("TabletViewModel: loadTabletPresence - fetching presence for $tabletId")
        val parameters = HashMap<String, Any>()
        parameters["tabletId"] = tabletId

        ParseCloud.callFunctionInBackground<Map<String, Any>>("getTabletPresence", parameters) { result, error ->
            if (error != null || result == null) {
                Timber.e(error, "TabletViewModel: getTabletPresence failed for $tabletId — falling back to local signal")
                error?.let { Firebase.crashlytics.recordException(it) }
                _presence.postValue(presenceFromLocalSignal(tablet))
                return@callFunctionInBackground
            }

            val available = result["available"] as? Boolean ?: false
            if (!available) {
                // The backend may still return a cached Pushy "last seen" even when
                // this live check failed. Prefer that (Pushy-accurate) over the local
                // device signal; only fall back to the local signal if it's absent.
                val cachedSeconds = (result["lastActive"] as? Number)?.toLong()
                if (cachedSeconds != null && cachedSeconds > 0) {
                    val battery = (result["batteryPercentage"] as? Number)?.toInt() ?: tablet.batteryPercentage
                    Timber.d("TabletViewModel: getTabletPresence unavailable (${result["reason"]}) — using cached lastActive")
                    _presence.postValue(TabletPresenceState.LastSeen(Date(cachedSeconds * 1000), battery))
                } else {
                    Timber.d("TabletViewModel: getTabletPresence unavailable (${result["reason"]}) — falling back to local signal")
                    _presence.postValue(presenceFromLocalSignal(tablet))
                }
                return@callFunctionInBackground
            }

            // Parse decodes JSON numbers loosely (Int/Double), so read via Number.
            val battery = (result["batteryPercentage"] as? Number)?.toInt() ?: tablet.batteryPercentage
            val online = result["online"] as? Boolean ?: false
            val state = if (online) {
                TabletPresenceState.Online(battery)
            } else {
                // Pushy says offline. Prefer the cloud's lastActive; otherwise
                // use our best device-authored timestamp so we can still show a
                // "last seen" instead of a bare "Disconnected".
                val lastActiveSeconds = (result["lastActive"] as? Number)?.toLong()
                val lastSeen = if (lastActiveSeconds != null && lastActiveSeconds > 0) {
                    Date(lastActiveSeconds * 1000)
                } else {
                    lastDeviceSignal(tablet)
                }
                if (lastSeen != null) {
                    TabletPresenceState.LastSeen(lastSeen, battery)
                } else {
                    TabletPresenceState.Disconnected
                }
            }
            Timber.d("TabletViewModel: getTabletPresence -> $state for $tabletId")
            _presence.postValue(state)
        }
    }

    /**
     * Fallback used when Pushy presence is unavailable: treat a device signal
     * within the last 10 minutes as online, otherwise show it as the last-seen
     * time. Returns [TabletPresenceState.Unknown] only when we have NO
     * device-authored signal at all — the UI presents that as a neutral state,
     * not as "Disconnected", to avoid a false alarm.
     */
    private fun presenceFromLocalSignal(tablet: Tablet?): TabletPresenceState {
        val lastSeen = lastDeviceSignal(tablet) ?: return TabletPresenceState.Unknown
        val staleAfterMs = TimeUnit.MINUTES.toMillis(10)
        return if (System.currentTimeMillis() - lastSeen.time <= staleAfterMs) {
            TabletPresenceState.Online(tablet?.batteryPercentage)
        } else {
            TabletPresenceState.LastSeen(lastSeen, tablet?.batteryPercentage)
        }
    }

    /**
     * Most recent device-authored activity timestamp. Combines the location
     * keep-alive ([Tablet.lastTKQ]) and the last location time
     * ([Tablet.currentLocationTime]). Deliberately excludes the row's
     * `updatedAt`, which also changes on parent-side writes (e.g. remote block)
     * and would falsely look like device activity.
     */
    private fun lastDeviceSignal(tablet: Tablet?): Date? {
        tablet ?: return null
        return listOfNotNull(tablet.lastTKQ, tablet.currentLocationTime).maxByOrNull { it.time }
    }

    fun enableBrowserBlock(isBrowserAllowed: Boolean, callback: (ParseException?) -> Unit) {
        currentTablet.value?.let { tablet ->
            Timber.d("TabletViewModel: Setting browser block to ${!isBrowserAllowed} for tablet ${tablet.objectId}")
            val isCurrentlyEnabled = tablet.browserAllowed
            scopeIO.launch {
                runCatching {
                    tabletRepository.update(tablet.apply {
                        browserAllowed = isBrowserAllowed
                    })
                }.onSuccess {
                    Timber.d("TabletViewModel: Successfully updated browser block status")
                    _currentTablet.postValue(tablet)
                    viewModelScope.launch {
                        callback(null)
                    }
                }.onFailure {
                    Timber.e("TabletViewModel: Failed to update browser block status: ${it.message}")
                    tablet.browserAllowed = isCurrentlyEnabled
                    _currentTablet.postValue(tablet)
                    if (it is ParseException) {
                        with(Firebase.crashlytics) {
                            log("Error on enabling/disabling browser block")
                            recordException(it)
                        }
                        viewModelScope.launch {
                            callback(it)
                        }
                    } else {
                        throw it
                    }
                }
            }
        }
    }

    fun setSmartDetectionSystemStatus(isEnabled: Boolean) {
        val tablet = currentTablet.value!!
        Timber.d("TabletViewModel: Setting smart detection system status to $isEnabled for tablet ${tablet.objectId}")
        val isCurrentlyEnabled = tablet.smartDetectionEnabled

        scopeIO.launch {
            runCatching {
                tablet.smartDetectionEnabled = isEnabled
                tabletRepository.update(tablet)
            }.onSuccess {
                Timber.d("TabletViewModel: Successfully updated smart detection system status")
                _currentTablet.postValue(tablet)
            }.onFailure {
                Timber.e("TabletViewModel: Failed to update smart detection system status: ${it.message}")
                tablet.smartDetectionEnabled = isCurrentlyEnabled
                _currentTablet.postValue(tablet)
                if (it is ParseException) {
                    with(Firebase.crashlytics) {
                        log("Error on enabling/disabling smart detection")
                        recordException(it)
                    }
                } else {
                    throw it
                }
            }
        }
    }

    fun setMoodDetectionSystemStatus(isEnabled: Boolean) {
        val tablet = currentTablet.value!!
        Timber.d("TabletViewModel: Setting mood detection status to $isEnabled for tablet ${tablet.objectId}")
        val isCurrentlyEnabled = tablet.moodDetectionEnabled

        scopeIO.launch {
            runCatching {
                tablet.moodDetectionEnabled = isEnabled
                tabletRepository.update(tablet)
            }.onSuccess {
                Timber.d("TabletViewModel: Successfully updated mood detection status")
                _currentTablet.postValue(tablet)
            }.onFailure {
                Timber.e("TabletViewModel: Failed to update mood detection status: ${it.message}")
                tablet.moodDetectionEnabled = isCurrentlyEnabled
                _currentTablet.postValue(tablet)
                if (it is ParseException) {
                    with(Firebase.crashlytics) {
                        log("Error on enabling/disabling mood detection")
                        recordException(it)
                    }
                } else {
                    throw it
                }
            }
        }
    }

    fun setProfanityDetectionSystemStatus(isEnabled: Boolean) {
        val tablet = currentTablet.value!!
        Timber.d("TabletViewModel: Setting profanity detection status to $isEnabled for tablet ${tablet.objectId}")
        val isCurrentlyEnabled = tablet.profanityDetectionEnabled

        scopeIO.launch {
            runCatching {
                tablet.profanityDetectionEnabled = isEnabled
                tabletRepository.update(tablet)
            }.onSuccess {
                Timber.d("TabletViewModel: Successfully updated profanity detection status")
                _currentTablet.postValue(tablet)
            }.onFailure {
                Timber.e("TabletViewModel: Failed to update profanity detection status: ${it.message}")
                tablet.profanityDetectionEnabled = isCurrentlyEnabled
                _currentTablet.postValue(tablet)
                if (it is ParseException) {
                    with(Firebase.crashlytics) {
                        log("Error on enabling/disabling profanity detection")
                        recordException(it)
                    }
                } else {
                    throw it
                }
            }
        }
    }

    fun setMusicDetectionSystemStatus(isEnabled: Boolean) {
        val tablet = currentTablet.value!!
        Timber.d("TabletViewModel: Setting music detection status to $isEnabled for tablet ${tablet.objectId}")
        val isCurrentlyEnabled = tablet.explicitMusicDetectionEnabled

        scopeIO.launch {
            runCatching {
                tablet.explicitMusicDetectionEnabled = isEnabled
                tabletRepository.update(tablet)
            }.onSuccess {
                Timber.d("TabletViewModel: Successfully updated music detection status")
                _currentTablet.postValue(tablet)
            }.onFailure {
                Timber.e("TabletViewModel: Failed to update music detection status: ${it.message}")
                tablet.explicitMusicDetectionEnabled = isCurrentlyEnabled
                _currentTablet.postValue(tablet)
                if (it is ParseException) {
                    with(Firebase.crashlytics) {
                        log("Error on enabling/disabling explicit music detection")
                        recordException(it)
                    }
                } else {
                    throw it
                }
            }
        }
    }

    fun setSearchDetectionSystemStatus(isEnabled: Boolean) {
        val tablet = currentTablet.value!!
        Timber.d("TabletViewModel: Setting search detection status to $isEnabled for tablet ${tablet.objectId}")
        val isCurrentlyEnabled = tablet.unsafeSearchDetectionEnabled

        scopeIO.launch {
            runCatching {
                tablet.unsafeSearchDetectionEnabled = isEnabled
                tabletRepository.update(tablet)
            }.onSuccess {
                Timber.d("TabletViewModel: Successfully updated search detection status")
                _currentTablet.postValue(tablet)
            }.onFailure {
                Timber.e("TabletViewModel: Failed to update search detection status: ${it.message}")
                tablet.unsafeSearchDetectionEnabled = isCurrentlyEnabled
                _currentTablet.postValue(tablet)
                if (it is ParseException) {
                    with(Firebase.crashlytics) {
                        log("Error on enabling/disabling unsafe search detection")
                        recordException(it)
                    }
                } else {
                    throw it
                }
            }
        }
    }

}