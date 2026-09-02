package com.sosmartlabs.momo.chat.presentation.activity

/**
 * Temporary navigation modes for the staged chat-group rollout.
 *
 * While `CHAT_GROUP_LIST_IS_HIDDEN` is enabled for part of the audience, direct chat entry
 * points still need to work without exposing the chat-list UI on back/up navigation.
 *
 * Once the chat-group feature is rolled out to 100% and the chat list is always accessible,
 * this mode-based branching can be removed together with the related fallback logic in
 * `ChatListActivity` and grouped-summary notification routing.
 */
enum class ChatListLaunchMode {
    /** Standard chat experience: the list is visible and back/up can navigate within the graph. */
    LIST_ALLOWED,

    /** Open a specific conversation, but finish instead of falling back to the hidden list. */
    DIRECT_CHAT_NO_LIST_FALLBACK,

    /** The list is hidden and there is no direct conversation target, so the screen must exit. */
    LIST_BLOCKED
}
