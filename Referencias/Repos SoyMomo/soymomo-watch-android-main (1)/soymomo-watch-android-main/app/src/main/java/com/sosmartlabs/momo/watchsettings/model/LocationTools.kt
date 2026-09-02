package com.sosmartlabs.momo.watchsettings.model

import android.location.Location
import javax.inject.Inject

class LocationTools @Inject constructor() {
    companion object {
        private val EUROPE_GEOFENCE_CENTER = Location("Momo").apply {
            latitude = 49.5243288
            longitude = 4.6751793
        }

        private const val EUROPE_GEOFENCE_RADIUS_METERS = 3600f * 1000f
    }

    fun isLocationInEurope(latitude: Double, longitude: Double) =
        EUROPE_GEOFENCE_CENTER.distanceTo(Location("Momo").apply {
            this.longitude = longitude
            this.latitude = latitude
        }) <= EUROPE_GEOFENCE_RADIUS_METERS
}
