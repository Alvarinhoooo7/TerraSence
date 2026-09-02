package com.sosmartlabs.momo.main.ui.map

/**
 * Snapshot of the visible bottom UI used to compute map padding.
 *
 * All pixel positions must be in the root coordinate frame (relative to the root view),
 * not relative to intermediate parent views.
 */
data class MainMapLayoutSnapshot(
    val rootHeightPx: Int,
    val isWearersLayoutVisible: Boolean,
    val wearersLayoutHeightPx: Int,
    val wearersLayoutTopPx: Int,
    val wearersRecyclerTopInLayoutPx: Int?,
    val wearerSelectorTopInLayoutPx: Int?,
    val isNoWearersLayoutVisible: Boolean,
    val noWearersLayoutHeightPx: Int,
    val isLoadingLayoutVisible: Boolean,
    val loadingLayoutHeightPx: Int
)
