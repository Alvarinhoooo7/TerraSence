package com.sosmartlabs.momo.ble

import android.Manifest
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import androidx.core.content.ContextCompat
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import java.security.MessageDigest
import java.util.UUID
import javax.inject.Inject

/**
 * Lifecycle-aware BLE scanner that detects nearby SoyMomo watches.
 *
 * On resume, starts a repeating scan cycle: scan for [SCAN_DURATION_MS],
 * pause for [SCAN_INTERVAL_MS], then scan again. Stops on pause.
 * Matches discovered device names (e.g. "Space_3.0-{hashedDeviceId}") against
 * hashed versions of known watch deviceIds. Exposes detected nearby deviceIds
 * via [nearbyWatchIds].
 */
class BleProximityScanner @Inject constructor(
    @param:ApplicationContext private val context: Context,
    private val bluetoothManager: BluetoothManager
) : DefaultLifecycleObserver {

    companion object {
        private const val TAG = "BleProximityScanner"
        private const val SCAN_DURATION_MS = 5_000L
        private const val SCAN_INTERVAL_MS = 10_000L

        /** Must match BleAdvertiserRepository.PROXIMITY_SERVICE_UUID in watch-brain-space-3. */
        val PROXIMITY_SERVICE_UUID: UUID = UUID.fromString("9a79be36-816b-4049-bc6c-cf3eeac2eb19")

        private const val HASH_SALT = "soymomo-ble-proximity-salt"
        private const val HASH_LENGTH = 12

        /**
         * Computes the same truncated SHA-256 hash used by the watch brain to
         * obfuscate deviceIds in BLE advertisements. Must be identical across
         * watch-brain-space-3, soymomo-watch-android, and soymomo-watch-ios.
         */
        fun hashDeviceId(deviceId: String): String {
            val digest = MessageDigest.getInstance("SHA-256")
            val hash = digest.digest("$deviceId$HASH_SALT".toByteArray())
            return hash.joinToString("") { "%02x".format(it) }.take(HASH_LENGTH)
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private var isScanning = false
    private var isActive = false
    private var knownDeviceIds: Set<String> = emptySet()
    /** Maps hashed deviceId → raw deviceId for reverse lookup during scan matching. */
    private var hashToDeviceId: Map<String, String> = emptyMap()
    private val detectedIds = java.util.Collections.synchronizedSet(mutableSetOf<String>())

    private val _nearbyWatchIds = MutableLiveData<Set<String>>()

    /** Set of deviceIds detected nearby via BLE during the latest scan. */
    val nearbyWatchIds: LiveData<Set<String>> get() = _nearbyWatchIds

    /**
     * Sets the deviceIds of the watches belonging to this parent.
     * The scanner matches BLE device names against hashed versions of these ids.
     * Triggers an immediate scan if the lifecycle is active and no scan is running.
     */
    fun setKnownDeviceIds(deviceIds: Set<String>) {
        knownDeviceIds = deviceIds
        hashToDeviceId = deviceIds.associateBy { hashDeviceId(it) }
        Timber.d("$TAG: Known deviceIds updated: ${deviceIds.size} watches")
        if (isActive && !isScanning && deviceIds.isNotEmpty()) {
            handler.removeCallbacksAndMessages(null)
            startScan()
        }
    }

    override fun onResume(owner: LifecycleOwner) {
        isActive = true
        startScan()
    }

    override fun onPause(owner: LifecycleOwner) {
        isActive = false
        stopScan()
        handler.removeCallbacksAndMessages(null)
    }

    private fun startScan() {
        if (isScanning) return
        if (!isActive) return
        if (knownDeviceIds.isEmpty()) {
            Timber.d("$TAG: No known deviceIds yet, deferring scan")
            return
        }

        if (!hasRequiredPermissions()) {
            Timber.w("$TAG: Missing Bluetooth permissions, skipping scan")
            return
        }

        val adapter = bluetoothManager.adapter
        if (adapter == null || !adapter.isEnabled) {
            Timber.w("$TAG: Bluetooth adapter is null or disabled, skipping scan")
            return
        }

        val scanner = adapter.bluetoothLeScanner
        if (scanner == null) {
            Timber.w("$TAG: BLE scanner not available")
            return
        }

        val scanFilter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid(PROXIMITY_SERVICE_UUID))
            .build()

        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setReportDelay(0)
            .build()

        detectedIds.clear()
        _nearbyWatchIds.value = emptySet()

        try {
            scanner.startScan(listOf(scanFilter), scanSettings, scanCallback)
            isScanning = true
            Timber.d("$TAG: BLE scan started")
            handler.postDelayed({ stopScan() }, SCAN_DURATION_MS)
        } catch (e: SecurityException) {
            Timber.e(e, "$TAG: Permission revoked during scan start")
        }
    }

    private fun stopScan() {
        if (!isScanning) return
        isScanning = false

        try {
            bluetoothManager.adapter?.bluetoothLeScanner?.stopScan(scanCallback)
            Timber.d("$TAG: BLE scan stopped. Detected ${detectedIds.size} nearby watch(es)")
        } catch (e: SecurityException) {
            Timber.e(e, "$TAG: Permission revoked during scan stop")
        }

        scheduleNextScan()
    }

    private fun scheduleNextScan() {
        if (!isActive) return
        handler.postDelayed({ startScan() }, SCAN_INTERVAL_MS)
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val deviceName = result.scanRecord?.deviceName
            if (deviceName.isNullOrEmpty()) return

            val matchedDeviceId = extractMatchingDeviceId(deviceName) ?: return

            if (detectedIds.add(matchedDeviceId)) {
                Timber.d("$TAG: Watch detected nearby: $matchedDeviceId (name=$deviceName, rssi=${result.rssi})")
                _nearbyWatchIds.postValue(detectedIds.toSet())
            }
        }

        override fun onScanFailed(errorCode: Int) {
            isScanning = false
            Timber.e("$TAG: Scan failed with error code: $errorCode")
        }
    }

    /**
     * Extracts the raw deviceId from a BLE device name containing a hashed identifier.
     * The watch brain advertises "Space_X.0-{hashedDeviceId}". We extract the hash
     * suffix and look it up in our precomputed hashToDeviceId map to get the raw deviceId.
     */
    private fun extractMatchingDeviceId(deviceName: String): String? {
        val scannedHash = deviceName.substringAfter("Space_3.0-", "")
            .ifEmpty { deviceName.substringAfter("Space_4.0-", "") }
            .ifEmpty { null }
            ?: return null

        return hashToDeviceId[scannedHash]
    }

    private fun hasRequiredPermissions(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        return ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
    }
}
