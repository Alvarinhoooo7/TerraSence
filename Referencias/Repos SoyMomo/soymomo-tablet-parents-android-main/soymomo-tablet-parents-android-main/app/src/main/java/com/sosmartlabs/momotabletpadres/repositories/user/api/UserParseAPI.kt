package com.sosmartlabs.momotabletpadres.repositories.user.api

import com.parse.ParseException
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.models.entity.UserEntity
import com.sosmartlabs.momotabletpadres.models.mapper.UserToEntityMapper
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.suspendCancellableCoroutine
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resumeWithException

@Singleton
class UserParseAPI @Inject constructor(private val mapper: UserToEntityMapper) {

    /**
     * Obtains the current user as [UserEntity] from [ParseUser].
     */
    fun getCurrentUser(): UserEntity? {
        Timber.d("UserParseAPI: Attempting to obtain current user as UserEntity")
        CrashlyticsLog.log("UserParseAPI: Attempting to obtain current user as UserEntity")
        val mUser = getCurrentParseUser()
        if (mUser == null) {
            Timber.w("UserParseAPI: Current ParseUser is null, cannot map to UserEntity")
            CrashlyticsLog.log("UserParseAPI: Current ParseUser is null, cannot map to UserEntity")
            return null
        }
        return try {
            val userEntity = mapper.transform(mUser)
            Timber.d("UserParseAPI: Successfully mapped ParseUser to UserEntity: $userEntity")
            CrashlyticsLog.log("UserParseAPI: Successfully mapped ParseUser to UserEntity")
            userEntity
        } catch (e: Exception) {
            Timber.e(e, "UserParseAPI: Error mapping ParseUser to UserEntity")
            CrashlyticsLog.recordNonFatalError(e, "UserParseAPI: Error mapping ParseUser to UserEntity")
            null
        }
    }

    /**
     * Obtains the current [ParseUser].
     */
    fun getCurrentParseUser(): ParseUser? {
        Timber.d("UserParseAPI: Attempting to obtain current ParseUser")
        CrashlyticsLog.log("UserParseAPI: Attempting to obtain current ParseUser")
        val mUser = ParseUser.getCurrentUser()
        if (mUser == null) {
            Timber.w("UserParseAPI: ParseUser.getCurrentUser() returned null")
            CrashlyticsLog.log("UserParseAPI: ParseUser.getCurrentUser() returned null")
        } else {
            Timber.d("UserParseAPI: Successfully obtained current ParseUser: $mUser")
            CrashlyticsLog.log("UserParseAPI: Successfully obtained current ParseUser")
        }
        return mUser
    }

    /**
     * Logs out the current user asynchronously.
     */
    @ExperimentalCoroutinesApi
    suspend fun logout() = suspendCancellableCoroutine<Unit> { continuation ->
        Timber.d("UserParseAPI: Attempting to log out current user")
        CrashlyticsLog.log("UserParseAPI: Attempting to log out current user")
        ParseUser.logOutInBackground { exception ->
            if (exception != null && exception.code != ParseException.INVALID_SESSION_TOKEN) {
                Timber.e(exception, "UserParseAPI: Error logging out current user")
                CrashlyticsLog.recordNonFatalError(exception, "UserParseAPI: Error logging out current user")
                continuation.resumeWithException(exception)
            } else {
                Timber.d("UserParseAPI: Successfully logged out current user")
                CrashlyticsLog.log("UserParseAPI: Successfully logged out current user")
                if (continuation.isActive) {
                    continuation.resume(Unit) { throwable ->
                        Timber.e(throwable, "UserParseAPI: Error resuming continuation after logout")
                        CrashlyticsLog.recordNonFatalError(throwable, "UserParseAPI: Error resuming continuation after logout")
                    }
                }
            }
        }

        continuation.invokeOnCancellation {
            Timber.w("UserParseAPI: Logout coroutine was cancelled")
            CrashlyticsLog.log("UserParseAPI: Logout coroutine was cancelled")
        }
    }
}