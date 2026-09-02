package com.sosmartlabs.momo.testlab

import com.sosmartlabs.momo.addfirstwatch.model.WatchAvailabilityStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Covers the pure (non-Parse) surface of the debug Test Lab: magic-value recognition, the
 * watch-availability matrix, and the skip-payment toggle. Fabrication of Parse objects is
 * exercised manually on-device (it needs an initialized Parse SDK).
 */
class TestLabTest {

    @Test
    fun `magic IMEIs map to their matrix statuses`() {
        assertEquals(
            WatchAvailabilityStatus.SUCCESS_WATCH_BELONGS_TO_OTHER_USER,
            TestLab.mockWatchAvailability("9900000004")?.status
        )
        assertEquals(
            WatchAvailabilityStatus.WATCH_ALREADY_LINKED,
            TestLab.mockWatchAvailability("9900000005")?.status
        )
        assertEquals(
            WatchAvailabilityStatus.WATCH_ALREADY_LINKED_MISSING_PRE_INSERTED_SIM_ACTIVATION,
            TestLab.mockWatchAvailability("9900000006")?.status
        )
        assertEquals(
            WatchAvailabilityStatus.WATCH_NOT_FOUND,
            TestLab.mockWatchAvailability("9900000007")?.status
        )
    }

    @Test
    fun `belongs-to-other magic IMEI carries fake admin info and a permission-requested addWatch code`() {
        assertNotNull(TestLab.mockWatchAvailability("9900000004")?.adminInfo)
        assertEquals(0, TestLab.mockAddWatchResult("9900000004"))
        assertNull(TestLab.mockAddWatchResult("9900000005"))
    }

    @Test
    fun `real device ids are never intercepted`() {
        assertNull(TestLab.mockWatchAvailability("9505083432"))
        assertNull(TestLab.mockWatchAvailability("0903995142"))
        assertNull(TestLab.mockAddWatchResult("9505083432"))
    }

    @Test
    fun `magic ICCIDs are recognised and real ones are not`() {
        assertTrue(TestLab.isTestSim("8934999900000000001"))
        assertTrue(TestLab.isTestSim("8946999900000000001"))
        assertTrue(TestLab.isTestSim("8956999900000000001"))
        assertTrue(TestLab.isTestSim("8934999900000000002"))
        assertTrue(TestLab.isTestSim("8934999900000000003"))
        assertFalse(TestLab.isTestSim("8934071234567890123"))
        assertFalse(TestLab.isTestSim(null))
        assertFalse(TestLab.isTestSim(""))
    }

    @Test
    fun `magic sims always skip payment, real sims only when toggled`() {
        assertTrue(TestLab.shouldSkipPayment("8934999900000000001"))
        assertFalse(TestLab.shouldSkipPayment("8934071234567890123"))

        assertTrue(TestLab.toggleSkipPayment())
        assertTrue(TestLab.shouldSkipPayment("8934071234567890123"))
        assertTrue(TestLab.shouldSkipPayment(null))

        assertFalse(TestLab.toggleSkipPayment())
        assertFalse(TestLab.shouldSkipPayment("8934071234567890123"))
    }

    @Test
    fun `test lab is available in debug builds`() {
        assertTrue(TestLab.isAvailable)
    }
}
