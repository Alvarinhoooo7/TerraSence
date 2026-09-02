package com.sosmartlabs.momo.chat.presentation.fragment

import androidx.annotation.StringRes
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.local.entity.GroupMemberEntity

/**
 * Mirrors the cloud invariants in `beforeSaveGroupMember` (codes 4001 / 4002 /
 * 4003) so the UI can disable the remove-member row before making a
 * doomed round-trip. The cloud remains the source of truth — this is UX
 * only.
 */
object MemberRemovalPolicy {

    sealed class Decision {
        object Allowed : Decision()
        data class Blocked(@StringRes val reasonRes: Int) : Decision()
    }

    /**
     * Evaluates whether removing [target] from [currentMembers] would violate
     * any of the "≥3 active / ≥1 parent / ≥1 wearer" invariants.
     */
    fun canRemove(
        target: GroupMemberEntity,
        currentMembers: List<GroupMemberEntity>,
    ): Decision {
        val activeMembers = currentMembers.filter {
            it.status == GroupMemberEntity.STATUS_ACTIVE
        }

        // Count only OTHER active members — the one being removed is excluded.
        val remainingActive = activeMembers.filterNot { it.id == target.id }

        if (remainingActive.size < 3) {
            return Decision.Blocked(R.string.error_group_min_members)
        }

        val remainingParents = remainingActive.count { !it.isWearer }
        if (remainingParents < 1) {
            return Decision.Blocked(R.string.error_group_min_parents)
        }

        if (target.isWearer) {
            val remainingWearers = remainingActive.count { it.isWearer }
            if (remainingWearers < 1) {
                return Decision.Blocked(R.string.error_group_min_wearers)
            }
        }

        return Decision.Allowed
    }
}
