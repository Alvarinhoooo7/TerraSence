package com.sosmartlabs.momo.userlocation.worker

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import com.sosmartlabs.momo.BuildConfig
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.Constants
import timber.log.Timber
import java.util.concurrent.TimeUnit
import javax.inject.Inject

class UserLocationWorkerCreator @Inject constructor() {

    fun createUserLocationWorker(context: Context) {
        try {
            Timber.d("UserLocationWorkerCreator: Starting creation of user location worker")
            CrashlyticsLog.log("UserLocationWorkerCreator: Starting creation of user location worker")

            // Determine the time interval based on build configuration
            val (intervalValue, intervalUnit) = if (BuildConfig.DEBUG) {
                Timber.d("UserLocationWorkerCreator: Debug mode detected - setting interval to 15 minutes")
                Pair(15, TimeUnit.MINUTES)
            } else {
                Timber.d("UserLocationWorkerCreator: Production mode detected - setting interval to 1 hour")
                Pair(1, TimeUnit.HOURS)
            }

            // Build constraints for the work request
            Timber.d("UserLocationWorkerCreator: Building work constraints")
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            // Create the periodic work request with the defined interval and constraints
            Timber.d("UserLocationWorkerCreator: Creating periodic work request")
            val workRequest = PeriodicWorkRequest.Builder(
                UserLocationWorker::class.java,
                intervalValue.toLong(),
                intervalUnit
            )
                .setConstraints(constraints)
                .build()

            // Enqueue the work request with a unique tag, keeping the existing periodic work if present
            Timber.d("UserLocationWorkerCreator: Enqueueing work request")
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    Constants.USER_LOCATION_WORKER_TAG,
                    ExistingPeriodicWorkPolicy.KEEP,
                    workRequest
                )

            Timber.d("UserLocationWorkerCreator: User location worker created successfully")
            CrashlyticsLog.log("UserLocationWorkerCreator: User location worker created successfully")
        } catch (e: Exception) {
            Timber.e(e, "UserLocationWorkerCreator: Failed to create user location worker")
            CrashlyticsLog.recordNonFatalError(e, "UserLocationWorkerCreator: Failed to create user location worker")
            throw e
        }
    }

}