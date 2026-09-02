package com.sosmartlabs.momotabletpadres.dispatch.repository

import com.google.firebase.messaging.FirebaseMessaging
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.suspendCancellableCoroutine
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FcmRepository @Inject constructor() {

    @ExperimentalCoroutinesApi
    suspend fun getMessagingToken(): String = suspendCancellableCoroutine { continuation ->
        Timber.d("FcmRepository: Starting to fetch FCM token")
        CrashlyticsLog.log("FcmRepository: Starting to fetch FCM token")

        val firebaseMessaging = FirebaseMessaging.getInstance()
        Timber.d("FcmRepository: FirebaseMessaging instance obtained")
        CrashlyticsLog.log("FcmRepository: FirebaseMessaging instance obtained")

        firebaseMessaging.token
            .addOnSuccessListener { token ->
                Timber.d("FcmRepository: FCM token fetch successful")
                CrashlyticsLog.log("FcmRepository: FCM token fetch successful")
                if (continuation.isActive) {
                    continuation.resume(token) { throwable ->
                        Timber.e(throwable, "FcmRepository: Error resuming continuation after FCM token fetch")
                        CrashlyticsLog.recordNonFatalError(
                            throwable,
                            "FcmRepository: Error resuming continuation after FCM token fetch"
                        )
                    }
                }
            }
            .addOnFailureListener { exception ->
                Timber.e(exception, "FcmRepository: Failed to fetch FCM token")
                CrashlyticsLog.recordNonFatalError(
                    exception,
                    "FcmRepository: Failed to fetch FCM token"
                )
                if (continuation.isActive) {
                    continuation.cancel(exception)
                }
            }

        continuation.invokeOnCancellation {
            Timber.w("FcmRepository: FCM token fetch coroutine was cancelled")
            CrashlyticsLog.log("FcmRepository: FCM token fetch coroutine was cancelled")
        }
    }
}