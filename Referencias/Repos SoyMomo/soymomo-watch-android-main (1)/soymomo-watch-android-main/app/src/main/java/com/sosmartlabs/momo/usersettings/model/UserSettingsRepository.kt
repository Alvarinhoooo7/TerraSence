package com.sosmartlabs.momo.usersettings.model

import com.parse.ParseException
import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.coroutines.suspendSave
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject

class UserSettingsRepository @Inject constructor() {

    fun getUserSettingsApp(user: ParseUser) {
        Timber.d("UserSettingsRepository: Getting settings for user ${user.objectId}")
        CrashlyticsLog.log("UserSettingsRepository getting settings for user ${user.objectId}")
        
        runCatching {
            ParseQuery(WatchUser::class.java)
                .whereEqualTo("user", user.objectId)
                .include("watch")
                .find()
        }.onSuccess { watchUsers ->
            Timber.d("UserSettingsRepository: Found ${watchUsers.size} watch users for user ${user.objectId}")
            CrashlyticsLog.log("UserSettingsRepository found ${watchUsers.size} watch users")
        }.onFailure { error ->
            Timber.e("UserSettingsRepository: Error getting settings: $error")
            CrashlyticsLog.recordNonFatalError(error, "Error getting user settings")
            checkAndThrowConnectionExceptionOrException(error)
        }
    }

    suspend fun updatePushNotifications(
        user: ParseUser, geofence: Boolean, battery: Boolean, request: Boolean, messages: Boolean,
        other: Boolean
    ): Boolean {
        Timber.d("UserSettingsRepository: Updating push notifications for user ${user.objectId}")
        CrashlyticsLog.log("UserSettingsRepository updating notifications for user ${user.objectId}")
        
        user.put("pushGeofences", geofence)
        user.put("pushBattery", battery)
        user.put("pushRequests", request)
        user.put("pushMessages", messages)
        user.put("pushOther", other)

        return user.isDirty.apply {
            if (this) {
                Timber.d("UserSettingsRepository: Saving updated notifications")
                CrashlyticsLog.log("UserSettingsRepository saving notification updates")
                user.suspendSave()
                Timber.d("UserSettingsRepository: Successfully saved notification updates")
                CrashlyticsLog.log("UserSettingsRepository notifications saved successfully")
            } else {
                Timber.d("UserSettingsRepository: No changes to save")
                CrashlyticsLog.log("UserSettingsRepository no notification changes to save") 
            }
        }
    }

    private fun checkAndThrowConnectionExceptionOrException(exception: Throwable): Nothing {
        Timber.d("UserSettingsRepository: Checking exception type: $exception")
        CrashlyticsLog.log("UserSettingsRepository checking exception type")
        
        if (exception is ParseException) {
            if (exception.code in arrayListOf(ParseException.CONNECTION_FAILED, ParseException.INVALID_JSON)) {
                Timber.e("UserSettingsRepository: Connection exception detected: ${exception.message}")
                CrashlyticsLog.log("UserSettingsRepository throwing connection exception")
                throw ConnectionException(exception.localizedMessage)
            }
        }

        Timber.e("UserSettingsRepository: Rethrowing original exception")
        CrashlyticsLog.log("UserSettingsRepository rethrowing original exception")
        throw exception
    }

    class ConnectionException(message: String?) : Exception(message ?: "Parse connection error")
}