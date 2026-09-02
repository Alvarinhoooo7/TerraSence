package com.sosmartlabs.momotabletpadres.sharedprefs

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for the tablet-id validation that gates incoming deep links
 * (soymomo-tablet://link/<id> and https://soymomo.com/link/tablet/<id>).
 *
 * Validation is the security-relevant boundary for external input, so it
 * lives in a pure function with no Android dependencies and is covered here
 * without Robolectric. The Uri-parsing itself is exercised by the manual
 * adb test plan in the PR.
 */
class LinkInvitationPrefsTest {

    @Test
    fun `accepts a typical 10-char parse object id`() {
        assertTrue(LinkInvitationPrefs.isValidTabletId("Vj5eidtoX2"))
    }

    @Test
    fun `accepts the min and max accepted lengths`() {
        assertTrue(LinkInvitationPrefs.isValidTabletId("a1b2c3"))          // 6 chars
        assertTrue(LinkInvitationPrefs.isValidTabletId("a".repeat(32)))    // 32 chars
    }

    @Test
    fun `rejects ids that are too short or too long`() {
        assertFalse(LinkInvitationPrefs.isValidTabletId("a1b2c"))          // 5 chars
        assertFalse(LinkInvitationPrefs.isValidTabletId("a".repeat(33)))   // 33 chars
    }

    @Test
    fun `rejects null, empty and whitespace`() {
        assertFalse(LinkInvitationPrefs.isValidTabletId(null))
        assertFalse(LinkInvitationPrefs.isValidTabletId(""))
        assertFalse(LinkInvitationPrefs.isValidTabletId("      "))
        assertFalse(LinkInvitationPrefs.isValidTabletId("Vj5eidtoX2 "))    // trailing space
    }

    @Test
    fun `rejects non-alphanumeric garbage`() {
        assertFalse(LinkInvitationPrefs.isValidTabletId("abc!@#def"))
        assertFalse(LinkInvitationPrefs.isValidTabletId("ab-cd-ef-gh"))
        assertFalse(LinkInvitationPrefs.isValidTabletId("../../etc/pwd"))
        assertFalse(LinkInvitationPrefs.isValidTabletId("drop table users"))
    }
}
