package com.sosmartlabs.momo.chat.data.local.entity

import java.io.Serializable

/**
 * Network-only model for group members (no Room caching)
 */
data class GroupMemberEntity(
    val id: String,
    val groupId: String,
    val userId: String?,
    val wearerId: String?,
    val name: String,
    val avatar: String?,
    val isWearer: Boolean,
    val status: String,
    val role: String,
    val joinedAt: Long?,
    val wearerModelName: String? = null,
): Serializable {
    companion object {
        // Status
        const val STATUS_ACTIVE = "active"
        const val STATUS_REMOVED = "removed"

        // Roles
        const val ROLE_MEMBER = "member"
        const val ROLE_ADMIN = "admin"
        const val ROLE_OWNER = "owner"
    }
}
