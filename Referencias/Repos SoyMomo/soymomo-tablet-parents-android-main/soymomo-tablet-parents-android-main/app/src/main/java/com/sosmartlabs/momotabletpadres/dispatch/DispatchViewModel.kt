package com.sosmartlabs.momotabletpadres.dispatch

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.parse.ParseException
import com.sosmartlabs.momotabletpadres.dispatch.model.DispatchResult
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.models.entity.UserEntity
import com.sosmartlabs.momotabletpadres.dispatch.repository.FcmRepository
import com.sosmartlabs.momotabletpadres.dispatch.repository.GcmSenderKeyRepository
import com.sosmartlabs.momotabletpadres.dispatch.repository.ParseConfigRepository
import com.sosmartlabs.momotabletpadres.dispatch.repository.ParseInstallationRepository
import com.sosmartlabs.momotabletpadres.dispatch.repository.SharedPreferencesRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.security.DeviceKeyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * ViewModel for DispatchActivity
 */
@ExperimentalCoroutinesApi
@HiltViewModel
class DispatchViewModel @Inject constructor(
    application: Application,
    private val fcmRepository: FcmRepository,
    private val gcmSenderKeyRepository: GcmSenderKeyRepository,
    private val parseInstallationRepository: ParseInstallationRepository,
    private val parseConfigRepository: ParseConfigRepository,
    private val userRepository: UserRepository,
    private val sharedPreferencesRepository: SharedPreferencesRepository,
    private val deviceKeyRepository: DeviceKeyRepository
) : AndroidViewModel(application) {

    /**
     * LiveData for posting app initialization result.
     * Must be called through [dispatchResult] public getter.
     */
    private val _dispatchResult = MutableLiveData<DispatchResult>()

    /**
     * LiveData for app initialization result.
     */
    val dispatchResult: LiveData<DispatchResult> get() = _dispatchResult

    init {
        Timber.d("DispatchViewModel: init - Initializing DispatchViewModel")

        initializeApp()
    }

    private fun redact(value: String?, keepLast: Int = 4): String {
        if (value.isNullOrEmpty()) return "<empty>"
        if (value.length <= keepLast) return "***"
        return "***${value.takeLast(keepLast)}"
    }

    private fun getBuildModel(): String {
        val model = android.os.Build.MODEL
        Timber.d("DispatchViewModel: getBuildModel - Device model is $model")
        CrashlyticsLog.log("DispatchViewModel: getBuildModel - Device model is $model")
        
        return model
    }

    private fun checkIfBuildModelIsFromSoyMomo(model: String): Boolean {
        val isSoyMomoModel = model in arrayOf(
            "SoyMomo_Pro_V2", "SoyMomo_Pro_V2_24", "SoyMomo_Pro_V1",
            "SoyMomo_Lite_V2", "SoyMomoLite_V2C",
            "SoyMomo_Lite_V1", "SoyMomo_Lite_V3",
            "SoyMomo_Lite_V3_EEA", "SoyMomo_Pro_EU_V1",
            "S8-RK3368"
        )

        // Check if the package "com.sosmartlabs.momotablet" is installed
        val isTabletAppInstalled = try {
            val pm = getApplication<Application>().packageManager
            pm.getPackageInfo("com.sosmartlabs.momotablet", 0)
            true
        } catch (e: Exception) {
            Timber.w("DispatchViewModel: checkIfBuildModelIsFromSoyMomo - Exception while checking package: ${e.message}")
            CrashlyticsLog.log("DispatchViewModel: checkIfBuildModelIsFromSoyMomo - Exception while checking package: ${e.message}")
            false
        }

        val result = isSoyMomoModel || isTabletAppInstalled
        Timber.d("DispatchViewModel: checkIfBuildModelIsFromSoyMomo - Device is SoyMomo tablet: $result (modelMatch=$isSoyMomoModel, tabletAppInstalled=$isTabletAppInstalled)")
        CrashlyticsLog.log("DispatchViewModel: checkIfBuildModelIsFromSoyMomo - Device is SoyMomo tablet: $result (modelMatch=$isSoyMomoModel, tabletAppInstalled=$isTabletAppInstalled)")
        return result
    }

    /**
     * Initializes the app.
     */
    @ExperimentalCoroutinesApi
    private fun initializeApp() {
        Timber.d("DispatchViewModel: initializeApp - Starting app initialization")
        CrashlyticsLog.log("DispatchViewModel: initializeApp - Starting app initialization")        
        viewModelScope.launch(Dispatchers.IO) {
            Timber.d("DispatchViewModel: initializeApp - Launching initialization coroutine")
            CrashlyticsLog.log("DispatchViewModel: initializeApp - Launching initialization coroutine")            
            val model = getBuildModel()
            Timber.d("DispatchViewModel: initializeApp - Checking if device is SoyMomo tablet")            
            if (checkIfBuildModelIsFromSoyMomo(model)) {
                Timber.d("DispatchViewModel: initializeApp - Detected SoyMomo tablet, blocking access")
                CrashlyticsLog.log("DispatchViewModel: initializeApp - Detected SoyMomo tablet, blocking access")                
                _dispatchResult.postValue(DispatchResult.IS_TABLET)
                return@launch
            }

            var user: UserEntity? = null
            lateinit var fcmToken: String
            lateinit var gcmSenderId: String

            runCatching {
                Timber.d("DispatchViewModel: initializeApp - Getting FCM token")
                CrashlyticsLog.log("DispatchViewModel: initializeApp - Getting FCM token")                
                fcmToken = fcmRepository.getMessagingToken()
                Timber.d("DispatchViewModel: initializeApp - Got FCM token: ${redact(fcmToken)}")
                CrashlyticsLog.log("DispatchViewModel: initializeApp - Got FCM token: ${redact(fcmToken)}")                

                Timber.d("DispatchViewModel: initializeApp - Getting GCM sender ID")
                CrashlyticsLog.log("DispatchViewModel: initializeApp - Getting GCM sender ID")                
                gcmSenderId = gcmSenderKeyRepository.gcmSenderKey
                Timber.d("DispatchViewModel: initializeApp - Got GCM sender ID: $gcmSenderId")
                CrashlyticsLog.log("DispatchViewModel: initializeApp - Got GCM sender ID: $gcmSenderId")                

                Timber.d("DispatchViewModel: initializeApp - Fetching Parse config")
                CrashlyticsLog.log("DispatchViewModel: initializeApp - Fetching Parse config")                
                parseConfigRepository.getParseConfig()
                Timber.d("DispatchViewModel: initializeApp - Parse config fetched")
                CrashlyticsLog.log("DispatchViewModel: initializeApp - Parse config fetched")                

                Timber.d("DispatchViewModel: initializeApp - Getting current user")
                CrashlyticsLog.log("DispatchViewModel: initializeApp - Getting current user")                
                user = userRepository.getCurrentUser()
                Timber.d("DispatchViewModel: initializeApp - Current user: ${user?.id ?: "null"}")
                CrashlyticsLog.log("DispatchViewModel: initializeApp - Current user: ${user?.id ?: "null"}")                
            }.onSuccess {
                if (user != null) {
                    Timber.d("DispatchViewModel: initializeApp - Setting Crashlytics user ID: ${user.id}")
                    CrashlyticsLog.log("DispatchViewModel: initializeApp - Setting Crashlytics user ID: ${user.id}")
                    CrashlyticsLog.setUserId(user.id)
                } else {
                    Timber.w("DispatchViewModel: initializeApp - User is null, cannot set Crashlytics user ID")
                    CrashlyticsLog.log("DispatchViewModel: initializeApp - User is null, cannot set Crashlytics user ID")
                }

                val result = when {
                    sharedPreferencesRepository.isFirstTimeOpeningApp() -> {
                        Timber.d("DispatchViewModel: initializeApp - First time app launch detected")
                        CrashlyticsLog.log("DispatchViewModel: initializeApp - First time app launch detected")
                        DispatchResult.OPEN_FIRST_TIME
                    }
                    user == null || !userRepository.isCurrentUserAuthenticated() -> {
                        Timber.d("DispatchViewModel: initializeApp - No authenticated user found")
                        CrashlyticsLog.log("DispatchViewModel: initializeApp - No authenticated user found")
                        DispatchResult.USER_NULL
                    }
                    else -> {
                        Timber.d("DispatchViewModel: initializeApp - User authenticated")
                        CrashlyticsLog.log("DispatchViewModel: initializeApp - User authenticated")
                        DispatchResult.START_MAIN
                    }
                }
                Timber.d("DispatchViewModel: initializeApp - Posting dispatch result: $result")
                CrashlyticsLog.log("DispatchViewModel: initializeApp - Posting dispatch result: $result")                
                _dispatchResult.postValue(result)

                // Sync device keys for linked tablets when user is authenticated
                if (result == DispatchResult.START_MAIN) {
                    runCatching {
                        Timber.d("DispatchViewModel: initializeApp - Syncing device keys for linked tablets")
                        deviceKeyRepository.syncKeysForLinkedTablets()
                    }.onFailure { e ->
                        Timber.w(e, "DispatchViewModel: initializeApp - Failed to sync device keys")
                    }
                }

                runCatching {
                    Timber.d("DispatchViewModel: initializeApp - Setting up Parse installation")
                    CrashlyticsLog.log("DispatchViewModel: initializeApp - Setting up Parse installation")
                    parseInstallationRepository.setupCurrentInstallation(
                        fcmToken,
                        gcmSenderId,
                        userRepository.getCurrentParseUser()
                    )
                    Timber.d("DispatchViewModel: initializeApp - Parse installation setup complete")
                    CrashlyticsLog.log("DispatchViewModel: initializeApp - Parse installation setup complete")
                }.onFailure { e ->
                    Timber.e("DispatchViewModel: initializeApp - Failed to setup Parse installation: ${e.message}")
                    CrashlyticsLog.recordNonFatalError(e, "DispatchViewModel: Error on setup current installation")
                }
            }.onFailure { throwable ->
                val result = when (throwable) {
                    is ParseException -> {
                        when (throwable.code) {
                            ParseException.CONNECTION_FAILED -> {
                                Timber.e("DispatchViewModel: initializeApp - Connection failed (ParseException.CONNECTION_FAILED)")
                                CrashlyticsLog.log("DispatchViewModel: initializeApp - Connection failed (ParseException.CONNECTION_FAILED)")
                                DispatchResult.CONNECTION_ERROR
                            }
                            ParseException.INVALID_SESSION_TOKEN -> {
                                Timber.e("DispatchViewModel: initializeApp - Invalid session token, logging out (ParseException.INVALID_SESSION_TOKEN)")
                                CrashlyticsLog.log("DispatchViewModel: initializeApp - Invalid session token, logging out (ParseException.INVALID_SESSION_TOKEN)")
                                userRepository.logout()
                                DispatchResult.SESSION_EXPIRED
                            }
                            else -> {
                                Timber.e("DispatchViewModel: initializeApp - Login error (ParseException code: ${throwable.code})")
                                CrashlyticsLog.log("DispatchViewModel: initializeApp - Login error (ParseException code: ${throwable.code})")
                                DispatchResult.LOGIN_ERROR
                            }
                        }
                    }
                    else -> {
                        Timber.e("DispatchViewModel: initializeApp - Unexpected login error: ${throwable::class.java.simpleName}")
                        CrashlyticsLog.log("DispatchViewModel: initializeApp - Unexpected login error: ${throwable::class.java.simpleName}")
                        DispatchResult.LOGIN_ERROR
                    }
                }
                Timber.d("DispatchViewModel: initializeApp - Posting dispatch result after failure: $result")
                CrashlyticsLog.log("DispatchViewModel: initializeApp - Posting dispatch result after failure: $result")
                Timber.e("DispatchViewModel: initializeApp - App initialization failed: ${throwable.message}")
                CrashlyticsLog.recordNonFatalError(throwable, "DispatchViewModel: Error on initializing app")                
                _dispatchResult.postValue(result)
            }
        }
    }
}