package com.sosmartlabs.momotabletpadres.main.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import com.google.firebase.Firebase
import com.google.firebase.crashlytics.crashlytics
import com.parse.ParseException
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.models.LoginStatus
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.security.DeviceKeyRepository
import com.sosmartlabs.momotabletpadres.sim.model.Subscription
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionStatus
import com.sosmartlabs.momotabletpadres.sim.repository.SubscriptionRepository
import com.sosmartlabs.momotabletpadres.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@ExperimentalCoroutinesApi
@HiltViewModel
class MainViewModel @Inject constructor(
    application: Application,
    private val ioContext: CoroutineContext,
    private val tabletRepository: TabletRepository,
    private val userRepository: UserRepository,
    private val subscriptionRepository: SubscriptionRepository,
    private val deviceKeyRepository: DeviceKeyRepository,
    private val savedStateHandle: SavedStateHandle
) : AndroidViewModel(application) {

    /**
     * objectId of the tablet the user has selected on the main screen. Kept in
     * [SavedStateHandle] so the selection survives configuration changes AND
     * process death; MainActivity restores the selection by this identity on
     * every list load. Null means "nothing selected yet" (falls back to the
     * first tablet).
     */
    var selectedTabletId: String?
        get() = savedStateHandle[KEY_SELECTED_TABLET_ID]
        set(value) { savedStateHandle[KEY_SELECTED_TABLET_ID] = value }

    private val _loginStatus = MutableLiveData(LoginStatus.LOGGED_IN)
    val loginStatus: LiveData<LoginStatus> get() = _loginStatus

    private var _subscriptionList = MutableLiveData<Resource<MutableList<Subscription>, Resource.Status>>()
    val subscriptionList: LiveData<Resource<MutableList<Subscription>, Resource.Status>>
        get() = _subscriptionList

    val tabletList = MutableLiveData<List<Tablet>>()

    /** True when a tablet-list load failed (non-auth). Lets the UI show a retry
     *  instead of an infinite loading skeleton. */
    private val _tabletLoadFailed = MutableLiveData<Boolean>()
    val tabletLoadFailed: LiveData<Boolean> get() = _tabletLoadFailed

    fun getTabletsByUser(parseUser: ParseUser) {
        Timber.d("MainViewModel: Getting tablets for user: ${parseUser.objectId}")
        Firebase.crashlytics.log("Get tablets by user")
        
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                tabletRepository.getTabletListByUser(parseUser)
            }.onSuccess { tablets ->
                Timber.d("MainViewModel: Successfully retrieved ${tablets.size} tablets")
                tabletList.postValue(tablets)
                getSubscriptions(tablets)
            }.onFailure {
                Timber.e("MainViewModel: Failed to get tablets: ${it.message}")
                CrashlyticsLog.recordNonFatalError(it, "Error on getting tablets by user")
                viewModelScope.launch(Dispatchers.Main) {
                    if (it is ParseException && it.code == ParseException.INVALID_SESSION_TOKEN) {
                        logout(true)
                    }
                }
            }
        }
    }

    fun getTabletsByUserV2(parseUser: ParseUser) {
        Timber.d("MainViewModel: Getting tablets V2 for user: ${parseUser.objectId}")
        Firebase.crashlytics.log("Get tablets by user")
        _tabletLoadFailed.postValue(false)

        viewModelScope.launch(Dispatchers.IO) {
            lateinit var tablets: List<Tablet>
            runCatching {
                tablets = tabletRepository.getTabletListByUser(parseUser)
            }.onSuccess {
                Timber.d("MainViewModel: Successfully retrieved ${tablets.size} tablets")
                tabletList.postValue(tablets)
                getSubscriptions(tablets)
            }.onFailure {
                Timber.e("MainViewModel: Failed to get tablets V2: ${it.message}")
                CrashlyticsLog.recordNonFatalError(it, "Error on getting tablets by user")
                if (it is ParseException && it.code == ParseException.INVALID_SESSION_TOKEN) {
                    // Session died (revoked / password change elsewhere): force a
                    // logout so the app routes back to login instead of hanging.
                    logout(true)
                } else {
                    // Transient failure: surface a retry instead of an endless skeleton.
                    _tabletLoadFailed.postValue(true)
                }
            }
        }
    }

    fun logout(forced: Boolean = false) {
        Timber.d("MainViewModel: Logging out user. Forced: $forced")
        _loginStatus.postValue(if (!forced) LoginStatus.LOGGING_OUT else LoginStatus.LOGGING_OUT_INVALID_TOKEN)
        
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                // Clear all device keys before logging out for security
                deviceKeyRepository.clearAllKeys()
                userRepository.logout()
            }.onSuccess {
                Timber.d("MainViewModel: Successfully logged out user")
                _loginStatus.postValue(LoginStatus.LOGGED_OUT)
            }.onFailure {
                Timber.e("MainViewModel: Failed to logout: ${it.message}")
                CrashlyticsLog.recordNonFatalError(it, "Error on logging out tablet")
                _loginStatus.postValue(LoginStatus.LOGOUT_ERROR)
            }
        }
    }

    private fun getSubscriptions(tablets: List<Tablet>) {
        Timber.d("SettingsAppViewModel: getSubscriptions() called for ${tablets.size} tablets")
        _subscriptionList.postValue(Resource(status = Resource.Status.LOADING))

        viewModelScope.launch(ioContext) {
            runCatching {
                Timber.d("SettingsAppViewModel: Filtering tablets with valid IMEIs")

                // Fetch subscriptions using tablets (repository extracts IMEIs and filters by subscriber)
                subscriptionRepository.getSubscriptions(tablets)
            }.onSuccess { subscriptions ->
                val activeSubscriptions = subscriptions.filter {
                    val status = it.getSubscriptionStatus()
                    status == SubscriptionStatus.ACTIVE || status == SubscriptionStatus.PREACTIVATED
                }
                Timber.i("SettingsAppViewModel: Loaded ${activeSubscriptions.size} active/pre-activated subscriptions")
                _subscriptionList.postValue(
                    Resource(
                        status = Resource.Status.LOAD_SUCCESS,
                        data = activeSubscriptions.toMutableList()
                    )
                )
            }.onFailure { e ->
                Timber.e(e, "SettingsAppViewModel: Error loading subscriptions for tablets")
                CrashlyticsLog.recordNonFatalError(e, "SettingsAppViewModel: Error in getSubscriptions")
                _subscriptionList.postValue(Resource(status = Resource.Status.LOAD_ERROR))
            }
        }
    }

    companion object {
        private const val KEY_SELECTED_TABLET_ID = "selected_tablet_id"
    }

}