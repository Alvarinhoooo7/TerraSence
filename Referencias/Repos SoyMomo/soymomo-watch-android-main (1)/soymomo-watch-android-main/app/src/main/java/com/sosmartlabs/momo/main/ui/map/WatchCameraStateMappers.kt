package com.sosmartlabs.momo.main.ui.map

import com.sosmartlabs.momo.main.model.MainCardWatchUser

/**
 * Camera-related projections of the watch list.
 * These helpers keep mapping and mappability rules in one place so activity code stays readable.
 */
fun List<MainCardWatchUser>.toWatchCameraStates(): List<WatchCameraState> {
    return mapNotNull { mainCardWatchUser ->
        val wearer = mainCardWatchUser.watchUser.watch ?: return@mapNotNull null
        WatchCameraState(
            wearerId = wearer.objectId,
            deviceId = wearer.deviceId,
            isActive = mainCardWatchUser.watchUser.active,
            hasLocationPermission = runCatching { mainCardWatchUser.watchUser.userPermission.location }
                .getOrDefault(false),
            isConnected = wearer.isConnected(),
            hasLocation = wearer.lastKnownLocation != null
        )
    }
}

fun List<MainCardWatchUser>.toWatchSelectionSnapshots(): List<WatchSelectionSnapshot> {
    return mapNotNull { mainCardWatchUser ->
        val wearer = mainCardWatchUser.watchUser.watch ?: return@mapNotNull null
        WatchSelectionSnapshot(
            wearerId = wearer.objectId,
            deviceId = wearer.deviceId,
            isConnected = wearer.isConnected()
        )
    }
}

/**
 * A watch is mappable only when it can be safely represented on the map.
 * Delegates to [WatchCameraState.isMappable] so mappability rules stay in one place.
 */
fun MainCardWatchUser.isMappableForMap(): Boolean {
    return toWatchCameraStateOrNull()?.isMappable ?: false
}

private fun MainCardWatchUser.toWatchCameraStateOrNull(): WatchCameraState? {
    val wearer = watchUser.watch ?: return null
    return WatchCameraState(
        wearerId = wearer.objectId,
        deviceId = wearer.deviceId,
        isActive = watchUser.active,
        hasLocationPermission = runCatching { watchUser.userPermission.location }
            .getOrDefault(false),
        isConnected = wearer.isConnected(),
        hasLocation = wearer.lastKnownLocation != null
    )
}

/**
 * Finds the list index for a wearer object id.
 */
fun List<MainCardWatchUser>.findWearerIndex(objectId: String): Int {
    return indexOfFirst {
        val wearer = it.watchUser.watch
        wearer?.objectId == objectId || wearer?.deviceId == objectId
    }
}
