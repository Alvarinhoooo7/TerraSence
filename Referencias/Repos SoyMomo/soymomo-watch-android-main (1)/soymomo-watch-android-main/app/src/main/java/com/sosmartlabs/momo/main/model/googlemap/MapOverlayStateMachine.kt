package com.sosmartlabs.momo.main.model.googlemap

class MapOverlayStateMachine {

    sealed class OverlayTarget {
        object None : OverlayTarget()
        data class Wearer(val wearerId: String) : OverlayTarget()
        data class Geofence(val geofenceId: String) : OverlayTarget()
    }

    enum class RestorePolicy {
        RESTORE_ALLOWED,
        RESTORE_SUPPRESSED
    }

    var preferredWearerId: String? = null
        private set

    var visibleTarget: OverlayTarget = OverlayTarget.None
        private set

    var restorePolicy: RestorePolicy = RestorePolicy.RESTORE_SUPPRESSED
        private set

    fun selectPreferredWearer(wearerId: String?) {
        preferredWearerId = wearerId
        if (wearerId == null) {
            visibleTarget = OverlayTarget.None
            restorePolicy = RestorePolicy.RESTORE_SUPPRESSED
            return
        }

        restorePolicy = RestorePolicy.RESTORE_ALLOWED
        if (!isShowingWearer(wearerId)) {
            visibleTarget = OverlayTarget.None
        }
    }

    fun showWearer(wearerId: String) {
        preferredWearerId = wearerId
        visibleTarget = OverlayTarget.Wearer(wearerId)
        restorePolicy = RestorePolicy.RESTORE_ALLOWED
    }

    fun showGeofence(geofenceId: String) {
        visibleTarget = OverlayTarget.Geofence(geofenceId)
        restorePolicy = RestorePolicy.RESTORE_SUPPRESSED
    }

    fun hideByUser() {
        visibleTarget = OverlayTarget.None
        restorePolicy = RestorePolicy.RESTORE_SUPPRESSED
    }

    fun hideProgrammatically() {
        visibleTarget = OverlayTarget.None
    }

    fun handleWearerMarkerRemoved(wearerId: String) {
        if (isShowingWearer(wearerId)) {
            visibleTarget = OverlayTarget.None
        }
    }

    fun handleGeofenceMarkersUpdated(availableGeofenceIds: Set<String>) {
        val target = visibleTarget as? OverlayTarget.Geofence ?: return
        if (target.geofenceId !in availableGeofenceIds) {
            visibleTarget = OverlayTarget.None
        }
    }

    fun shouldRestorePreferredWearer(): Boolean {
        return preferredWearerId != null &&
            restorePolicy == RestorePolicy.RESTORE_ALLOWED &&
            visibleTarget is OverlayTarget.None
    }

    fun isShowingWearer(wearerId: String): Boolean {
        return visibleTarget == OverlayTarget.Wearer(wearerId)
    }

    fun isShowingGeofence(geofenceId: String): Boolean {
        return visibleTarget == OverlayTarget.Geofence(geofenceId)
    }
}
