package com.sosmartlabs.momo.chat.data.repository

/**
 * Pure-logic parsers for the responses returned by the `leaveChatGroup` and
 * `deleteChatGroup` cloud functions. Extracted so they can be unit-tested
 * without spinning up the Parse SDK.
 *
 * Both cloud functions return a `Map<String, Any?>`-shaped object (Parse's
 * JavaScript SDK serializes plain JS objects as `HashMap` on the Android
 * side).
 */

sealed class LeaveGroupResult {
    data class Success(
        val promotedAdminUserId: String?,
        val ownerTransferred: Boolean,
        val alreadyRemoved: Boolean,
    ) : LeaveGroupResult()

    data class Failure(
        val parseCode: Int?,
        val message: String?,
    ) : LeaveGroupResult()
}

sealed class DeleteGroupResult {
    data class Success(
        val deletedMessages: Int,
        val deletedReceipts: Int,
        val deletedMembers: Int,
        val alreadyDeleted: Boolean,
    ) : DeleteGroupResult()

    data class Failure(
        val parseCode: Int?,
        val message: String?,
    ) : DeleteGroupResult()
}

object ChatGroupCloudResponses {

    fun parseLeaveResponse(raw: Map<*, *>?): LeaveGroupResult.Success {
        val promotedAdminUserId = (raw?.get("promotedAdminUserId") as? String)
            ?.takeIf { it.isNotBlank() }
        val ownerTransferred = raw?.get("ownerTransferred") as? Boolean ?: false
        val alreadyRemoved = raw?.get("alreadyRemoved") as? Boolean ?: false
        return LeaveGroupResult.Success(
            promotedAdminUserId = promotedAdminUserId,
            ownerTransferred = ownerTransferred,
            alreadyRemoved = alreadyRemoved,
        )
    }

    fun parseDeleteResponse(raw: Map<*, *>?): DeleteGroupResult.Success {
        val counts = raw?.get("deletedCounts") as? Map<*, *>
        val alreadyDeleted = raw?.get("alreadyDeleted") as? Boolean ?: false
        return DeleteGroupResult.Success(
            deletedMessages = intFromAny(counts?.get("messages")),
            deletedReceipts = intFromAny(counts?.get("receipts")),
            deletedMembers = intFromAny(counts?.get("members")),
            alreadyDeleted = alreadyDeleted,
        )
    }

    private fun intFromAny(value: Any?): Int = when (value) {
        is Int -> value
        is Long -> value.toInt()
        is Number -> value.toInt()
        else -> 0
    }
}
