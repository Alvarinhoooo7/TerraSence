package com.sosmartlabs.momo.dispatch.model

import android.content.Context
import com.sosmartlabs.momo.utils.Constants
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

/**
 * Repository for obtaining tutorial preferences
 * @param context Context for obtaining access to SharedPreferences
 */
class TutorialPreferencesRepository @Inject constructor(@ApplicationContext context: Context) {

    /**
     * Shared preferences for accessing data
     */
    private val preferences = context.getSharedPreferences(Constants.TUTORIAL_PREFS, 0)

    /**
     * Detects of is first time the user is opening the app
     * @return True if the user is opening the app for the first time, fslse otherwise.
     */
    fun isFirstTimeOpeningApp() = preferences.getBoolean(Constants.FIRST_TIME_OPEN, true)
}