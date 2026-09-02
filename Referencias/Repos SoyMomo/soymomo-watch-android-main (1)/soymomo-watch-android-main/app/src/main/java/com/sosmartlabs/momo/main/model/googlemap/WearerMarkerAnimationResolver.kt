package com.sosmartlabs.momo.main.model.googlemap

import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.SphericalUtil
import kotlin.math.roundToLong

data class WearerMarkerAnimationSpec(
    val shouldAnimate: Boolean,
    val durationMs: Long,
    val displayDistanceMeters: Double,
    val speedMetersPerSecond: Double
)

object WearerMarkerAnimationResolver {

    internal const val MIN_DURATION_MS = 500L
    internal const val MAX_DURATION_MS = 4_000L
    internal const val FALLBACK_SPEED_METERS_PER_SECOND = 12.0
    internal const val MIN_ANIMATED_DISTANCE_METERS = 8.0
    internal const val MAX_ANIMATED_DISTANCE_METERS = 2_000.0

    fun resolve(
        displayedFrom: LatLng,
        rawFrom: LatLng?,
        rawTo: LatLng,
        previousTimestampMs: Long?,
        currentTimestampMs: Long?
    ): WearerMarkerAnimationSpec {
        val displayDistanceMeters = SphericalUtil.computeDistanceBetween(displayedFrom, rawTo)

        if (displayDistanceMeters < MIN_ANIMATED_DISTANCE_METERS ||
            displayDistanceMeters > MAX_ANIMATED_DISTANCE_METERS
        ) {
            return WearerMarkerAnimationSpec(
                shouldAnimate = false,
                durationMs = 0L,
                displayDistanceMeters = displayDistanceMeters,
                speedMetersPerSecond = FALLBACK_SPEED_METERS_PER_SECOND
            )
        }

        val referenceStart = rawFrom ?: displayedFrom
        val referenceDistanceMeters = SphericalUtil.computeDistanceBetween(referenceStart, rawTo)
        val elapsedSeconds = previousTimestampMs
            ?.let { previous ->
                currentTimestampMs
                    ?.takeIf { current -> current > previous }
                    ?.let { current -> (current - previous) / 1000.0 }
            }
            ?.takeIf { it > 0.0 }

        val speedMetersPerSecond = elapsedSeconds
            ?.let { seconds -> referenceDistanceMeters / seconds }
            ?.takeIf { it.isFinite() && it > 0.0 }
            ?: FALLBACK_SPEED_METERS_PER_SECOND

        val durationMs = (displayDistanceMeters / speedMetersPerSecond * 1_000.0)
            .roundToLong()
            .coerceIn(MIN_DURATION_MS, MAX_DURATION_MS)

        return WearerMarkerAnimationSpec(
            shouldAnimate = true,
            durationMs = durationMs,
            displayDistanceMeters = displayDistanceMeters,
            speedMetersPerSecond = speedMetersPerSecond
        )
    }
}
