package com.sosmartlabs.momo.chat.data.repository

import androidx.annotation.StringRes
import com.sosmartlabs.momo.R

/**
 * Maps the custom Parse error codes thrown by the chat-groups cloud triggers
 * and cloud functions to localized string resources. The codes must stay in
 * sync with `app/cloud/controllers/chat-groups/chat-group-trigger.js` and
 * `chat-group-crud.js` in the cloud repo.
 */
object ChatGroupError {

    /** `beforeSaveGroupMember` / `leaveChatGroup`: would leave <3 active members. */
    const val CODE_MIN_MEMBERS = 4001

    /** `beforeSaveGroupMember` / `leaveChatGroup`: would leave <1 parent member. */
    const val CODE_MIN_PARENTS = 4002

    /** `beforeSaveGroupMember`: would leave <1 wearer. */
    const val CODE_MIN_WEARERS = 4003

    /**
     * Returns the localized string resource for a known Parse error code, or
     * `null` when the code is not one we recognize (callers fall back to a
     * generic copy so we never surface raw server English).
     */
    @StringRes
    fun stringResForCode(code: Int?): Int? = when (code) {
        CODE_MIN_MEMBERS -> R.string.error_group_min_members
        CODE_MIN_PARENTS -> R.string.error_group_min_parents
        CODE_MIN_WEARERS -> R.string.error_group_min_wearers
        else -> null
    }
}
