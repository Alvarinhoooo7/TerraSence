package com.sosmartlabs.momotabletpadres.dispatch.repository

import android.content.Context
import com.sosmartlabs.momotabletpadres.utils.Constants
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for obtaining shared preferences
 * @param context Context for obtaining access to SharedPreferences
 */
@Singleton
class SharedPreferencesRepository @Inject constructor(
    @ApplicationContext context: Context
) {

    /**
     * Shared preferences for accessing data
     */
    private val preferences = context.getSharedPreferences(Constants.SP_SHAREDPREFERENCES_NAME, 0)

    /**
     * Detects if it is the first time the user is opening the app
     * @return True if the user is opening the app for the first time, false otherwise.
     */
    fun isFirstTimeOpeningApp(): Boolean {
        Timber.d("SharedPreferencesRepository: Checking if this is the first time opening the app")
        CrashlyticsLog.log("SharedPreferencesRepository: Checking if this is the first time opening the app")
        val result: Boolean
        try {
            result = preferences.getBoolean(Constants.FIRST_TIME_OPEN, true)
            Timber.d("SharedPreferencesRepository: isFirstTimeOpeningApp result: $result")
            CrashlyticsLog.log("SharedPreferencesRepository: isFirstTimeOpeningApp result: $result")
        } catch (e: Exception) {
            Timber.e(e, "SharedPreferencesRepository: Error reading FIRST_TIME_OPEN from SharedPreferences")
            CrashlyticsLog.recordNonFatalError(e, "SharedPreferencesRepository: Error reading FIRST_TIME_OPEN from SharedPreferences")
            // Fallback to true if error occurs
            return true
        }
        return result
    }
}