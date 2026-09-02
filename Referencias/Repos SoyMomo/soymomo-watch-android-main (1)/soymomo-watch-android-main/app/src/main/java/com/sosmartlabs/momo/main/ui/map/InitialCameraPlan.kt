package com.sosmartlabs.momo.main.ui.map

/**
 * Intent-driven camera actions for initial map rendering.
 */
sealed interface InitialCameraPlan {
    data class FocusWearer(
        val wearerId: String,
        val zoom: Float = BALANCED_SINGLE_WATCH_ZOOM
    ) : InitialCameraPlan

    data object FitAllMappable : InitialCameraPlan
    data object CenterOnUser : InitialCameraPlan
    data object NoOp : InitialCameraPlan
}
