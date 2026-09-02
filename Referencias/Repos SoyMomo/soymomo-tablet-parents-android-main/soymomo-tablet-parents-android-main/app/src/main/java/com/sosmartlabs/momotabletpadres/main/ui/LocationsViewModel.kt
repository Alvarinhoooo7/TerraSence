package com.sosmartlabs.momotabletpadres.main.ui

import java.util.concurrent.TimeUnit
import android.Manifest
import android.app.Application
import android.content.pm.PackageManager
import android.location.Location
import android.os.Looper
import androidx.core.app.ActivityCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.Priority
import dagger.hilt.android.lifecycle.HiltViewModel
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class LocationsViewModel @Inject constructor(
    application: Application,
    private val fusedLocationClient: FusedLocationProviderClient
) : AndroidViewModel(application) {

    private val _locations = MutableLiveData<Location>()
    val locations: LiveData<Location> get() = _locations

    private val locationCallback: LocationCallback by lazy {
        object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                Timber.d("LocationsViewModel: Location update received with ${locationResult.locations.size} locations")
                for (location in locationResult.locations) {
                    _locations.value = location
                    Timber.d("LocationsViewModel: New location - Lat: ${location.latitude}, Long: ${location.longitude}, Accuracy: ${location.accuracy}m")
                }
            }
        }
    }

    private val locationRequest: LocationRequest by lazy {
        LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, TimeUnit.SECONDS.toMillis(10))
            .setMinUpdateIntervalMillis(TimeUnit.SECONDS.toMillis(5))
            .build()
    }

    /**
     * Starts location updates
     */
    fun startLocationUpdates() {
        Timber.d("LocationsViewModel: Starting location updates")
        if (ActivityCompat.checkSelfPermission(
                getApplication(),
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(
                getApplication(),
                Manifest.permission.ACCESS_COARSE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            Timber.w("LocationsViewModel: Location permissions not granted")
            return
        }

        fusedLocationClient.lastLocation.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                task.result?.let { location ->
                    Timber.d("LocationsViewModel: Last known location retrieved - Lat: ${location.latitude}, Long: ${location.longitude}")
                    _locations.value = location
                } ?: Timber.w("LocationsViewModel: Last known location is null")
            } else {
                Timber.e("LocationsViewModel: Failed to get last location: ${task.exception?.message}")
            }
        }

        fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
        Timber.d("LocationsViewModel: Location updates requested")
    }

    /**
     * Stops location updates
     */
    fun stopLocationUpdates() {
        Timber.d("LocationsViewModel: Stopping location updates")
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }

    override fun onCleared() {
        Timber.d("LocationsViewModel: ViewModel cleared, stopping location updates")
        stopLocationUpdates()
        super.onCleared()
    }
}