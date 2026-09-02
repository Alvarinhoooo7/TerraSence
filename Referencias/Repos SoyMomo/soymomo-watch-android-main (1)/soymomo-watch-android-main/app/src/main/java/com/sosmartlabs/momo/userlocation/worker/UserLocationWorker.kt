package com.sosmartlabs.momo.userlocation.worker

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager
import androidx.core.content.ContextCompat
import androidx.hilt.work.HiltWorker
import androidx.work.Data
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.google.android.gms.location.LocationServices
import com.google.android.gms.tasks.Tasks
import com.parse.ParseGeoPoint
import com.parse.ParseObject
import com.parse.ParseUser
import com.sosmartlabs.momo.models.UserWifi
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import timber.log.Timber
import java.util.*
import java.util.concurrent.ExecutionException
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

@HiltWorker
class UserLocationWorker @AssistedInject constructor(
    @Assisted private val appContext: Context,
    @Assisted workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

    private val success = "Success"
    private val failure = "Failure"

    private fun isLocationPermissionGranted() =
        ContextCompat.checkSelfPermission(appContext, Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(appContext, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED

    private fun isNetworkPermissionGranted() =
        ContextCompat.checkSelfPermission(appContext, Manifest.permission.ACCESS_NETWORK_STATE) ==
                PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(appContext, Manifest.permission.CHANGE_NETWORK_STATE) ==
                PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(appContext, Manifest.permission.INTERNET) ==
                PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(appContext, Manifest.permission.ACCESS_WIFI_STATE) ==
                PackageManager.PERMISSION_GRANTED

    override fun doWork(): Result {
        Timber.d("UserLocationWorker: Starting doWork execution")
        try {
            Timber.d("UserLocationWorker: Retrieving last location within one minute")
            val lastLocation = getLastLocationWithinOneMinute()
            if (lastLocation == null) {
                Timber.d("UserLocationWorker: No valid last location available")
            } else {
                Timber.d("UserLocationWorker: Obtained last location: $lastLocation")
            }

            Timber.d("UserLocationWorker: Obtaining WiFi scan results")
            val wifiScanResults = getListOfWifiScan()
            if (wifiScanResults == null) {
                Timber.d("UserLocationWorker: No WiFi scan results available")
            } else {
                Timber.d("UserLocationWorker: Retrieved ${wifiScanResults.size} WiFi scan results")
            }

            val userLocations = mutableListOf<UserWifi>()
            if (lastLocation != null && wifiScanResults != null) {
                Timber.d("UserLocationWorker: Processing WiFi scan results")
                wifiScanResults.forEach { scanResult ->
                    try {
                        val userWifi = UserWifi().apply {
                            location = ParseGeoPoint(lastLocation.latitude, lastLocation.longitude)
                            accuracy = lastLocation.accuracy.roundToInt()
                            user = ParseUser.getCurrentUser()
                            mac = scanResult.BSSID.replace(":", "").uppercase(Locale.getDefault())
                            ssid = scanResult.SSID
                            level = scanResult.level
                        }
                        userLocations.add(userWifi)
                        Timber.d("UserLocationWorker: Processed scan result - SSID: ${scanResult.SSID}, BSSID: ${scanResult.BSSID}")
                    } catch (e: Exception) {
                        Timber.e(e, "UserLocationWorker: Error processing individual scan result: $scanResult")
                        CrashlyticsLog.recordNonFatalError(e, "Error processing individual WiFi scan result in UserLocationWorker")
                    }
                }
                Timber.d("UserLocationWorker: Saving ${userLocations.size} user WiFi records")
                ParseObject.saveAll(userLocations)
                Timber.d("UserLocationWorker: Successfully saved WiFi data")
            } else {
                Timber.e("UserLocationWorker: Missing required data; cannot process WiFi records")
            }
            val output: Data = workDataOf(success to userLocations.size)
            Timber.d("UserLocationWorker: doWork completed successfully with ${userLocations.size} records")
            return Result.success(output)
        } catch (e: Exception) {
            Timber.e(e, "UserLocationWorker: Exception during doWork execution")
            CrashlyticsLog.recordNonFatalError(e, "Error in doWork of UserLocationWorker")
            val output: Data = workDataOf(failure to e.toString())
            return Result.failure(output)
        }
    }

    private fun getLastLocationWithinOneMinute(): Location? {
        Timber.d("UserLocationWorker: Attempting to retrieve last location")
        try {
            if (!isLocationPermissionGranted()) {
                Timber.e("UserLocationWorker: Location permission not granted")
                return null
            }
            val fusedLocationClient = LocationServices.getFusedLocationProviderClient(appContext)
            Timber.d("UserLocationWorker: Waiting for fused location result")
            val location = Tasks.await(fusedLocationClient.lastLocation)
            if (location != null) {
                val currentTime = System.currentTimeMillis()
                val timeDiff = currentTime - location.time
                if (timeDiff < TimeUnit.MINUTES.toMillis(1) && location.accuracy < 100) {
                    Timber.d("UserLocationWorker: Valid location received (timeDiff: ${timeDiff}ms, accuracy: ${location.accuracy})")
                    return location
                } else {
                    Timber.d("UserLocationWorker: Location outdated or insufficiently accurate (timeDiff: ${timeDiff}ms, accuracy: ${location.accuracy})")
                }
            } else {
                Timber.d("UserLocationWorker: Fused location service returned null")
            }
        } catch (e: SecurityException) {
            Timber.e(e, "UserLocationWorker: SecurityException while retrieving location")
            CrashlyticsLog.recordNonFatalError(e, "SecurityException in getLastLocationWithinOneMinute")
        } catch (e: ExecutionException) {
            Timber.e(e, "UserLocationWorker: ExecutionException while retrieving location")
            CrashlyticsLog.recordNonFatalError(e, "ExecutionException in getLastLocationWithinOneMinute")
        } catch (e: InterruptedException) {
            Timber.e(e, "UserLocationWorker: InterruptedException while retrieving location")
            CrashlyticsLog.recordNonFatalError(e, "InterruptedException in getLastLocationWithinOneMinute")
        }
        Timber.d("UserLocationWorker: No valid location found; returning null")
        return null
    }

    @SuppressLint("MissingPermission")
    private fun getListOfWifiScan(): List<ScanResult>? {
        Timber.d("UserLocationWorker: Attempting to retrieve WiFi scan results")
        if (!isNetworkPermissionGranted()) {
            Timber.e("UserLocationWorker: Network permission not granted")
            return null
        }
        try {
            val wifiManager = appContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            if (wifiManager.wifiState == WifiManager.WIFI_STATE_ENABLED) {
                val scanResults = wifiManager.scanResults
                    .asSequence()
                    .filter { it.level > -70 && it.level < 0 }
                    .filter { it.SSID.isNotEmpty() && it.BSSID.isNotEmpty() }
                    .filterNot { HotspotDetector.isMobileHotspot(it) }
                    .toList()
                Timber.d("UserLocationWorker: Retrieved ${scanResults.size} valid WiFi scan results")
                return scanResults
            } else {
                Timber.e("UserLocationWorker: WiFi is disabled on the device")
            }
        } catch (e: Exception) {
            Timber.e(e, "UserLocationWorker: Exception while retrieving WiFi scan results")
            CrashlyticsLog.recordNonFatalError(e, "Error in getListOfWifiScan of UserLocationWorker")
        }
        return null
    }
}