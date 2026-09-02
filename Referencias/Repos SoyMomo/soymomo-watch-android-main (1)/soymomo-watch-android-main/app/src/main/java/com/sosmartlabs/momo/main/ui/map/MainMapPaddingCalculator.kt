package com.sosmartlabs.momo.main.ui.map

/**
 * Converts the active UI layout state into map padding.
 */
object MainMapPaddingCalculator {

    fun calculate(snapshot: MainMapLayoutSnapshot): MainMapPadding {
        val bottomOverlayHeight = when {
            snapshot.isWearersLayoutVisible -> {
                val layoutTop = snapshot.wearersLayoutTopPx
                val overlayTopInRootCandidates = listOf(
                    snapshot.wearersRecyclerTopInLayoutPx,
                    snapshot.wearerSelectorTopInLayoutPx
                ).filterNotNull().map { it + layoutTop }

                if (overlayTopInRootCandidates.isNotEmpty()) {
                    (snapshot.rootHeightPx - overlayTopInRootCandidates.min()).coerceAtLeast(0)
                } else {
                    snapshot.wearersLayoutHeightPx
                }
            }
            snapshot.isNoWearersLayoutVisible -> snapshot.noWearersLayoutHeightPx
            snapshot.isLoadingLayoutVisible -> snapshot.loadingLayoutHeightPx
            else -> 0
        }

        val bottomPadding = if (snapshot.isWearersLayoutVisible) {
            bottomOverlayHeight / 3
        } else {
            bottomOverlayHeight / 2
        }

        return MainMapPadding(
            bottomOverlayHeightPx = bottomOverlayHeight,
            bottomPaddingPx = bottomPadding
        )
    }
}
