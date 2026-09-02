package com.sosmartlabs.momo.dispatch.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parse.ParseException
import com.parse.ParseUser
import com.sosmartlabs.momo.dispatch.model.GcmSenderKeysRepository
import com.sosmartlabs.momo.dispatch.model.ParseInstallationRepository
import com.sosmartlabs.momo.dispatch.model.TutorialPreferencesRepository
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.main.model.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

/**
 * ViewModel responsible for orchestrating the initialization process of the DispatchActivity.
 */
@HiltViewModel
class DispatchViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val tutorialPreferencesRepository: TutorialPreferencesRepository,
    private val userRepository: UserRepository,
    private val gcmSenderKeysRepository: GcmSenderKeysRepository,
    private val parseInstallationRepository: ParseInstallationRepository
) : ViewModel() {

    private val _dispatchResult = MutableLiveData<DispatchResult>()
    val dispatchResult: LiveData<DispatchResult> get() = _dispatchResult

    init {
        Timber.d("DispatchViewModel: init called, starting initialization process")
        initializeApp()
    }

    private fun initializeApp() {
        Timber.d("DispatchViewModel: initializeApp called")
        viewModelScope.launch(ioContext) {
            Timber.d("DispatchViewModel: Launching initialization coroutine")
            try {
                Timber.d("DispatchViewModel: Checking if first time opening app")
                val isFirstTimeOpeningApp = tutorialPreferencesRepository.isFirstTimeOpeningApp()
                if (isFirstTimeOpeningApp) {
                    Timber.i("DispatchViewModel: First time opening app detected, posting OPEN_FIRST_TIME result")
                    CrashlyticsLog.log("DispatchViewModel: First time opening app, posting OPEN_FIRST_TIME")
                    _dispatchResult.postValue(DispatchResult.OPEN_FIRST_TIME)
                    return@launch
                }
                Timber.d("DispatchViewModel: Not first time, setting up user environment")
                setupUserEnvironment()
            } catch (e: Exception) {
                Timber.e(e, "DispatchViewModel: Exception during initialization")
                CrashlyticsLog.recordNonFatalError(e, "DispatchViewModel: Exception during initializeApp")
                handleInitializationFailure(e)
            }
        }
    }

    private suspend fun setupUserEnvironment() {
        Timber.d("DispatchViewModel: setupUserEnvironment called")
        val user = try {
            Timber.d("DispatchViewModel: Getting current user from UserRepository")
            userRepository.getCurrentUser()
        } catch (e: Exception) {
            Timber.e(e, "DispatchViewModel: Error getting current user")
            CrashlyticsLog.recordNonFatalError(e, "DispatchViewModel: Error getting current user")
            null
        }

        if (user == null) {
            Timber.e("DispatchViewModel: No user found, posting USER_NULL")
            CrashlyticsLog.log("DispatchViewModel: No user found, posting USER_NULL")
            _dispatchResult.postValue(DispatchResult.USER_NULL)
            return
        }

        if (!user.isAuthenticated) {
            Timber.e("DispatchViewModel: User not authenticated, posting USER_NULL")
            CrashlyticsLog.log("DispatchViewModel: User not authenticated, posting USER_NULL")
            _dispatchResult.postValue(DispatchResult.USER_NULL)
            return
        }

        try {
            Timber.d("DispatchViewModel: Setting up ParseInstallation for user ${user.objectId}")
            parseInstallationRepository.setupCurrentInstallation(user, gcmSenderKeysRepository.gcmSenderKey)
        } catch (e: Exception) {
            Timber.e(e, "DispatchViewModel: Error setting up ParseInstallation")
            CrashlyticsLog.recordNonFatalError(e, "DispatchViewModel: Error setting up ParseInstallation")
            _dispatchResult.postValue(DispatchResult.LOGIN_ERROR)
            return
        }

        try {
            Timber.d("DispatchViewModel: Setting Crashlytics user id to ${user.objectId}")
            CrashlyticsLog.setUserId(user)
        } catch (e: Exception) {
            Timber.e(e, "DispatchViewModel: Error setting Crashlytics user id")
            CrashlyticsLog.recordNonFatalError(e, "DispatchViewModel: Error setting Crashlytics user id")
        }

        Timber.d("DispatchViewModel: Posting dispatch result based on user status (isNew=${user.isNew})")
        postDispatchResultBasedOnUser(user)
    }

    private fun postDispatchResultBasedOnUser(user: ParseUser) {
        if (user.isNew) {
            Timber.i("DispatchViewModel: User is new, posting NEW_USER")
            CrashlyticsLog.log("DispatchViewModel: User is new, posting NEW_USER")
            _dispatchResult.postValue(DispatchResult.NEW_USER)
        } else {
            Timber.i("DispatchViewModel: User is not new, posting START_MAIN")
            CrashlyticsLog.log("DispatchViewModel: User is not new, posting START_MAIN")
            _dispatchResult.postValue(DispatchResult.START_MAIN)
        }
    }

    private fun handleInitializationFailure(exception: Throwable) {
        Timber.e(exception, "DispatchViewModel: handleInitializationFailure called")
        CrashlyticsLog.recordNonFatalError(exception, "DispatchViewModel: handleInitializationFailure")
        viewModelScope.launch(ioContext) {
            val result = when (exception) {
                is ParseException -> {
                    Timber.e("DispatchViewModel: ParseException with code ${exception.code}")
                    handleParseException(exception)
                }
                else -> {
                    Timber.e("DispatchViewModel: Unknown exception, posting LOGIN_ERROR")
                    DispatchResult.LOGIN_ERROR
                }
            }
            Timber.d("DispatchViewModel: Posting dispatch result after failure: $result")
            _dispatchResult.postValue(result)
        }
    }

    private suspend fun handleParseException(e: ParseException): DispatchResult {
        return when (e.code) {
            ParseException.CONNECTION_FAILED -> {
                Timber.e("DispatchViewModel: ParseException CONNECTION_FAILED, posting CONNECTION_ERROR")
                CrashlyticsLog.log("DispatchViewModel: ParseException CONNECTION_FAILED, posting CONNECTION_ERROR")
                DispatchResult.CONNECTION_ERROR
            }
            ParseException.INVALID_SESSION_TOKEN -> {
                Timber.e("DispatchViewModel: ParseException INVALID_SESSION_TOKEN, logging out and posting SESSION_EXPIRED")
                CrashlyticsLog.log("DispatchViewModel: ParseException INVALID_SESSION_TOKEN, logging out and posting SESSION_EXPIRED")
                logout()
                DispatchResult.SESSION_EXPIRED
            }
            else -> {
                Timber.e("DispatchViewModel: ParseException code ${e.code}, posting LOGIN_ERROR")
                CrashlyticsLog.log("DispatchViewModel: ParseException code ${e.code}, posting LOGIN_ERROR")
                DispatchResult.LOGIN_ERROR
            }
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    private suspend fun logout() {
        Timber.d("DispatchViewModel: logout called, logging out current user")
        try {
            userRepository.logout()
            Timber.d("DispatchViewModel: UserRepository.logout() successful")
        } catch (e: Exception) {
            Timber.e(e, "DispatchViewModel: Error during UserRepository.logout()")
            CrashlyticsLog.recordNonFatalError(e, "DispatchViewModel: Error during UserRepository.logout()")
        }
        try {
            parseInstallationRepository.removeUserFromInstallation()
            Timber.d("DispatchViewModel: parseInstallationRepository.removeUserFromInstallation() successful")
        } catch (e: Exception) {
            Timber.e(e, "DispatchViewModel: Error during removeUserFromInstallation()")
            CrashlyticsLog.recordNonFatalError(e, "DispatchViewModel: Error during removeUserFromInstallation()")
        }
    }
}
