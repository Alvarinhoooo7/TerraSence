package com.sosmartlabs.momo.main.ui.map

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class InitialMapCameraResolverTest {

    @Test
    fun `zero watches with user location centers on user`() {
        val resolution = InitialMapCameraResolver.resolve(
            InitialCameraResolverInput(
                watches = emptyList(),
                pendingFocusWearerId = null,
                notificationSource = null,
                hasUserLocation = true,
                isFirstNonEmptyRender = false
            )
        )

        assertEquals(InitialCameraPlan.CenterOnUser, resolution.plan)
        assertFalse(resolution.consumePendingFocus)
    }

    @Test
    fun `first non-empty render with empty camera states and user location centers on user`() {
        val resolution = InitialMapCameraResolver.resolve(
            InitialCameraResolverInput(
                watches = emptyList(),
                pendingFocusWearerId = null,
                notificationSource = null,
                hasUserLocation = true,
                isFirstNonEmptyRender = true
            )
        )

        assertEquals(InitialCameraPlan.CenterOnUser, resolution.plan)
        assertFalse(resolution.consumePendingFocus)
    }

    @Test
    fun `first non-empty render with empty camera states and no user location returns no-op`() {
        val resolution = InitialMapCameraResolver.resolve(
            InitialCameraResolverInput(
                watches = emptyList(),
                pendingFocusWearerId = null,
                notificationSource = null,
                hasUserLocation = false,
                isFirstNonEmptyRender = true
            )
        )

        assertEquals(InitialCameraPlan.NoOp, resolution.plan)
        assertFalse(resolution.consumePendingFocus)
    }

    @Test
    fun `one mappable watch focuses wearer with balanced zoom`() {
        val watch = watchState("w1", mappable = true)
        val resolution = InitialMapCameraResolver.resolve(
            InitialCameraResolverInput(
                watches = listOf(watch),
                pendingFocusWearerId = null,
                notificationSource = null,
                hasUserLocation = false,
                isFirstNonEmptyRender = true
            )
        )

        val focusPlan = resolution.plan as InitialCameraPlan.FocusWearer
        assertEquals("w1", focusPlan.wearerId)
        assertEquals(BALANCED_SINGLE_WATCH_ZOOM, focusPlan.zoom)
    }

    @Test
    fun `multiple mappable watches fit all markers`() {
        val resolution = InitialMapCameraResolver.resolve(
            InitialCameraResolverInput(
                watches = listOf(
                    watchState("w1", mappable = true),
                    watchState("w2", mappable = true)
                ),
                pendingFocusWearerId = null,
                notificationSource = null,
                hasUserLocation = false,
                isFirstNonEmptyRender = true
            )
        )

        assertEquals(InitialCameraPlan.FitAllMappable, resolution.plan)
    }

    @Test
    fun `notification target mappable focuses target`() {
        val resolution = InitialMapCameraResolver.resolve(
            InitialCameraResolverInput(
                watches = listOf(
                    watchState("w1", mappable = true),
                    watchState("w2", mappable = true)
                ),
                pendingFocusWearerId = "w2",
                notificationSource = "sos",
                hasUserLocation = true,
                isFirstNonEmptyRender = false
            )
        )

        assertEquals(InitialCameraPlan.FocusWearer("w2"), resolution.plan)
        assertEquals("w2", resolution.selectionWearerId)
        assertTrue(resolution.consumePendingFocus)
        assertFalse(resolution.fallbackUsed)
    }

    @Test
    fun `notification target using device id focuses matching wearer`() {
        val resolution = InitialMapCameraResolver.resolve(
            InitialCameraResolverInput(
                watches = listOf(
                    watchState("wearer-1", mappable = true, deviceId = "device-1"),
                    watchState("wearer-2", mappable = true, deviceId = "device-2")
                ),
                pendingFocusWearerId = "device-2",
                notificationSource = "geofence",
                hasUserLocation = true,
                isFirstNonEmptyRender = false
            )
        )

        assertEquals(InitialCameraPlan.FocusWearer("wearer-2"), resolution.plan)
        assertEquals("wearer-2", resolution.selectionWearerId)
        assertTrue(resolution.consumePendingFocus)
        assertFalse(resolution.fallbackUsed)
    }

    @Test
    fun `sos notification target using device id focuses matching wearer`() {
        val resolution = InitialMapCameraResolver.resolve(
            InitialCameraResolverInput(
                watches = listOf(
                    watchState("wearer-1", mappable = true, deviceId = "device-1"),
                    watchState("wearer-2", mappable = true, deviceId = "device-2")
                ),
                pendingFocusWearerId = "device-1",
                notificationSource = "sos",
                hasUserLocation = true,
                isFirstNonEmptyRender = false
            )
        )

        assertEquals(InitialCameraPlan.FocusWearer("wearer-1"), resolution.plan)
        assertEquals("wearer-1", resolution.selectionWearerId)
        assertTrue(resolution.consumePendingFocus)
        assertFalse(resolution.fallbackUsed)
    }

    @Test
    fun `notification target not mappable selects target and falls back to fit all`() {
        val resolution = InitialMapCameraResolver.resolve(
            InitialCameraResolverInput(
                watches = listOf(
                    watchState("target", mappable = false),
                    watchState("other", mappable = true)
                ),
                pendingFocusWearerId = "target",
                notificationSource = "geofence",
                hasUserLocation = true,
                isFirstNonEmptyRender = false
            )
        )

        assertEquals(InitialCameraPlan.FitAllMappable, resolution.plan)
        assertEquals("target", resolution.selectionWearerId)
        assertTrue(resolution.consumePendingFocus)
        assertTrue(resolution.fallbackUsed)
    }

    @Test
    fun `notification target missing falls back and consumes pending focus`() {
        val resolution = InitialMapCameraResolver.resolve(
            InitialCameraResolverInput(
                watches = listOf(watchState("w1", mappable = true)),
                pendingFocusWearerId = "missing",
                notificationSource = "sos",
                hasUserLocation = true,
                isFirstNonEmptyRender = false
            )
        )

        assertEquals(InitialCameraPlan.FitAllMappable, resolution.plan)
        assertNull(resolution.selectionWearerId)
        assertTrue(resolution.consumePendingFocus)
        assertTrue(resolution.fallbackUsed)
    }

    @Test
    fun `subsequent render with watches and no pending focus returns no-op`() {
        val resolution = InitialMapCameraResolver.resolve(
            InitialCameraResolverInput(
                watches = listOf(watchState("w1", mappable = true)),
                pendingFocusWearerId = null,
                notificationSource = null,
                hasUserLocation = true,
                isFirstNonEmptyRender = false
            )
        )

        assertEquals(InitialCameraPlan.NoOp, resolution.plan)
        assertFalse(resolution.consumePendingFocus)
        assertFalse(resolution.fallbackUsed)
    }

    @Test
    fun `no mappable watches with user location returns no-op for non-empty state`() {
        val resolution = InitialMapCameraResolver.resolve(
            InitialCameraResolverInput(
                watches = listOf(
                    watchState("w1", mappable = false),
                    watchState("w2", mappable = false)
                ),
                pendingFocusWearerId = null,
                notificationSource = null,
                hasUserLocation = true,
                isFirstNonEmptyRender = true
            )
        )

        assertEquals(InitialCameraPlan.NoOp, resolution.plan)
    }

    private fun watchState(
        wearerId: String,
        mappable: Boolean,
        deviceId: String? = null
    ): WatchCameraState {
        return if (mappable) {
            WatchCameraState(
                wearerId = wearerId,
                deviceId = deviceId,
                isActive = true,
                hasLocationPermission = true,
                isConnected = true,
                hasLocation = true
            )
        } else {
            WatchCameraState(
                wearerId = wearerId,
                deviceId = deviceId,
                isActive = true,
                hasLocationPermission = true,
                isConnected = false,
                hasLocation = false
            )
        }
    }
}
