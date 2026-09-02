package com.sosmartlabs.momo.pushnotifications.ui.handlers

import com.sosmartlabs.momo.R
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class GroupMembershipNotificationCopyTest {

    @Test
    fun `added maps to added resources with actor-target-group args`() {
        val copy = GroupMembershipNotificationCopy.resolve(
            event = "added",
            actorName = "Alice",
            targetName = "Bob",
            groupName = "Family",
        )!!

        assertEquals(R.string.push_group_member_added_title, copy.titleResId)
        assertEquals(R.string.push_group_member_added_text, copy.textResId)
        assertArrayEquals(arrayOf("Alice", "Bob", "Family"), copy.args)
    }

    @Test
    fun `removed maps to removed resources with actor-target-group args`() {
        val copy = GroupMembershipNotificationCopy.resolve(
            event = "removed",
            actorName = "Alice",
            targetName = "Bob",
            groupName = "Family",
        )!!

        assertEquals(R.string.push_group_member_removed_title, copy.titleResId)
        assertEquals(R.string.push_group_member_removed_text, copy.textResId)
        assertArrayEquals(arrayOf("Alice", "Bob", "Family"), copy.args)
    }

    @Test
    fun `left maps to left resources with target-group args only`() {
        val copy = GroupMembershipNotificationCopy.resolve(
            event = "left",
            actorName = "ignored",
            targetName = "Bob",
            groupName = "Family",
        )!!

        assertEquals(R.string.push_group_member_left_title, copy.titleResId)
        assertEquals(R.string.push_group_member_left_text, copy.textResId)
        assertArrayEquals(arrayOf("Bob", "Family"), copy.args)
    }

    @Test
    fun `role_changed passes newRole through as third arg`() {
        val copy = GroupMembershipNotificationCopy.resolve(
            event = "role_changed",
            actorName = "ignored",
            targetName = "Bob",
            groupName = "Family",
            newRole = "admin",
        )!!

        assertEquals(R.string.push_group_role_changed_title, copy.titleResId)
        assertEquals(R.string.push_group_role_changed_text, copy.textResId)
        assertArrayEquals(arrayOf("Bob", "Family", "admin"), copy.args)
    }

    @Test
    fun `role_changed substitutes empty string when newRole is null`() {
        val copy = GroupMembershipNotificationCopy.resolve(
            event = "role_changed",
            actorName = "ignored",
            targetName = "Bob",
            groupName = "Family",
            newRole = null,
        )!!

        assertArrayEquals(arrayOf("Bob", "Family", ""), copy.args)
    }

    @Test
    fun `owner_changed maps to owner resources with target-group args`() {
        val copy = GroupMembershipNotificationCopy.resolve(
            event = "owner_changed",
            actorName = "ignored",
            targetName = "Bob",
            groupName = "Family",
        )!!

        assertEquals(R.string.push_group_owner_changed_title, copy.titleResId)
        assertEquals(R.string.push_group_owner_changed_text, copy.textResId)
        assertArrayEquals(arrayOf("Bob", "Family"), copy.args)
    }

    @Test
    fun `group_deleted maps to deleted resources with actor-group args`() {
        val copy = GroupMembershipNotificationCopy.resolve(
            event = "group_deleted",
            actorName = "Alice",
            targetName = "ignored",
            groupName = "Family",
        )!!

        assertEquals(R.string.push_group_deleted_title, copy.titleResId)
        assertEquals(R.string.push_group_deleted_text, copy.textResId)
        assertArrayEquals(arrayOf("Alice", "Family"), copy.args)
    }

    @Test
    fun `unknown event returns null`() {
        val copy = GroupMembershipNotificationCopy.resolve(
            event = "exploded",
            actorName = "Alice",
            targetName = "Bob",
            groupName = "Family",
        )

        assertNull(copy)
    }
}
