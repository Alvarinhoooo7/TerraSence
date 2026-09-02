package com.sosmartlabs.momo.main.model.locations

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.os.Looper
import androidx.core.app.ActivityCompat
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import com.google.android.gms.location.*
import dagger.hilt.android.qualifiers.ActivityContext
import java.util.concurrent.TimeUnit
import javax.inject.Inject

/**
 * Helper class for accessing to device locations
 * @param context Activity context
 * @param fusedLocationClient Client for obtaining locations
 */
class LocationsRetriever @Inject constructor(@ActivityContext private val context: Context,
                                             private val fusedLocationClient: FusedLocationProviderClient): DefaultLifecycleObserver {

    /**
     * [LiveData] for sharing retrieved locations with external observer.
     * Private class attribute, externally must be acessed through [locations] property instead
     */
    private val _locations = MutableLiveData<Location>()

    /**
     * [LiveData] for sharing retrieved locations with external observer.
     */
    val locations: LiveData<Location> get() = _locations

    /**
     * [LocationRequest] for been used in the main view of this app
     */
    private val locationRequest: LocationRequest by lazy {
        LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, TimeUnit.SECONDS.toMillis(10))
            .setMinUpdateIntervalMillis(TimeUnit.SECONDS.toMillis(5))
            .build()
    }

    /**
     * [LocationCallback] for listening the locations from [FusedLocationProviderClient]
     */
    private val locationCallback: LocationCallback by lazy {
        object: LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (location in locationResult.locations) {
                    _locations.value = location
                }
            }
        }
    }

    /**
     * Starts the location updates when the Lifecycle owner is resumed
     */
    override fun onResume(owner: LifecycleOwner) {
        if (ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            // Here we just make sure we have the permissions before request location updates. The
            // logic for request permissions to user, if necessary, should be handled elsewhere.
            return
        }

        fusedLocationClient.lastLocation.addOnCompleteListener {
            if (it.isSuccessful) _locations.value = it.result
        }

        fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
    }

    /**
     * Stops the location updates when the Lifecycle owner is paused
     */
    override fun onPause(owner: LifecycleOwner) {
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }
}