package com.sosmartlabs.momotabletpadres.repositories.user

import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.models.entity.UserEntity
import com.sosmartlabs.momotabletpadres.repositories.user.api.UserParseAPI
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * UserRepository handles user-related operations and logging.
 */
@Singleton
class UserRepository @Inject constructor(
    private val userParseAPI: UserParseAPI
) {

    /**
     * Obtains the current user.
     * @return current user
     */
    fun getCurrentUser(): UserEntity? {
        Timber.d("UserRepository: Attempting to obtain current user")
        CrashlyticsLog.log("UserRepository: Attempting to obtain current user")
        val user = userParseAPI.getCurrentUser()
        if (user == null) {
            Timber.w("UserRepository: Current user is null")
            CrashlyticsLog.log("UserRepository: Current user is null")
        } else {
            Timber.d("UserRepository: Successfully obtained current user")
            CrashlyticsLog.log("UserRepository: Successfully obtained current user")
        }
        return user
    }

    /**
     * Obtains the current Parse user.
     * @return current Parse user
     */
    fun getCurrentParseUser(): ParseUser? {
        Timber.d("UserRepository: Attempting to obtain current Parse user")
        CrashlyticsLog.log("UserRepository: Attempting to obtain current Parse user")
        val parseUser = userParseAPI.getCurrentParseUser()
        if (parseUser == null) {
            Timber.w("UserRepository: Current Parse user is null")
            CrashlyticsLog.log("UserRepository: Current Parse user is null")
        } else {
            Timber.d("UserRepository: Successfully obtained current Parse user")
            CrashlyticsLog.log("UserRepository: Successfully obtained current Parse user")
        }
        return parseUser
    }

    /**
     * Determines if current user is authenticated.
     * @return True if user is authenticated, false otherwise
     */
    fun isCurrentUserAuthenticated(): Boolean {
        Timber.d("UserRepository: Checking if current user is authenticated")
        CrashlyticsLog.log("UserRepository: Checking if current user is authenticated")
        val parseUser = userParseAPI.getCurrentParseUser()
        val isAuthenticated = parseUser?.isAuthenticated ?: false
        if (parseUser == null) {
            Timber.w("UserRepository: Cannot check authentication, current Parse user is null")
            CrashlyticsLog.log("UserRepository: Cannot check authentication, current Parse user is null")
        } else {
            Timber.d("UserRepository: Current user authentication status: $isAuthenticated")
            CrashlyticsLog.log("UserRepository: Current user authentication status: $isAuthenticated")
        }
        return isAuthenticated
    }

    /**
     * Log out the current user.
     */
    @ExperimentalCoroutinesApi
    suspend fun logout() {
        Timber.d("UserRepository: Attempting to log out current user")
        CrashlyticsLog.log("UserRepository: Attempting to log out current user")
        try {
            userParseAPI.logout()
            Timber.d("UserRepository: Successfully logged out current user")
            CrashlyticsLog.log("UserRepository: Successfully logged out current user")
        } catch (e: Exception) {
            Timber.e(e, "UserRepository: Error logging out current user")
            CrashlyticsLog.recordNonFatalError(e, "UserRepository: Error logging out current user")
            throw e
        }
    }
}
