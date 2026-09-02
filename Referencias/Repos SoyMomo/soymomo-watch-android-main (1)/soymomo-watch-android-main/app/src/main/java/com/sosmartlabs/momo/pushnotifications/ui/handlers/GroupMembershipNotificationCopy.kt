package com.sosmartlabs.momo.pushnotifications.ui.handlers

import com.sosmartlabs.momo.R

/**
 * Pure mapping from a group-membership push `event` to its title/text string resource
 * IDs and the ordered `loc-args` the cloud payload carries.
 *
 * The cloud payload (see `group-membership/membership-to-parent.js`) uses these `loc-args`
 * orderings:
 * - added / removed  -> [actor, target, group]
 * - left             -> [target, group]
 * - role_changed     -> [target, group, newRole]
 * - owner_changed    -> [target, group]
 * - group_deleted    -> [actor, group]
 *
 * The title is taken from `group` so notifications read "Group name -> body" like messengers;
 * the body is built from the remaining args via Android's positional placeholders.
 */
object GroupMembershipNotificationCopy {

    data class Copy(
        val titleResId: Int,
        val textResId: Int,
        val args: Array<String>,
    ) {
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (other !is Copy) return false
            return titleResId == other.titleResId &&
                textResId == other.textResId &&
                args.contentEquals(other.args)
        }

        override fun hashCode(): Int {
            var result = titleResId
            result = 31 * result + textResId
            result = 31 * result + args.contentHashCode()
            return result
        }
    }

    fun resolve(
        event: String,
        actorName: String,
        targetName: String,
        groupName: String,
        newRole: String? = null,
    ): Copy? = when (event) {
        "added" -> Copy(
            titleResId = R.string.push_group_member_added_title,
            textResId = R.string.push_group_member_added_text,
            args = arrayOf(actorName, targetName, groupName),
        )
        "removed" -> Copy(
            titleResId = R.string.push_group_member_removed_title,
            textResId = R.string.push_group_member_removed_text,
            args = arrayOf(actorName, targetName, groupName),
        )
        "left" -> Copy(
            titleResId = R.string.push_group_member_left_title,
            textResId = R.string.push_group_member_left_text,
            args = arrayOf(targetName, groupName),
        )
        "role_changed" -> Copy(
            titleResId = R.string.push_group_role_changed_title,
            textResId = R.string.push_group_role_changed_text,
            args = arrayOf(targetName, groupName, newRole.orEmpty()),
        )
        "owner_changed" -> Copy(
            titleResId = R.string.push_group_owner_changed_title,
            textResId = R.string.push_group_owner_changed_text,
            args = arrayOf(targetName, groupName),
        )
        "group_deleted" -> Copy(
            titleResId = R.string.push_group_deleted_title,
            textResId = R.string.push_group_deleted_text,
            args = arrayOf(actorName, groupName),
        )
        else -> null
    }
}
