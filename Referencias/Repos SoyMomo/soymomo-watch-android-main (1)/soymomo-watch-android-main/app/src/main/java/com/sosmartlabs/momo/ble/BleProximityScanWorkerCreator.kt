package com.sosmartlabs.momo.ble

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import com.sosmartlabs.momo.BuildConfig
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Schedules the periodic [BleProximityScanWorker] that scans for nearby watches in the background.
 */
@Singleton
class BleProximityScanWorkerCreator @Inject constructor(
    @param:ApplicationContext private val appContext: Context
) {

    companion object {
        const val WORKER_TAG = "BLE_PROXIMITY_SCAN_WORKER"
    }

    fun create() {
        try {
            Timber.d("BleProximityScanWorkerCreator: Scheduling BLE proximity scan worker")

            val intervalMinutes = if (BuildConfig.DEBUG) 15L else 30L

            val workRequest = PeriodicWorkRequest.Builder(
                BleProximityScanWorker::class.java,
                intervalMinutes,
                TimeUnit.MINUTES
            ).build()

            WorkManager.getInstance(appContext)
                .enqueueUniquePeriodicWork(
                    WORKER_TAG,
                    ExistingPeriodicWorkPolicy.KEEP,
                    workRequest
                )

            Timber.d("BleProximityScanWorkerCreator: Worker scheduled (interval=${intervalMinutes}min)")
            CrashlyticsLog.log("BleProximityScanWorkerCreator: Worker scheduled")
        } catch (e: Exception) {
            Timber.e(e, "BleProximityScanWorkerCreator: Failed to schedule worker")
            CrashlyticsLog.recordNonFatalError(e, "BleProximityScanWorkerCreator: Failed to schedule worker")
        }
    }

    /**
     * Cancels the periodic BLE proximity scan worker.
     * Call on user logout to prevent scanning under the wrong account.
     */
    fun cancel() {
        try {
            WorkManager.getInstance(appContext).cancelUniqueWork(WORKER_TAG)
            Timber.d("BleProximityScanWorkerCreator: Worker cancelled")
        } catch (e: Exception) {
            Timber.e(e, "BleProximityScanWorkerCreator: Failed to cancel worker")
        }
    }
}
