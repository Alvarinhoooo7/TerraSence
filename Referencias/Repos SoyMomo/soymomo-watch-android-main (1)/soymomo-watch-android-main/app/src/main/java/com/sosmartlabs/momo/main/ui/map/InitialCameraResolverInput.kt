package com.sosmartlabs.momo.main.ui.map

/**
 * Snapshot used to resolve initial map camera behavior.
 */
data class InitialCameraResolverInput(
    val watches: List<WatchCameraState>,
    val pendingFocusWearerId: String?,
    val notificationSource: String?,
    val hasUserLocation: Boolean,
    val isFirstNonEmptyRender: Boolean
)
