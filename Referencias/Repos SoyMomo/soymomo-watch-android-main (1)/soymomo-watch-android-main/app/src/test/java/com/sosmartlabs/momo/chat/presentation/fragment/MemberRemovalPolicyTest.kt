package com.sosmartlabs.momo.chat.presentation.fragment

import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.local.entity.GroupMemberEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MemberRemovalPolicyTest {

    private fun member(
        id: String,
        isWearer: Boolean,
        status: String = GroupMemberEntity.STATUS_ACTIVE,
        role: String = GroupMemberEntity.ROLE_MEMBER,
    ) = GroupMemberEntity(
        id = id,
        groupId = "g1",
        userId = if (isWearer) null else id,
        wearerId = if (isWearer) id else null,
        name = id,
        avatar = null,
        isWearer = isWearer,
        status = status,
        role = role,
        joinedAt = null,
    )

    @Test
    fun `allows removal when 4 parents and 1 wearer remain`() {
        val members = listOf(
            member("p1", isWearer = false),
            member("p2", isWearer = false),
            member("p3", isWearer = false),
            member("p4", isWearer = false),
            member("w1", isWearer = true),
        )
        val decision = MemberRemovalPolicy.canRemove(members[0], members)
        assertTrue(decision is MemberRemovalPolicy.Decision.Allowed)
    }

    @Test
    fun `blocks when removal would leave fewer than 3 active members`() {
        // 3 members total -> after removal 2 remain, violates min-3.
        val members = listOf(
            member("p1", isWearer = false),
            member("p2", isWearer = false),
            member("w1", isWearer = true),
        )
        val decision = MemberRemovalPolicy.canRemove(members[0], members)
        assertEquals(
            R.string.error_group_min_members,
            (decision as MemberRemovalPolicy.Decision.Blocked).reasonRes,
        )
    }

    @Test
    fun `blocks when removal would leave no parent`() {
        // 4 members: 1 parent + 3 wearers. Removing the parent violates
        // min-parents even though we'd have 3 active members left.
        val members = listOf(
            member("p1", isWearer = false),
            member("w1", isWearer = true),
            member("w2", isWearer = true),
            member("w3", isWearer = true),
        )
        val decision = MemberRemovalPolicy.canRemove(members[0], members)
        assertEquals(
            R.string.error_group_min_parents,
            (decision as MemberRemovalPolicy.Decision.Blocked).reasonRes,
        )
    }

    @Test
    fun `blocks when removal would leave no wearer`() {
        val members = listOf(
            member("p1", isWearer = false),
            member("p2", isWearer = false),
            member("p3", isWearer = false),
            member("w1", isWearer = true),
        )
        val decision = MemberRemovalPolicy.canRemove(members[3], members)
        assertEquals(
            R.string.error_group_min_wearers,
            (decision as MemberRemovalPolicy.Decision.Blocked).reasonRes,
        )
    }

    @Test
    fun `ignores already-removed members when counting`() {
        // 3 active + 2 removed = 5 total. Removing an active one leaves 2
        // active, which should still be blocked.
        val members = listOf(
            member("p1", isWearer = false),
            member("p2", isWearer = false),
            member("w1", isWearer = true),
            member("p3", isWearer = false, status = GroupMemberEntity.STATUS_REMOVED),
            member("w2", isWearer = true, status = GroupMemberEntity.STATUS_REMOVED),
        )
        val decision = MemberRemovalPolicy.canRemove(members[0], members)
        assertTrue(decision is MemberRemovalPolicy.Decision.Blocked)
    }
}
