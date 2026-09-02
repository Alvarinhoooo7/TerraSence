package com.sosmartlabs.momo.chat.data.repository

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ChatGroupCloudResponsesTest {

    // ---------- leaveChatGroup ----------

    @Test
    fun `leave response extracts promoted admin and owner transfer`() {
        val raw = mapOf(
            "success" to true,
            "promotedAdminUserId" to "user-123",
            "ownerTransferred" to true,
        )
        val parsed = ChatGroupCloudResponses.parseLeaveResponse(raw)
        assertEquals("user-123", parsed.promotedAdminUserId)
        assertTrue(parsed.ownerTransferred)
        assertFalse(parsed.alreadyRemoved)
    }

    @Test
    fun `leave response without promotion returns null promoted id and false transfer`() {
        val raw = mapOf("success" to true)
        val parsed = ChatGroupCloudResponses.parseLeaveResponse(raw)
        assertNull(parsed.promotedAdminUserId)
        assertFalse(parsed.ownerTransferred)
        assertFalse(parsed.alreadyRemoved)
    }

    @Test
    fun `leave response surfaces alreadyRemoved idempotent flag`() {
        val raw = mapOf(
            "success" to true,
            "alreadyRemoved" to true,
        )
        val parsed = ChatGroupCloudResponses.parseLeaveResponse(raw)
        assertTrue(parsed.alreadyRemoved)
    }

    @Test
    fun `leave response treats blank promoted id as null`() {
        val raw = mapOf("promotedAdminUserId" to "")
        val parsed = ChatGroupCloudResponses.parseLeaveResponse(raw)
        assertNull(parsed.promotedAdminUserId)
    }

    @Test
    fun `leave response tolerates null input`() {
        val parsed = ChatGroupCloudResponses.parseLeaveResponse(null)
        assertNull(parsed.promotedAdminUserId)
        assertFalse(parsed.ownerTransferred)
        assertFalse(parsed.alreadyRemoved)
    }

    // ---------- deleteChatGroup ----------

    @Test
    fun `delete response reads deletedCounts sub-map`() {
        val raw = mapOf(
            "success" to true,
            "deletedCounts" to mapOf(
                "messages" to 42,
                "receipts" to 13,
                "members" to 5,
            ),
        )
        val parsed = ChatGroupCloudResponses.parseDeleteResponse(raw)
        assertEquals(42, parsed.deletedMessages)
        assertEquals(13, parsed.deletedReceipts)
        assertEquals(5, parsed.deletedMembers)
        assertFalse(parsed.alreadyDeleted)
    }

    @Test
    fun `delete response surfaces alreadyDeleted race flag`() {
        val raw = mapOf(
            "success" to true,
            "alreadyDeleted" to true,
            "deletedCounts" to mapOf("messages" to 0, "receipts" to 0, "members" to 0),
        )
        val parsed = ChatGroupCloudResponses.parseDeleteResponse(raw)
        assertTrue(parsed.alreadyDeleted)
        assertEquals(0, parsed.deletedMessages)
    }

    @Test
    fun `delete response widens Long counts to Int without losing small values`() {
        val raw = mapOf(
            "deletedCounts" to mapOf(
                "messages" to 1_000L,
                "receipts" to 0L,
                "members" to 7L,
            ),
        )
        val parsed = ChatGroupCloudResponses.parseDeleteResponse(raw)
        assertEquals(1_000, parsed.deletedMessages)
        assertEquals(0, parsed.deletedReceipts)
        assertEquals(7, parsed.deletedMembers)
    }

    @Test
    fun `delete response tolerates missing deletedCounts`() {
        val raw = mapOf("success" to true)
        val parsed = ChatGroupCloudResponses.parseDeleteResponse(raw)
        assertEquals(0, parsed.deletedMessages)
        assertEquals(0, parsed.deletedReceipts)
        assertEquals(0, parsed.deletedMembers)
    }
}
