package com.sosmartlabs.momo.chat.data.repository

import com.sosmartlabs.momo.R
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ChatGroupErrorTest {

    @Test
    fun `4001 maps to min-members string`() {
        assertEquals(
            R.string.error_group_min_members,
            ChatGroupError.stringResForCode(ChatGroupError.CODE_MIN_MEMBERS),
        )
    }

    @Test
    fun `4002 maps to min-parents string`() {
        assertEquals(
            R.string.error_group_min_parents,
            ChatGroupError.stringResForCode(ChatGroupError.CODE_MIN_PARENTS),
        )
    }

    @Test
    fun `4003 maps to min-wearers string`() {
        assertEquals(
            R.string.error_group_min_wearers,
            ChatGroupError.stringResForCode(ChatGroupError.CODE_MIN_WEARERS),
        )
    }

    @Test
    fun `unknown code returns null so caller falls back to generic`() {
        assertNull(ChatGroupError.stringResForCode(1))
        assertNull(ChatGroupError.stringResForCode(141))
        assertNull(ChatGroupError.stringResForCode(null))
    }
}
