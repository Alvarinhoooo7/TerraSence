package com.sosmartlabs.momotabletpadres.utils.firebase

import com.google.firebase.Firebase
import com.google.firebase.crashlytics.crashlytics
import com.parse.ParseUser

/**
 * Helper for sending non-fatal error reports to Crashlytics
 */
object CrashlyticsLog {

    /**
     * Records the user ID on Crashlytics
     */
    fun setUserId(userId: String) = Firebase.crashlytics.setUserId(userId)

    /**
     * Records a non-fatal error on Crashlytics
     * @param error [Throwable] error to log
     * @param log Message log for adding extra information to error
     */
    fun recordNonFatalError(error:  Throwable, log: String) {
        with(Firebase.crashlytics) {
            this.log(log)
            recordException(error)
        }
    }

    /**
     * Records a exception error on Crashlytics
     * @param error [Exception] error to log
     * @param log Message log for adding extra information to error
     */
    fun recordException(error:  Exception, log: String) {
        with(Firebase.crashlytics) {
            this.log(log)
            recordException(error)
        }
    }

    /**
     * Log a message on Crashlytics
     * @param message Message to log
     */
    fun log(message: String) {
        Firebase.crashlytics.log(message)
    }
}