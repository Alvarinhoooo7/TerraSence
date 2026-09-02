package com.sosmartlabs.momo.main.ui.map

/**
 * Resolved startup decision plus side-effect metadata for UI orchestration.
 */
data class InitialCameraResolution(
    val plan: InitialCameraPlan,
    val selectionWearerId: String?,
    val consumePendingFocus: Boolean,
    val fallbackUsed: Boolean
)
