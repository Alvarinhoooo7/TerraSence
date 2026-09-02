package com.sosmartlabs.momo.dispatch.model

import com.parse.ParseInstallation
import com.parse.ParseUser
import com.parse.coroutines.suspendSave
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject

/**
 * Repository responsible for managing access and modifications to ParseInstallation instances.
 */
class ParseInstallationRepository @Inject constructor() {

    /**
     * Sets up the current ParseInstallation instance with a specified user and GCM key.
     * Updates the installation only if the existing values do not match the provided values.
     *
     * @param user the current ParseUser.
     * @param gcmKey the GCM key used by the current device.
     */
    suspend fun setupCurrentInstallation(user: ParseUser, gcmKey: String) {
        Timber.d("ParseInstallationRepository: setupCurrentInstallation called for userId=${user.objectId}, gcmKey=$gcmKey")
        CrashlyticsLog.log("ParseInstallationRepository: setupCurrentInstallation started for userId=${user.objectId}")

        val installation = ParseInstallation.getCurrentInstallation()
        Timber.d("ParseInstallationRepository: Obtained current installation with id=${installation.objectId}")

        val currentGcmSenderId = installation.get("GCMSenderId") as? String
        val currentInstallationUser = installation.getParseUser("user")
        Timber.d("ParseInstallationRepository: Current GCM Sender ID: $currentGcmSenderId, Expected: $gcmKey")
        Timber.d("ParseInstallationRepository: Current User ID: ${currentInstallationUser?.objectId}, Expected: ${user.objectId}")

        if (currentGcmSenderId == gcmKey && currentInstallationUser?.objectId == user.objectId) {
            Timber.d("ParseInstallationRepository: No update needed for installation (GCM and user match).")
            CrashlyticsLog.log("ParseInstallationRepository: No update needed for installation (GCM and user match).")
            return
        }

        Timber.d("ParseInstallationRepository: Updating installation with new GCM Sender ID and user.")
        installation.put("GCMSenderId", gcmKey)
        installation.put("user", user)

        try {
            Timber.d("ParseInstallationRepository: Saving updated installation...")
            installation.suspendSave()
            Timber.d("ParseInstallationRepository: Installation updated and saved successfully.")
            CrashlyticsLog.log("ParseInstallationRepository: Installation updated and saved successfully for userId=${user.objectId}")
        } catch (e: Exception) {
            Timber.e(e, "ParseInstallationRepository: Failed to save installation settings for userId=${user.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "ParseInstallationRepository: Failed to save installation settings for userId=${user.objectId}")
            throw e
        }
    }

    /**
     * Removes the user association from the current ParseInstallation.
     * This should be invoked upon user logout to ensure clean separation of user data.
     */
    suspend fun removeUserFromInstallation() {
        Timber.d("ParseInstallationRepository: removeUserFromInstallation called")
        CrashlyticsLog.log("ParseInstallationRepository: removeUserFromInstallation started")

        val installation = ParseInstallation.getCurrentInstallation()
        Timber.d("ParseInstallationRepository: Obtained current installation with id=${installation.objectId}")

        installation.remove("user")
        Timber.d("ParseInstallationRepository: Removed 'user' field from installation.")

        try {
            Timber.d("ParseInstallationRepository: Saving installation after removing user...")
            installation.suspendSave()
            Timber.d("ParseInstallationRepository: User removed from installation and saved successfully.")
            CrashlyticsLog.log("ParseInstallationRepository: User removed from installation and saved successfully")
        } catch (e: Exception) {
            Timber.e(e, "ParseInstallationRepository: Failed to remove user from installation.")
            CrashlyticsLog.recordNonFatalError(e, "ParseInstallationRepository: Failed to remove user from installation.")
            throw e
        }
    }
}
