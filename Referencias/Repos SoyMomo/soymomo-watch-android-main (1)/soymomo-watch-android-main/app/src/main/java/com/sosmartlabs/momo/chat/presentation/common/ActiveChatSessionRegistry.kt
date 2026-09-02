package com.sosmartlabs.momo.chat.presentation.common

import com.sosmartlabs.momo.chat.presentation.model.ChatSession

/**
 * Process-local marker for the chat currently visible in `UnifiedChatFragment`.
 *
 * Push handlers read this to suppress Android notifications only when the incoming
 * push belongs to the exact chat already open on screen.
 *
 * Lifecycle contract:
 * - `setActive(...)` from fragment `onResume`
 * - `clearIfMatches(...)` from fragment `onPause` / `onDestroyView`
 *
 * Thread safety is required because UI lifecycle and push handling run on different
 * threads/coroutines.
 */
object ActiveChatSessionRegistry {
    private val lock = Any()
    private var activeSession: SessionKey? = null

    /** Normalized key used to compare active session against push payload ids. */
    sealed class SessionKey {
        data class Group(val groupId: String) : SessionKey()
        data class Individual(val watchId: String) : SessionKey()
    }

    /** Marks the currently visible chat session as active. */
    fun setActive(session: ChatSession) {
        synchronized(lock) {
            activeSession = session.toKey()
        }
    }

    /**
     * Clears active state only if it still points to the provided session.
     * This avoids wiping a newer session during rapid fragment transitions.
     */
    fun clearIfMatches(session: ChatSession?) {
        if (session == null) {
            return
        }
        val key = session.toKey()
        synchronized(lock) {
            if (activeSession == key) {
                activeSession = null
            }
        }
    }

    /** True when the visible chat is this group conversation. */
    fun isActiveGroup(groupId: String): Boolean {
        val key = synchronized(lock) { activeSession }
        return key is SessionKey.Group && key.groupId == groupId
    }

    /** True when the visible chat is this 1:1 watch conversation. */
    fun isActiveIndividual(watchId: String): Boolean {
        val key = synchronized(lock) { activeSession }
        return key is SessionKey.Individual && key.watchId == watchId
    }

    private fun ChatSession.toKey(): SessionKey {
        return when (this) {
            is ChatSession.Group -> SessionKey.Group(groupId)
            is ChatSession.Individual -> SessionKey.Individual(wearer.objectId)
        }
    }
}
