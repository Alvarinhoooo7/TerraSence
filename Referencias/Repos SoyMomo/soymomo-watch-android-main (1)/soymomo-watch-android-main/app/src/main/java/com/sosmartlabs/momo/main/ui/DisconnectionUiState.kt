package com.sosmartlabs.momo.main.ui

import java.util.Date

/**
 * What DisconnectionActivity renders.
 *
 * This type is the ONLY place the screen touches Parse. Everything downstream — the render
 * functions, the click handlers — sees plain Kotlin values, so every `has()` guard lives in
 * one function ([DisconnectionViewModel.load]) instead of being scattered through the UI
 * where a later simplification could quietly drop one.
 */
sealed interface DisconnectionUiState {

    /**
     * No wearer was passed, or one was passed and could not be resolved.
     *
     * This is a supported product mode, not an error: the screen is reachable with no extras
     * and must render its generic advice unchanged. It is deliberately NOT a `finish()`.
     */
    data object Generic : DisconnectionUiState

    /**
     * A wearer resolved and carries at least a name.
     *
     * @param lastSeenAt the wearer's `lastTKQ` — the last check-in the backend saw, and the
     *   same column `Wearer.isConnected()` thresholds on, so what this screen shows is
     *   derived from the very fact that declared the watch offline. Null when the column is
     *   absent (a watch that has never checked in), NOT zero.
     * @param phone null when the column is absent or blank. Note this is NOT gated on
     *   permission — see [callBlockedByPermission], because "you may not call this watch"
     *   and "this watch has no number" need different treatment.
     * @param callBlockedByPermission the user's call permission is explicitly off. The
     *   button is dimmed but stays tappable so it can explain itself, matching how
     *   `WatchCardAdapter` handles the same permission on the wearer card.
     */
    data class Ready(
        val wearerName: String,
        /** Wearer avatar for the map marker; null when no image column or no file. */
        val wearerImageUrl: String?,
        val lastSeenAt: Date?,
        val position: PositionState,
        val phone: String?,
        val callBlockedByPermission: Boolean
    ) : DisconnectionUiState
}

/**
 * Why the last-known-position row looks the way it does.
 *
 * Five states rather than a nullable position, because "we are not allowed to tell you",
 * "there is nothing on record" and "there is something but we don't know when" are three
 * different things to say to a parent, and only one of them should offer a tappable route
 * into navigation.
 *
 * Note that [Located.recordedAt] comes from `lastLocationTime`, which is a DIFFERENT column
 * from [DisconnectionUiState.Ready.lastSeenAt]'s `lastTKQ` — a watch can check in without
 * getting a fix, so the two usually disagree. They must never be merged or share a label.
 */
sealed interface PositionState {

    /**
     * Location permission is unknown (the watch-user cache has not loaded, or the column is
     * absent). The row is hidden entirely: "not shared with you" is itself a claim, and an
     * unknown permission does not justify making it.
     */
    data object Hidden : PositionState

    /** Location sharing is explicitly off for this user — typically a co-parent. */
    data object NotShared : PositionState

    /** Permission granted, but the watch has no fix on record. */
    data object NoneOnRecord : PositionState

    /**
     * A position exists but carries no timestamp.
     *
     * Deliberately not tappable. A one-tap route into turn-by-turn navigation with no way to
     * tell the parent how old the destination is would be worse than showing nothing.
     */
    data object Undated : PositionState

    data class Located(
        val latitude: Double,
        val longitude: Double,
        val recordedAt: Date
    ) : PositionState
}
