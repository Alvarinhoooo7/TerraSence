package com.sosmartlabs.momo.firebase

import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.parse.ParseUser

/**
 * Helper for sending non-fatal error reports to Crashlytics
 */
object CrashlyticsLog {

    /**
     * Records the user ID on Crashlytics
     */
    fun setUserId(user: ParseUser) = Firebase.crashlytics.setUserId(user.objectId)

    /**
     * Logs a text on Crashlytics
     */
    fun log(log: String) = Firebase.crashlytics.log(log)

    /**
     * Records a non-fatal error on Crashlytics
     */
    fun recordNonFatalError(error:  Throwable, log: String) {
        with(Firebase.crashlytics) {
            this.log(log)
            recordException(error)
        }
    }
}