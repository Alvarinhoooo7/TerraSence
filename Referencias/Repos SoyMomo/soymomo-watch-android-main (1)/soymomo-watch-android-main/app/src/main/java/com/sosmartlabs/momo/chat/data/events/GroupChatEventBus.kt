package com.sosmartlabs.momo.chat.data.events

import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Process-wide bus for group-chat lifecycle events that cross the push-handler /
 * UI boundary. Push handlers emit (e.g. after receiving `group_deleted`) and
 * foreground fragments collect to keep the screen consistent without waiting
 * on Parse LiveQuery reconnects.
 *
 * Scoped `@Singleton` because [com.sosmartlabs.momo.chat.data.repository.ChatGroupRepository]
 * is intentionally not a singleton — a plain `SharedFlow` on the repository
 * would not be shared between producer and consumer instances.
 */
@Singleton
class GroupChatEventBus @Inject constructor() {

    private val _events = MutableSharedFlow<Event>(
        extraBufferCapacity = 16,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    val events: SharedFlow<Event> = _events.asSharedFlow()

    /** Emit without suspending. Drops on overflow, which is acceptable for UI hints. */
    fun publish(event: Event) {
        _events.tryEmit(event)
    }

    /** Local database for this group was purged (delete/leave/group_deleted push). */
    data class GroupPurged(val groupId: String) : Event

    sealed interface Event
}
