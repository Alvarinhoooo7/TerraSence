package com.sosmartlabs.momo.ble

import android.Manifest
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.ParcelUuid
import androidx.core.content.ContextCompat
import androidx.hilt.work.HiltWorker
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.google.android.gms.location.LocationServices
import com.google.android.gms.tasks.Tasks
import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.ktx.include
import com.parse.ktx.whereEqualTo
import com.parse.ktx.whereExists
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.WatchUser
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import timber.log.Timber
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Background worker that periodically scans for nearby SoyMomo watches via BLE.
 *
 * When a watch is detected, retrieves the parent phone's GPS location
 * (which is typically more accurate than the watch's) for future use as a
 * proximity-assisted location update.
 */
@HiltWorker
class BleProximityScanWorker @AssistedInject constructor(
    @Assisted private val appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val bluetoothManager: BluetoothManager,
    private val proximityLocationUploader: ProximityLocationUploader
) : Worker(appContext, workerParams) {

    companion object {
        private const val TAG = "BleProximityScanWorker"
        private const val SCAN_DURATION_SECONDS = 5L
    }

    override fun doWork(): Result {
        Timber.d("$TAG: Starting background BLE proximity scan")

        if (!hasRequiredPermissions()) {
            Timber.w("$TAG: Missing required permissions, skipping")
            return Result.success()
        }

        val user = ParseUser.getCurrentUser()
        if (user == null) {
            Timber.w("$TAG: No logged-in user, skipping")
            return Result.success()
        }

        // Currently we only upload proximity locations for the parent's own watches.
        // Future: "Community relay" mode (similar to Apple's Find My network) — upload
        // for ALL detected SoyMomo watches, not just this parent's. This would turn every
        // parent phone into a location relay for any nearby watch. Requires:
        //  - Opt-in toggle (Firebase Remote Config or user setting)
        //  - Rate limiting (cap uploads per cycle in crowded areas)
        //  - Distinct provider value ("community_ble_proximity") for tracking
        //  - Privacy/legal review (GDPR, parental consent)
        //  - Cloud-side throttling per caller
        // When ready, skip fetchKnownDeviceIds and pass knownDeviceIds=null to
        // scanForNearbyWatches to accept all detected watches.
        val knownDeviceIds = fetchKnownDeviceIds(user)
        if (knownDeviceIds.isEmpty()) {
            Timber.d("$TAG: No known watches for this user, skipping scan")
            return Result.success()
        }

        val detectedDeviceIds = scanForNearbyWatches(knownDeviceIds)
        if (detectedDeviceIds.isEmpty()) {
            Timber.d("$TAG: No nearby watches detected")
            return Result.success()
        }

        Timber.d("$TAG: Detected ${detectedDeviceIds.size} nearby watch(es): $detectedDeviceIds")

        val parentLocation = getParentLocation()
        proximityLocationUploader.uploadIfValid(parentLocation, detectedDeviceIds)

        return Result.success()
    }

    private fun fetchKnownDeviceIds(user: ParseUser): Set<String> {
        return try {
            val watchUsers = ParseQuery.getQuery(WatchUser::class.java)
                .whereEqualTo(WatchUser::user, user)
                .whereExists(WatchUser::watch)
                .include(WatchUser::watch)
                .find()

            watchUsers.mapNotNull { it.watch?.deviceId }.toSet().also {
                Timber.d("$TAG: Fetched ${it.size} known deviceIds")
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Failed to fetch known deviceIds")
            CrashlyticsLog.recordNonFatalError(e, "$TAG: Failed to fetch known deviceIds")
            emptySet()
        }
    }

    private fun scanForNearbyWatches(knownDeviceIds: Set<String>): Set<String> {
        val adapter = bluetoothManager.adapter
        if (adapter == null || !adapter.isEnabled) {
            Timber.w("$TAG: Bluetooth adapter is null or disabled")
            return emptySet()
        }

        val scanner = adapter.bluetoothLeScanner
        if (scanner == null) {
            Timber.w("$TAG: BLE scanner not available")
            return emptySet()
        }

        val detectedIds = java.util.Collections.synchronizedSet(mutableSetOf<String>())
        val scanLatch = CountDownLatch(1)

        val scanCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val deviceName = result.scanRecord?.deviceName
                if (deviceName.isNullOrEmpty()) return

                val deviceId = extractMatchingDeviceId(deviceName, knownDeviceIds) ?: return
                if (detectedIds.add(deviceId)) {
                    Timber.d("$TAG: Detected watch: $deviceId (name=$deviceName, rssi=${result.rssi})")
                }
            }

            override fun onScanFailed(errorCode: Int) {
                Timber.e("$TAG: Scan failed with error code: $errorCode")
                scanLatch.countDown()
            }
        }

        val scanFilter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid(BleProximityScanner.PROXIMITY_SERVICE_UUID))
            .build()

        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_POWER)
            .setReportDelay(0)
            .build()

        try {
            scanner.startScan(listOf(scanFilter), scanSettings, scanCallback)
            scanLatch.await(SCAN_DURATION_SECONDS, TimeUnit.SECONDS)
        } catch (e: SecurityException) {
            Timber.e(e, "$TAG: Permission revoked during scan")
        } finally {
            try {
                scanner.stopScan(scanCallback)
            } catch (e: SecurityException) {
                Timber.e(e, "$TAG: Permission revoked while stopping scan")
            }
        }

        return detectedIds
    }

    private fun getParentLocation(): Location? {
        if (!hasLocationPermission()) {
            Timber.w("$TAG: Location permission not granted")
            return null
        }

        return try {
            val fusedLocationClient = LocationServices.getFusedLocationProviderClient(appContext)
            Tasks.await(fusedLocationClient.lastLocation)
        } catch (e: SecurityException) {
            Timber.e(e, "$TAG: SecurityException retrieving location")
            CrashlyticsLog.recordNonFatalError(e, "$TAG: SecurityException retrieving location")
            null
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error retrieving location")
            CrashlyticsLog.recordNonFatalError(e, "$TAG: Error retrieving location")
            null
        }
    }

    private fun extractMatchingDeviceId(deviceName: String, knownDeviceIds: Set<String>): String? {
        val scannedHash = deviceName.substringAfter("Space_3.0-", "")
            .ifEmpty { deviceName.substringAfter("Space_4.0-", "") }
            .ifEmpty { null }
            ?: return null

        // Build hash→deviceId lookup and match the scanned hash
        return knownDeviceIds.firstOrNull { BleProximityScanner.hashDeviceId(it) == scannedHash }
    }

    private fun hasRequiredPermissions(): Boolean {
        return hasLocationPermission() && hasBluetoothScanPermission()
    }

    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(appContext, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED
    }

    private fun hasBluetoothScanPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        return ContextCompat.checkSelfPermission(appContext, Manifest.permission.BLUETOOTH_SCAN) ==
                PackageManager.PERMISSION_GRANTED
    }
}
