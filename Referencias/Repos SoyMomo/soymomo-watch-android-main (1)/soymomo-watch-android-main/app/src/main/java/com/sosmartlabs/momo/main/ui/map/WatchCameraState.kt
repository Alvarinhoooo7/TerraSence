package com.sosmartlabs.momo.main.ui.map

/**
 * Minimal camera-focused projection of a watch item.
 */
data class WatchCameraState(
    val wearerId: String,
    val deviceId: String?,
    val isActive: Boolean,
    val hasLocationPermission: Boolean,
    val isConnected: Boolean,
    val hasLocation: Boolean
) {
    val isMappable: Boolean
        get() = isActive && hasLocationPermission && isConnected && hasLocation

    /**
     * Notification payloads may provide either wearer objectId or watch/device id.
     */
    fun matchesIdentifier(identifier: String): Boolean {
        return wearerId == identifier || deviceId == identifier
    }
}
