package com.sosmartlabs.momo.main.ui.map

import java.util.Date

/**
 * What the disconnected banner renders for the currently selected wearer.
 *
 * Deliberately separate from [WatchSelectionSnapshot]: that type is also produced by
 * `WatchCameraStateMappers.toWatchSelectionSnapshots` and constructed directly by
 * `SelectionStateResolverTest`, so widening it to carry presentation data would ripple
 * into the camera pipeline and the tests for no benefit.
 *
 * Every field is nullable because the values come from Parse columns that may simply be
 * absent — `ParseDelegate<T>` hands back null for a missing column even when the property
 * is declared non-null, so callers must `has()`-guard before reading.
 *
 * @param lastSeenAt the wearer's `lastTKQ`, i.e. the last check-in the backend saw. This is
 *   the same column [com.sosmartlabs.momo.models.Wearer.isConnected] thresholds on, so the
 *   elapsed time shown to the user is derived from the same fact that made the card appear.
 * @param deviceId null when the column is absent. Carried so the banner's tap can hand
 *   DisconnectionActivity both identifiers without re-scanning the adapter's list at click
 *   time — and so every `has()` guard for this feature stays in one function.
 * @param batteryPercentage the last charge the watch reported. Note this is the reading on
 *   the way down, not the level now — the watch has been silent since. The banner renders
 *   it as 0% when [causeIsBattery], see `MainActivity.bindDisconnectedCard`.
 * @param causeIsBattery whether the disconnect is attributed to a flat battery rather than
 *   lost signal, split at `Wearer.DEAD_BATTERY_THRESHOLD_PERCENT`. `WatchCardAdapter` reads
 *   the same constant, so the wearer card underneath the banner always names the same cause.
 */
data class DisconnectedCardState(
    val wearerId: String,
    val deviceId: String?,
    val lastSeenAt: Date?,
    val batteryPercentage: Int?,
    val causeIsBattery: Boolean
)
