package com.sosmartlabs.momo.main.ui.map

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SelectionStateResolverTest {

    @Test
    fun `empty watches returns null selection`() {
        val index = SelectionStateResolver.resolveSelectedIndex(
            watches = emptyList(),
            selectedIdentifier = "w-1"
        )

        assertNull(index)
    }

    @Test
    fun `missing selected identifier falls back to first`() {
        val index = SelectionStateResolver.resolveSelectedIndex(
            watches = listOf(
                snapshot(wearerId = "w-1", deviceId = "d-1", isConnected = true),
                snapshot(wearerId = "w-2", deviceId = "d-2", isConnected = false)
            ),
            selectedIdentifier = "missing"
        )

        assertEquals(0, index)
    }

    @Test
    fun `selection follows wearer id after reorder`() {
        val index = SelectionStateResolver.resolveSelectedIndex(
            watches = listOf(
                snapshot(wearerId = "w-2", deviceId = "d-2", isConnected = true),
                snapshot(wearerId = "w-1", deviceId = "d-1", isConnected = true)
            ),
            selectedIdentifier = "w-1"
        )

        assertEquals(1, index)
    }

    @Test
    fun `selection matches device id`() {
        val index = SelectionStateResolver.resolveSelectedIndex(
            watches = listOf(
                snapshot(wearerId = "w-1", deviceId = "d-1", isConnected = true),
                snapshot(wearerId = "w-2", deviceId = "d-2", isConnected = false)
            ),
            selectedIdentifier = "d-2"
        )

        assertEquals(1, index)
    }

    @Test
    fun `disconnected card visible only when selected watch disconnected`() {
        assertFalse(
            SelectionStateResolver.shouldShowDisconnectedCard(
                selectedWatch = snapshot(wearerId = "w-1", deviceId = "d-1", isConnected = true)
            )
        )
        assertTrue(
            SelectionStateResolver.shouldShowDisconnectedCard(
                selectedWatch = snapshot(wearerId = "w-2", deviceId = "d-2", isConnected = false)
            )
        )
        assertFalse(SelectionStateResolver.shouldShowDisconnectedCard(selectedWatch = null))
    }

    private fun snapshot(
        wearerId: String,
        deviceId: String?,
        isConnected: Boolean
    ): WatchSelectionSnapshot {
        return WatchSelectionSnapshot(
            wearerId = wearerId,
            deviceId = deviceId,
            isConnected = isConnected
        )
    }
}
