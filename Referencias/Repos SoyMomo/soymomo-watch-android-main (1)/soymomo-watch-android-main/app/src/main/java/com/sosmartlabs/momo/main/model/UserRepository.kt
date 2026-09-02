package com.sosmartlabs.momo.main.model

import android.graphics.Bitmap
import com.parse.ParseException
import com.parse.ParseFile
import com.parse.ParseUser
import com.parse.coroutines.callCloudFunction
import com.parse.coroutines.suspendSave
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.ByteArrayOutputStream
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resumeWithException

/**
 * Repository for obtaining a user
 */
@Singleton
class UserRepository @Inject constructor() {

    /**
     * Stores the current user for been used in this repository
     */
    private var currentUser: ParseUser? = null

    /**
     * Gets the current user
     * @return Current user
     */
    fun getCurrentUser(): ParseUser? {
        return currentUser ?: ParseUser.getCurrentUser()
    }

    /**
     * Logout the current user
     */
    @ExperimentalCoroutinesApi
    suspend fun logout() = suspendCancellableCoroutine<Unit> { continuation ->
        // User logOutInBackground approach due to logout method in Parse API does not launch any
        // exception if the logout fails.
        ParseUser.logOutInBackground {
            if (it != null && it.code != ParseException.INVALID_SESSION_TOKEN) continuation.resumeWithException(
                it
            )
            else {
                currentUser = null
                if (continuation.isActive) {
                    continuation.resume(Unit) { }
                }
            }
        }

        continuation.invokeOnCancellation {
            // Do nothing extra if cancelled.
            // This method must be here for suspend coroutine while callback returns
        }
    }

    suspend fun sendCR(ids: List<String>) {
        CrashlyticsLog.log("Calling cloud function sendCR with list of deviceId")
        ids.forEach {
            callCloudFunction<Any?>("sendCR", mapOf("deviceId" to it))
        }
    }

    suspend fun parseUserProfile(bitmap: Bitmap) {
        if (currentUser != null) {
            if (!currentUser!!.has("image")) {
                CrashlyticsLog.log("Saving user")
                val stream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.PNG, 50, stream)
                val data = stream.toByteArray()
                val imageFile = ParseFile(data)
                currentUser!!.put("image", imageFile)
                currentUser!!.suspendSave()
            }
        }
    }

    suspend fun acceptedNewTosInMain() {
        currentUser!!.put("acceptedNewTOS", true)
        currentUser!!.suspendSave()
    }

}