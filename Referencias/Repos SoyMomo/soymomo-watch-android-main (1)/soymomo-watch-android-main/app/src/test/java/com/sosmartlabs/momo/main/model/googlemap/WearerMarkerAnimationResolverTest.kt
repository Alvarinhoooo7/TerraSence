package com.sosmartlabs.momo.main.model.googlemap

import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.SphericalUtil
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.roundToLong

class WearerMarkerAnimationResolverTest {

    @Test
    fun `duration follows derived speed from previous and new point`() {
        val from = LatLng(0.0, 0.0)
        val to = LatLng(0.0, 0.001)
        val distanceMeters = SphericalUtil.computeDistanceBetween(from, to)
        val expectedDurationMs = (distanceMeters / (distanceMeters / 10.0) * 1_000.0)
            .roundToLong()
            .coerceIn(
                WearerMarkerAnimationResolver.MIN_DURATION_MS,
                WearerMarkerAnimationResolver.MAX_DURATION_MS
            )

        val spec = WearerMarkerAnimationResolver.resolve(
            displayedFrom = from,
            rawFrom = from,
            rawTo = to,
            previousTimestampMs = 0L,
            currentTimestampMs = 10_000L
        )

        assertTrue(spec.shouldAnimate)
        assertEquals(expectedDurationMs, spec.durationMs)
        assertEquals(distanceMeters / 10.0, spec.speedMetersPerSecond, 0.001)
    }

    @Test
    fun `duration uses displayed distance when previous animation was mid-flight`() {
        val rawFrom = LatLng(0.0, 0.0)
        val displayedFrom = LatLng(0.0, 0.0005)
        val rawTo = LatLng(0.0, 0.001)
        val displayDistanceMeters = SphericalUtil.computeDistanceBetween(displayedFrom, rawTo)
        val rawDistanceMeters = SphericalUtil.computeDistanceBetween(rawFrom, rawTo)
        val derivedSpeedMetersPerSecond = rawDistanceMeters / 10.0
        val expectedDurationMs = (displayDistanceMeters / derivedSpeedMetersPerSecond * 1_000.0)
            .roundToLong()
            .coerceIn(
                WearerMarkerAnimationResolver.MIN_DURATION_MS,
                WearerMarkerAnimationResolver.MAX_DURATION_MS
            )

        val spec = WearerMarkerAnimationResolver.resolve(
            displayedFrom = displayedFrom,
            rawFrom = rawFrom,
            rawTo = rawTo,
            previousTimestampMs = 0L,
            currentTimestampMs = 10_000L
        )

        assertTrue(spec.shouldAnimate)
        assertEquals(expectedDurationMs, spec.durationMs)
    }

    @Test
    fun `missing timestamps fall back to configured speed`() {
        val from = LatLng(0.0, 0.0)
        val to = LatLng(0.0, 0.001)
        val distanceMeters = SphericalUtil.computeDistanceBetween(from, to)
        val expectedDurationMs = (distanceMeters / WearerMarkerAnimationResolver.FALLBACK_SPEED_METERS_PER_SECOND * 1_000.0)
            .roundToLong()
            .coerceIn(
                WearerMarkerAnimationResolver.MIN_DURATION_MS,
                WearerMarkerAnimationResolver.MAX_DURATION_MS
            )

        val spec = WearerMarkerAnimationResolver.resolve(
            displayedFrom = from,
            rawFrom = from,
            rawTo = to,
            previousTimestampMs = null,
            currentTimestampMs = null
        )

        assertTrue(spec.shouldAnimate)
        assertEquals(expectedDurationMs, spec.durationMs)
        assertEquals(WearerMarkerAnimationResolver.FALLBACK_SPEED_METERS_PER_SECOND, spec.speedMetersPerSecond, 0.001)
    }

    @Test
    fun `distance outside configured range skips animation`() {
        val tooCloseSpec = WearerMarkerAnimationResolver.resolve(
            displayedFrom = LatLng(0.0, 0.0),
            rawFrom = LatLng(0.0, 0.0),
            rawTo = LatLng(0.0, 0.00001),
            previousTimestampMs = 0L,
            currentTimestampMs = 1_000L
        )
        val tooFarSpec = WearerMarkerAnimationResolver.resolve(
            displayedFrom = LatLng(0.0, 0.0),
            rawFrom = LatLng(0.0, 0.0),
            rawTo = LatLng(0.0, 0.03),
            previousTimestampMs = 0L,
            currentTimestampMs = 60_000L
        )

        assertFalse(tooCloseSpec.shouldAnimate)
        assertFalse(tooFarSpec.shouldAnimate)
    }
}
