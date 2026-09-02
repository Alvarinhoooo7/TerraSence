package com.sosmartlabs.momo.main.ui.map

/**
 * Pure startup-camera resolver.
 *
 * Input is an immutable snapshot of map-related state and output is a deterministic plan.
 * This keeps camera decisions testable and independent from Activity/Adapter timing.
 */
object InitialMapCameraResolver {

    fun resolve(input: InitialCameraResolverInput): InitialCameraResolution {
        val watches = input.watches
        val mappableWatches = watches.filter { it.isMappable }

        resolvePendingFocus(input, watches, mappableWatches)?.let { return it }

        if (watches.isEmpty()) {
            return resolveWhenNoWatches(input)
        }

        if (!input.isFirstNonEmptyRender) {
            return noOpResolution()
        }

        return when {
            mappableWatches.size == 1 -> InitialCameraResolution(
                plan = InitialCameraPlan.FocusWearer(mappableWatches.first().wearerId),
                selectionWearerId = null,
                consumePendingFocus = false,
                fallbackUsed = false
            )
            mappableWatches.size > 1 -> InitialCameraResolution(
                plan = InitialCameraPlan.FitAllMappable,
                selectionWearerId = null,
                consumePendingFocus = false,
                fallbackUsed = false
            )
            else -> noOpResolution()
        }
    }

    private fun resolvePendingFocus(
        input: InitialCameraResolverInput,
        watches: List<WatchCameraState>,
        mappableWatches: List<WatchCameraState>
    ): InitialCameraResolution? {
        val pendingFocusWearerId = input.pendingFocusWearerId
        if (pendingFocusWearerId.isNullOrEmpty()) return null

        val targetWatch = watches.firstOrNull { it.matchesIdentifier(pendingFocusWearerId) }
        if (targetWatch != null && targetWatch.isMappable) {
            return InitialCameraResolution(
                plan = InitialCameraPlan.FocusWearer(targetWatch.wearerId),
                selectionWearerId = targetWatch.wearerId,
                consumePendingFocus = true,
                fallbackUsed = false
            )
        }

        return InitialCameraResolution(
            plan = fallbackPlan(
                hasMappableWatches = mappableWatches.isNotEmpty(),
                hasUserLocation = input.hasUserLocation
            ),
            selectionWearerId = targetWatch?.wearerId,
            consumePendingFocus = true,
            fallbackUsed = true
        )
    }

    private fun resolveWhenNoWatches(input: InitialCameraResolverInput): InitialCameraResolution {
        val noWatchesPlan = when {
            input.hasUserLocation -> InitialCameraPlan.CenterOnUser
            else -> InitialCameraPlan.NoOp
        }
        return InitialCameraResolution(
            plan = noWatchesPlan,
            selectionWearerId = null,
            consumePendingFocus = false,
            fallbackUsed = false
        )
    }

    private fun noOpResolution(): InitialCameraResolution {
        return InitialCameraResolution(
            plan = InitialCameraPlan.NoOp,
            selectionWearerId = null,
            consumePendingFocus = false,
            fallbackUsed = false
        )
    }

    private fun fallbackPlan(
        hasMappableWatches: Boolean,
        hasUserLocation: Boolean
    ): InitialCameraPlan {
        return when {
            hasMappableWatches -> InitialCameraPlan.FitAllMappable
            hasUserLocation -> InitialCameraPlan.CenterOnUser
            else -> InitialCameraPlan.NoOp
        }
    }
}
