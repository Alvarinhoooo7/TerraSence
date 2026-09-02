package com.sosmartlabs.momotabletpadres.dispatch.repository

import com.parse.ParseInstallation
import com.parse.ParseUser
import com.parse.coroutines.suspendSave
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ParseInstallationRepository @Inject constructor() {

    /**
     * Sets up the current ParseInstallation with FCM token, GCM sender ID, and user.
     */
    suspend fun setupCurrentInstallation(
        fcmToken: String,
        gcmSenderId: String,
        user: ParseUser?
    ) {
        Timber.d("ParseInstallationRepository: Starting setupCurrentInstallation")
        CrashlyticsLog.log("ParseInstallationRepository: Starting setupCurrentInstallation")

        val installation = ParseInstallation.getCurrentInstallation()
        Timber.d("ParseInstallationRepository: Obtained current ParseInstallation: $installation")
        CrashlyticsLog.log("ParseInstallationRepository: Obtained current ParseInstallation")

        if (installation.pushType == null) {
            Timber.d("ParseInstallationRepository: Setting pushType to 'gcm'")
            CrashlyticsLog.log("ParseInstallationRepository: Setting pushType to 'gcm'")
            installation.pushType = "gcm"
        } else {
            Timber.d("ParseInstallationRepository: pushType already set: ${installation.pushType}")
        }

        if (installation.deviceToken == null) {
            Timber.d("ParseInstallationRepository: Setting deviceToken to provided FCM token")
            CrashlyticsLog.log("ParseInstallationRepository: Setting deviceToken to provided FCM token")
            installation.deviceToken = fcmToken
        } else {
            Timber.d("ParseInstallationRepository: deviceToken already set: ${installation.deviceToken}")
        }

        if (installation.get("GCMSenderId") == null) {
            Timber.d("ParseInstallationRepository: Setting GCMSenderId to $gcmSenderId")
            CrashlyticsLog.log("ParseInstallationRepository: Setting GCMSenderId to $gcmSenderId")
            installation.put("GCMSenderId", gcmSenderId)
        } else {
            Timber.d("ParseInstallationRepository: GCMSenderId already set: ${installation.get("GCMSenderId")}")
        }

        if (user != null) {
            Timber.d("ParseInstallationRepository: Associating installation with user: ${user.objectId}")
            CrashlyticsLog.log("ParseInstallationRepository: Associating installation with user: ${user.objectId}")
            installation.put("user", user)
        } else {
            Timber.d("ParseInstallationRepository: No user provided, skipping user association")
        }

        try {
            installation.suspendSave()
            Timber.d("ParseInstallationRepository: Successfully saved installation")
            CrashlyticsLog.log("ParseInstallationRepository: Successfully saved installation")
        } catch (e: Exception) {
            Timber.e(e, "ParseInstallationRepository: Error saving installation")
            CrashlyticsLog.recordNonFatalError(e, "ParseInstallationRepository: Error saving installation")
            throw e
        }
    }

    /**
     * Removes the user from the current ParseInstallation.
     */
    suspend fun removeUserFromInstallation() {
        Timber.d("ParseInstallationRepository: Starting removeUserFromInstallation")
        CrashlyticsLog.log("ParseInstallationRepository: Starting removeUserFromInstallation")

        val installation = ParseInstallation.getCurrentInstallation()
        Timber.d("ParseInstallationRepository: Obtained current ParseInstallation: $installation")
        CrashlyticsLog.log("ParseInstallationRepository: Obtained current ParseInstallation")

        if (installation.get("user") != null) {
            Timber.d("ParseInstallationRepository: Removing user from installation")
            CrashlyticsLog.log("ParseInstallationRepository: Removing user from installation")
            installation.remove("user")
        } else {
            Timber.d("ParseInstallationRepository: No user found in installation to remove")
        }

        try {
            installation.suspendSave()
            Timber.d("ParseInstallationRepository: Successfully saved installation after removing user")
            CrashlyticsLog.log("ParseInstallationRepository: Successfully saved installation after removing user")
        } catch (e: Exception) {
            Timber.e(e, "ParseInstallationRepository: Error saving installation after removing user")
            CrashlyticsLog.recordNonFatalError(e, "ParseInstallationRepository: Error saving installation after removing user")
            throw e
        }
    }
}