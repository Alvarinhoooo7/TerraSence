package com.sosmartlabs.momo.bluetooth

import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@SuppressLint("MissingPermission")
@Singleton
class BluetoothCentralHelper @Inject constructor(@ApplicationContext private val context: Context) {

    companion object {
        // Must match the smartwatch's service and characteristic UUIDs.
        private val SERVICE_UUID: UUID = UUID.fromString("59f75395-789a-47f1-86d9-20c4b4f8c12e")
        private val TIME_SYNC_UUID: UUID = UUID.fromString("e8450e6c-2a7b-4b7a-bf3f-cbb7d80d4a8a")
        private val TIME_ZONE_SYNC_UUID: UUID = UUID.fromString("3a8c2086-ddae-47c6-b228-839b5e12afd5")
        // Timeout for time-sync fallback in milliseconds
        private const val SYNC_TIMEOUT_MS = 10000L
    }

    var onSyncSuccess: (() -> Unit)? = null

    private var bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var bluetoothLeScanner: BluetoothLeScanner? = bluetoothAdapter?.bluetoothLeScanner
    private var scanning: Boolean = false
    private var bluetoothGatt: BluetoothGatt? = null
    private val handler = Handler(Looper.getMainLooper())
    private var timeWriteComplete = false
    private var timezoneWriteComplete = false

    fun startScan(deviceId: String?) {
        if (scanning) {
            Timber.d("BluetoothCentralHelper: Already scanning, ignoring startScan request")
            return
        }
        
        if (bluetoothLeScanner == null) {
            val error = IllegalStateException("BluetoothLeScanner is null")
            Timber.e("BluetoothCentralHelper: Cannot start scan - BluetoothLeScanner is null")
            CrashlyticsLog.recordNonFatalError(error, "Failed to start BLE scan - scanner is null")
            onSyncSuccess?.invoke()
            return
        }
        
        val scanFilters = listOf(
            ScanFilter.Builder()
                .setServiceUuid(ParcelUuid(SERVICE_UUID))
                .setDeviceName("Space_3.0-$deviceId")
                .build()
        )
        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()
        
        Timber.d("BluetoothCentralHelper: Starting scan for device Space_3.0-$deviceId with service UUID: $SERVICE_UUID")
        scanning = true
        
        try {
            bluetoothLeScanner?.startScan(scanFilters, scanSettings, scanCallback)
            Timber.d("BluetoothCentralHelper: Scan started successfully")
            // Stop scanning after timeout
            handler.postDelayed({
                if (scanning) {
                    Timber.d("BluetoothCentralHelper: Scan timeout reached after ${SYNC_TIMEOUT_MS}ms")
                    CrashlyticsLog.log("BLE scan timeout reached after ${SYNC_TIMEOUT_MS}ms")
                    stopScan()
                    onSyncSuccess?.invoke()
                }
            }, SYNC_TIMEOUT_MS)
        } catch (e: Exception) {
            scanning = false
            Timber.e("BluetoothCentralHelper: Failed to start scan: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "Failed to start BLE scan with error: ${e.message}")
            onSyncSuccess?.invoke()
        }
    }

    fun stopScan() {
        if (!scanning) {
            Timber.d("BluetoothCentralHelper: Not scanning, ignoring stopScan request")
            return
        }
        
        Timber.d("BluetoothCentralHelper: Stopping scan")
        try {
            bluetoothLeScanner?.stopScan(scanCallback)
            Timber.d("BluetoothCentralHelper: Scan stopped successfully")
        } catch (e: Exception) {
            Timber.e("BluetoothCentralHelper: Error stopping scan: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "Error stopping BLE scan: ${e.message}")
        } finally {
            scanning = false
        }
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            result?.device?.let { device ->
                val deviceName = device.name
                if (deviceName?.startsWith("Space_3.0") == true) {
                    Timber.d("BluetoothCentralHelper: Device found: ${device.name}, address: ${device.address}")
                    CrashlyticsLog.log("BLE device found: ${device.name}, address: ${device.address}")
                    // Connect to the device and stop scanning
                    stopScan()
                    connectToDevice(device)
                } else {
                    Timber.v("BluetoothCentralHelper: Ignoring device: ${device.name ?: "unnamed"}, address: ${device.address}")
                }
            }
        }

        override fun onScanFailed(errorCode: Int) {
            val errorMessage = when(errorCode) {
                ScanCallback.SCAN_FAILED_ALREADY_STARTED -> "Scan already started"
                ScanCallback.SCAN_FAILED_APPLICATION_REGISTRATION_FAILED -> "Application registration failed"
                ScanCallback.SCAN_FAILED_FEATURE_UNSUPPORTED -> "Feature unsupported"
                ScanCallback.SCAN_FAILED_INTERNAL_ERROR -> "Internal error"
                else -> "Unknown error code: $errorCode"
            }
            Timber.e("BluetoothCentralHelper: Scan failed: $errorMessage")
            CrashlyticsLog.recordNonFatalError(
                Exception("BLE scan failed with code $errorCode"),
                "BLE scan failed: $errorMessage"
            )
            scanning = false
            onSyncSuccess?.invoke()
        }
    }

    private fun connectToDevice(device: BluetoothDevice) {
        Timber.d("BluetoothCentralHelper: Connecting to device: ${device.name}, address: ${device.address}")
        try {
            bluetoothGatt = device.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
            if (bluetoothGatt == null) {
                Timber.e("BluetoothCentralHelper: Failed to connect - GATT connection returned null")
                CrashlyticsLog.recordNonFatalError(
                    Exception("GATT connection failed"),
                    "GATT connection returned null for device ${device.address}"
                )
                onSyncSuccess?.invoke()
            } else {
                Timber.d("BluetoothCentralHelper: GATT connection initiated")
                CrashlyticsLog.log("BLE GATT connection initiated for device ${device.address}")
            }
        } catch (e: Exception) {
            Timber.e("BluetoothCentralHelper: Error connecting to device: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "Error connecting to BLE device ${device.address}: ${e.message}")
            onSyncSuccess?.invoke()
        }
    }

    private fun writeTimeCharacteristic(gatt: BluetoothGatt) {
        Timber.d("BluetoothCentralHelper: Attempting to write time characteristics")
        
        val service = gatt.getService(SERVICE_UUID)
        if (service == null) {
            Timber.e("BluetoothCentralHelper: Service $SERVICE_UUID not found")
            CrashlyticsLog.recordNonFatalError(
                Exception("BLE service not found"),
                "BLE service not found: $SERVICE_UUID"
            )
            disconnect()
            onSyncSuccess?.invoke()
            return
        }
        
        // Reset write completion flags
        timeWriteComplete = false
        timezoneWriteComplete = false
        
        // Get the time characteristic
        val timeCharacteristic = service.getCharacteristic(TIME_SYNC_UUID)
        if (timeCharacteristic == null) {
            Timber.e("BluetoothCentralHelper: TIME_SYNC characteristic not found")
            CrashlyticsLog.recordNonFatalError(
                Exception("BLE characteristic not found"),
                "BLE time sync characteristic not found: $TIME_SYNC_UUID"
            )
            disconnect()
            onSyncSuccess?.invoke()
            return
        }
        
        // Get the timezone characteristic
        val timezoneCharacteristic = service.getCharacteristic(TIME_ZONE_SYNC_UUID)
        if (timezoneCharacteristic == null) {
            Timber.e("BluetoothCentralHelper: TIME_ZONE_SYNC characteristic not found")
            CrashlyticsLog.recordNonFatalError(
                Exception("BLE characteristic not found"),
                "BLE timezone characteristic not found: $TIME_ZONE_SYNC_UUID"
            )
            disconnect()
            onSyncSuccess?.invoke()
            return
        }
        
        val currentTime = System.currentTimeMillis().toString()
        val currentTimeZone = TimeZone.getDefault().id
        
        Timber.d("BluetoothCentralHelper: Writing time data: timestamp=$currentTime, timezone=$currentTimeZone")
        CrashlyticsLog.log("BLE writing time data: timestamp=$currentTime, timezone=$currentTimeZone")
        
        // Write timestamp to TIME_SYNC_UUID first
        // The timezone will be written in the onCharacteristicWrite callback after this completes
        try {
            writeCharacteristic(gatt, timeCharacteristic, currentTime.toByteArray())
        } catch (e: Exception) {
            Timber.e("BluetoothCentralHelper: Exception during time write: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "Exception during BLE time write operation: ${e.message}")
            disconnect()
            onSyncSuccess?.invoke()
        }
    }
    
    private fun writeTimezoneCharacteristic(gatt: BluetoothGatt) {
        Timber.d("BluetoothCentralHelper: Writing timezone characteristic")
        
        val service = gatt.getService(SERVICE_UUID)
        if (service == null) {
            Timber.e("BluetoothCentralHelper: Service not found for timezone write")
            disconnect()
            onSyncSuccess?.invoke()
            return
        }
        
        val timezoneCharacteristic = service.getCharacteristic(TIME_ZONE_SYNC_UUID)
        if (timezoneCharacteristic == null) {
            Timber.e("BluetoothCentralHelper: Timezone characteristic not found")
            disconnect()
            onSyncSuccess?.invoke()
            return
        }
        
        val currentTimeZone = TimeZone.getDefault().id
        val currentTimeZoneInETC = getEtcGmtTimezone()
        Timber.d("BluetoothCentralHelper: Writing timezone: $currentTimeZone mapped to $currentTimeZoneInETC")
        
        try {
            writeCharacteristic(gatt, timezoneCharacteristic, currentTimeZoneInETC.toByteArray())
        } catch (e: Exception) {
            Timber.e("BluetoothCentralHelper: Exception during timezone write: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "Exception during BLE timezone write operation: ${e.message}")
            disconnect()
            onSyncSuccess?.invoke()
        }
    }

    private fun getEtcGmtTimezone(): String {
        Timber.d("BluetoothCentralHelper: Converting local timezone to Etc/GMT format")
        
        val tz = TimeZone.getDefault()
        val now = Calendar.getInstance(tz)
        val offsetMillis = tz.getOffset(now.timeInMillis)
        val tzId = tz.id

        // Convert milliseconds to hours
        val offsetHours = offsetMillis / (1000 * 60 * 60)
        
        Timber.d("BluetoothCentralHelper: Local timezone=$tzId, offset=${offsetHours}h (${offsetMillis}ms)")
        CrashlyticsLog.log("BLE timezone conversion: local=$tzId, offset=${offsetHours}h")

        // Invert sign according to Etc/GMT naming (POSIX style)
        val etcGmtTimezone = if (offsetHours == 0) {
            "Etc/GMT"
        } else if (offsetHours > 0) {
            String.format(Locale.US, "Etc/GMT-%d", offsetHours) // e.g., UTC+3 → Etc/GMT-3
        } else {
            String.format(Locale.US, "Etc/GMT+%d", -offsetHours) // e.g., UTC-3 → Etc/GMT+3
        }
        
        Timber.d("BluetoothCentralHelper: Converted timezone: $etcGmtTimezone")
        return etcGmtTimezone
    }

    private fun writeCharacteristic(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, data: ByteArray) {
        Timber.d("BluetoothCentralHelper: Writing to characteristic ${characteristic.uuid}")
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val writeResult: Int = gatt.writeCharacteristic(
                characteristic,
                data,
                BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
            )
            if (writeResult == BluetoothStatusCodes.SUCCESS) {
                Timber.d("BluetoothCentralHelper: Write initiated successfully for ${characteristic.uuid} (status code: $writeResult)")
            } else {
                Timber.e("BluetoothCentralHelper: Write failed for ${characteristic.uuid} with error code: $writeResult")
                throw Exception("Write failed with error code: $writeResult")
            }
        } else {
            // In older APIs, use the old method returning a boolean.
            characteristic.value = data
            characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
            val writeResult = gatt.writeCharacteristic(characteristic)
            if (!writeResult) {
                Timber.e("BluetoothCentralHelper: Write operation failed for ${characteristic.uuid}")
                throw Exception("Write operation failed for ${characteristic.uuid}")
            }
            Timber.d("BluetoothCentralHelper: Write initiated successfully for ${characteristic.uuid}")
        }
    }

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt?, status: Int, newState: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                val statusMessage = "status: $status"
                Timber.e("BluetoothCentralHelper: Connection state change failed with $statusMessage")
                CrashlyticsLog.recordNonFatalError(
                    Exception("BLE connection state change failed"),
                    "BLE connection state change failed: $statusMessage"
                )
                disconnect()
                onSyncSuccess?.invoke()
                return
            }
            
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    Timber.d("BluetoothCentralHelper: Connected to GATT server")
                    CrashlyticsLog.log("BLE connected to GATT server")
                    try {
                        val discoverResult = gatt?.discoverServices() ?: false
                        if (!discoverResult) {
                            Timber.e("BluetoothCentralHelper: Failed to start service discovery")
                            CrashlyticsLog.recordNonFatalError(
                                Exception("BLE service discovery initiation failed"),
                                "BLE service discovery initiation failed"
                            )
                            disconnect()
                            onSyncSuccess?.invoke()
                        } else {
                            Timber.d("BluetoothCentralHelper: Service discovery initiated")
                        }
                    } catch (e: Exception) {
                        Timber.e("BluetoothCentralHelper: Exception during service discovery: ${e.message}")
                        CrashlyticsLog.recordNonFatalError(e, "Exception during BLE service discovery: ${e.message}")
                        disconnect()
                        onSyncSuccess?.invoke()
                    }
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    Timber.d("BluetoothCentralHelper: Disconnected from GATT server")
                    CrashlyticsLog.log("BLE disconnected from GATT server")
                    gatt?.close()
                    bluetoothGatt = null
                }
                else -> {
                    Timber.d("BluetoothCentralHelper: Connection state changed to: $newState")
                    CrashlyticsLog.log("BLE connection state changed to: $newState")
                }
            }
        }

        override fun onServicesDiscovered(gatt: BluetoothGatt?, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                Timber.d("BluetoothCentralHelper: Services discovered successfully")
                CrashlyticsLog.log("BLE services discovered successfully")
                if (gatt != null) {
                    writeTimeCharacteristic(gatt)
                } else {
                    Timber.e("BluetoothCentralHelper: GATT is null after service discovery")
                    CrashlyticsLog.recordNonFatalError(
                        Exception("GATT is null after service discovery"),
                        "GATT is null after service discovery"
                    )
                    disconnect()
                    onSyncSuccess?.invoke()
                }
            } else {
                Timber.e("BluetoothCentralHelper: Service discovery failed with status: $status")
                CrashlyticsLog.recordNonFatalError(
                    Exception("Service discovery failed with status $status"),
                    "BLE service discovery failed with status: $status"
                )
                disconnect()
                onSyncSuccess?.invoke()
            }
        }

        override fun onCharacteristicWrite(
            gatt: BluetoothGatt?,
            characteristic: BluetoothGattCharacteristic?,
            status: Int
        ) {
            Timber.d("BluetoothCentralHelper: onCharacteristicWrite: status: $status, uuid: ${characteristic?.uuid}")
            
            when (characteristic?.uuid) {
                TIME_SYNC_UUID -> {
                    timeWriteComplete = (status == BluetoothGatt.GATT_SUCCESS)
                    if (!timeWriteComplete) {
                        Timber.e("BluetoothCentralHelper: Time sync failed with status: $status")
                        CrashlyticsLog.recordNonFatalError(
                            Exception("Time sync write failed with status $status"),
                            "BLE time sync write failed with status: $status"
                        )
                        disconnect()
                        onSyncSuccess?.invoke()
                    } else {
                        Timber.d("BluetoothCentralHelper: Time sync successful")
                        CrashlyticsLog.log("BLE time sync successful")
                        
                        // Now that time write is complete, write the timezone
                        gatt?.let { writeTimezoneCharacteristic(it) }
                    }
                }
                TIME_ZONE_SYNC_UUID -> {
                    timezoneWriteComplete = (status == BluetoothGatt.GATT_SUCCESS)
                    if (!timezoneWriteComplete) {
                        Timber.e("BluetoothCentralHelper: Timezone sync failed with status: $status")
                        CrashlyticsLog.recordNonFatalError(
                            Exception("Timezone sync write failed with status $status"),
                            "BLE timezone sync write failed with status: $status"
                        )
                    } else {
                        Timber.d("BluetoothCentralHelper: Timezone sync successful")
                        CrashlyticsLog.log("BLE timezone sync successful")
                    }
                    
                    // Whether timezone write succeeded or failed, complete the sync process
                    Timber.d("BluetoothCentralHelper: Full time sync process completed")
                    CrashlyticsLog.log("BLE full time sync process completed")
                    handler.removeCallbacksAndMessages(null)
                    onSyncSuccess?.invoke()
                    disconnect()
                }
            }
        }
    }

    fun disconnect() {
        // Reset write completion flags
        timeWriteComplete = false
        timezoneWriteComplete = false
        
        bluetoothGatt?.let { gatt ->
            Timber.d("BluetoothCentralHelper: Disconnecting from device")
            try {
                gatt.disconnect()
                Timber.d("BluetoothCentralHelper: Disconnected from device")
            } catch (e: Exception) {
                Timber.e("BluetoothCentralHelper: Error disconnecting: ${e.message}")
                CrashlyticsLog.recordNonFatalError(e, "Error disconnecting from BLE device: ${e.message}")
            } finally {
                try {
                    gatt.close()
                    Timber.d("BluetoothCentralHelper: GATT connection closed")
                } catch (e: Exception) {
                    Timber.e("BluetoothCentralHelper: Error closing GATT connection: ${e.message}")
                    CrashlyticsLog.recordNonFatalError(e, "Error closing GATT connection: ${e.message}")
                }
                bluetoothGatt = null
            }
        }
    }
}