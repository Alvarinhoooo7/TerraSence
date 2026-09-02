package com.sosmartlabs.momo.ble

import android.location.Location
import com.parse.coroutines.callCloudFunction
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.CoroutineContext
import kotlin.math.roundToInt

/**
 * Validates a parent location and uploads it to the cloud as a proximity-assisted
 * location for nearby watches. Used by both the foreground [BleProximityScanner]
 * path and the background [BleProximityScanWorker].
 *
 * Implements per-device cooldown to avoid redundant cloud calls when the parent
 * stays near the same watch across multiple scan cycles.
 */
@Singleton
class ProximityLocationUploader @Inject constructor(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext
) {

    companion object {
        private const val TAG = "ProximityLocationUploader"
        private const val MAX_AGE_MS = 10_000L
        private const val MAX_ACCURACY_METERS = 15f
        private const val UPLOAD_COOLDOWN_MS = 5_000L // 5 seconds between uploads per device
        private const val MIN_DISTANCE_CHANGE_METERS = 10f // Skip if parent hasn't moved
    }

    private data class LastUpload(val latitude: Double, val longitude: Double, val timestampMs: Long)

    private val lastUploads = ConcurrentHashMap<String, LastUpload>()

    /**
     * Clears per-device cooldown state. Call on user logout to prevent
     * cooldowns from one account affecting another.
     */
    fun clearState() {
        lastUploads.clear()
        Timber.d("$TAG: State cleared")
    }

    /**
     * Validates the parent's location and, if fresh and accurate enough,
     * sends it to the cloud for each detected watch.
     *
     * @return true if the location was valid and at least one upload was attempted
     */
    fun uploadIfValid(location: Location?, deviceIds: Set<String>): Boolean {
        if (deviceIds.isEmpty()) return false

        if (location == null) {
            Timber.d("$TAG: No parent location available")
            return false
        }

        val ageMs = System.currentTimeMillis() - location.time
        if (ageMs > MAX_AGE_MS) {
            Timber.d("$TAG: Parent location too old (${ageMs}ms)")
            return false
        }

        if (location.accuracy > MAX_ACCURACY_METERS) {
            Timber.d("$TAG: Parent location too inaccurate (${location.accuracy}m)")
            return false
        }

        var uploaded = false
        val now = System.currentTimeMillis()
        evictStaleEntries(now)

        deviceIds.forEach { deviceId ->
            if (shouldSkipUpload(deviceId, location, now)) {
                Timber.d("$TAG: Skipping $deviceId — cooldown active and parent hasn't moved enough")
                return@forEach
            }

            lastUploads[deviceId] = LastUpload(location.latitude, location.longitude, now)
            uploaded = true

            externalScope.launch(ioContext) {
                uploadForDevice(deviceId, location)
            }
        }

        if (uploaded) {
            Timber.d("$TAG: Uploading parent location (${location.latitude}, ${location.longitude}), accuracy=${location.accuracy}m")
        }

        return uploaded
    }

    private fun evictStaleEntries(now: Long) {
        val iterator = lastUploads.entries.iterator()
        while (iterator.hasNext()) {
            if (now - iterator.next().value.timestampMs > UPLOAD_COOLDOWN_MS * 10) {
                iterator.remove()
            }
        }
    }

    private fun shouldSkipUpload(deviceId: String, location: Location, now: Long): Boolean {
        val last = lastUploads[deviceId] ?: return false

        val elapsed = now - last.timestampMs
        if (elapsed >= UPLOAD_COOLDOWN_MS) return false

        val results = FloatArray(1)
        Location.distanceBetween(last.latitude, last.longitude, location.latitude, location.longitude, results)
        return results[0] < MIN_DISTANCE_CHANGE_METERS
    }

    private suspend fun uploadForDevice(deviceId: String, location: Location) {
        try {
            val params = mapOf(
                "deviceId" to deviceId,
                "latitude" to location.latitude,
                "longitude" to location.longitude,
                "accuracy" to location.accuracy.roundToInt()
            )
            val result = callCloudFunction<Map<String, Any>>("updateBleProximityLocation", params)
            val updated = result["updated"] as? Boolean ?: false
            Timber.d("$TAG: Cloud response for $deviceId: updated=$updated")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Failed to upload proximity location for $deviceId")
            CrashlyticsLog.recordNonFatalError(e, "$TAG: Failed to upload proximity location for $deviceId")
        }
    }
}
