package com.sosmartlabs.momo.main.ui.map

/**
 * Minimal state used to keep watch selection resilient across list updates.
 */
data class WatchSelectionSnapshot(
    val wearerId: String,
    val deviceId: String?,
    val isConnected: Boolean
) {
    fun matchesIdentifier(identifier: String): Boolean {
        return wearerId == identifier || deviceId == identifier
    }
}

/**
 * Pure helpers for selected-watch retention and disconnected-card visibility.
 */
object SelectionStateResolver {

    fun resolveSelectedIndex(
        watches: List<WatchSelectionSnapshot>,
        selectedIdentifier: String?
    ): Int? {
        if (watches.isEmpty()) return null
        if (selectedIdentifier.isNullOrBlank()) return 0
        return watches.indexOfFirst { it.matchesIdentifier(selectedIdentifier) }
            .takeIf { it >= 0 }
            ?: 0
    }

    fun shouldShowDisconnectedCard(selectedWatch: WatchSelectionSnapshot?): Boolean {
        return selectedWatch?.isConnected == false
    }
}
