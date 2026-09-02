package com.sosmartlabs.momo.map.marker

sealed class MarkerPayload {
    data class Wearer(val wearerId: String) : MarkerPayload()
    data class Geofence(val geofenceId: String, val geofenceName: String?) : MarkerPayload()
    data class LocationPoint(val pointIndex: Int?) : MarkerPayload()
    data class Avatar(val avatarId: String) : MarkerPayload()
}
