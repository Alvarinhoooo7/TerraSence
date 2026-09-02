package com.sosmartlabs.momo.main.model.googlemap

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.view.ViewGroup
import android.view.animation.LinearInterpolator
import androidx.core.content.ContextCompat
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.Circle
import com.google.android.gms.maps.model.CircleOptions
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.geofences.model.Geofence
import com.sosmartlabs.momo.map.infowindow.MapInfoOverlay
import com.sosmartlabs.momo.map.marker.MarkerPayload
import com.sosmartlabs.momo.map.marker.MarkerType
import com.sosmartlabs.momo.map.marker.MarkerVisualSpec
import com.sosmartlabs.momo.map.marker.MomoMarker
import com.sosmartlabs.momo.main.model.MainCardWatchUser
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.DateUtil
import com.sosmartlabs.momo.utils.DisplayUtils
import com.google.maps.android.SphericalUtil
import dagger.hilt.android.qualifiers.ActivityContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import timber.log.Timber
import java.util.Date
import javax.inject.Inject
import kotlin.math.roundToInt

class GoogleMapRetriever @Inject constructor(@param:ActivityContext private val context: Context) {

    private data class WearerMarkerSnapshot(
        val position: LatLng,
        val timestampMs: Long?,
        val accuracyMeters: Int?,
        val imageUrl: String?,
        val snippetText: String
    )

    private lateinit var googleMap: GoogleMap
    private var mapInfoOverlay: MapInfoOverlay? = null
    private val momoMarkers = linkedMapOf<String, MomoMarker>()
    private val momoCircles = mutableMapOf<String, Circle>()
    private val wearerMarkerSnapshots = mutableMapOf<String, WearerMarkerSnapshot>()
    private val wearerMarkerAnimators = mutableMapOf<String, ValueAnimator>()
    private val geoFenceMarkers = ArrayList<MomoMarker>()
    private val geoFenceCircles = ArrayList<Circle>()
    private var lastMainCardWatchUsers = mutableListOf<MainCardWatchUser>()
    private val overlayStateMachine = MapOverlayStateMachine()

    private val coroutineScope = CoroutineScope(Dispatchers.Main)
    private val mapMutex = Mutex(locked = true)
    private val mapHorizontalPaddingPx = DisplayUtils.dpToPx(16f, context).roundToInt()
    private val fitBoundsBasePaddingPx = DisplayUtils.dpToPx(47f, context).roundToInt()
    private val fitBoundsEdgeBufferPx = DisplayUtils.dpToPx(56f, context).roundToInt()
    private val fitBoundsTotalPaddingPx = fitBoundsBasePaddingPx + fitBoundsEdgeBufferPx
    private val defaultFocusZoom = 17f
    private val startupFocusZoom = 16f
    private val minFitZoom = 3f
    private val maxFitZoom = 16f
    private val overlappingMarkersDistanceMeters = 75f

    private fun runInMapMutex(
        function: () -> Unit,
        onComplete: (() -> Unit)? = null
    ) {
        coroutineScope.launch {
            Timber.d("GoogleMapRetriever: Running function in map mutex")
            mapMutex.withLock {
                function()
            }
            onComplete?.invoke()
        }
    }

    private fun clearWearerMarkersAndCircles() {
        clearWearerAnimations()
        momoMarkers.keys.toList().forEach(::removeWearerMarker)
    }

    private fun clearGeofenceMarkersAndCircles() {
        for (marker in geoFenceMarkers) marker.removeMarker()
        geoFenceMarkers.clear()
        for (circle in geoFenceCircles) circle.remove()
        geoFenceCircles.clear()
    }

    fun clearMapArtifacts() {
        clearWearerMarkersAndCircles()
        clearGeofenceMarkersAndCircles()
        mapInfoOverlay?.cleanup()
        mapInfoOverlay = null
        overlayStateMachine.selectPreferredWearer(null)
    }

    fun showAllMarkersInMap() {
        fitMappableWearers()
    }

    fun fitMappableWearers() {
        runInMapMutex({
            Timber.d("GoogleMapRetriever: Showing all markers in map")
            if (momoMarkers.isEmpty()) return@runInMapMutex
            val boundsBuilder = LatLngBounds.Builder()
            val markerPositions = mutableListOf<LatLng>()
            for (marker in momoMarkers.values) {
                marker.position?.let {
                    boundsBuilder.include(it)
                    markerPositions.add(it)
                }
            }
            if (markerPositions.isEmpty()) return@runInMapMutex

            val maxDistanceMeters = maxMarkerDistanceMeters(markerPositions)
            if (maxDistanceMeters <= overlappingMarkersDistanceMeters) {
                Timber.d(
                    "GoogleMapRetriever: Marker cluster is very tight (maxDistance=$maxDistanceMeters m), " +
                        "using direct focus zoom=$startupFocusZoom"
                )
                moveMap(averageMarkerPosition(markerPositions), startupFocusZoom)
                return@runInMapMutex
            }

            try {
                val bounds = boundsBuilder.build()
                // Add extra edge buffer so distant markers do not sit against map borders.
                val cameraUpdate = CameraUpdateFactory.newLatLngBounds(bounds, fitBoundsTotalPaddingPx)
                googleMap.animateCamera(cameraUpdate, object : GoogleMap.CancelableCallback {
                    override fun onFinish() {
                        runInMapMutex({ clampCurrentZoom(minFitZoom, maxFitZoom, animate = false) })
                    }

                    override fun onCancel() {
                        runInMapMutex({ clampCurrentZoom(minFitZoom, maxFitZoom, animate = false) })
                    }
                })
            } catch (e: Exception) {
                Timber.e("GoogleMapRetriever: Error on animating camera $e")
                CrashlyticsLog.recordNonFatalError(e, "GoogleMapRetriever: Error on animating camera")
            }
        })
    }

    fun centerOnUser(location: Location, zoom: Float = startupFocusZoom) {
        runInMapMutex({
            moveMap(LatLng(location.latitude, location.longitude), zoom)
        })
    }

    fun updateMapPadding(bottomPaddingPx: Int) {
        runInMapMutex({
            googleMap.setPadding(mapHorizontalPaddingPx, 0, mapHorizontalPaddingPx, bottomPaddingPx)
            mapInfoOverlay?.reposition()
        })
    }

    private fun clampCurrentZoom(minZoom: Float, maxZoom: Float, animate: Boolean = false) {
        val currentZoom = googleMap.cameraPosition.zoom
        val clampedZoom = currentZoom.coerceIn(minZoom, maxZoom)
        if (clampedZoom != currentZoom) {
            val zoomUpdate = CameraUpdateFactory.zoomTo(clampedZoom)
            if (animate) {
                googleMap.animateCamera(zoomUpdate)
            } else {
                googleMap.moveCamera(zoomUpdate)
            }
        }
    }

    private fun maxMarkerDistanceMeters(markerPositions: List<LatLng>): Float {
        if (markerPositions.size < 2) return 0f
        val distanceResult = FloatArray(1)
        var maxDistance = 0f
        for (i in 0 until markerPositions.size - 1) {
            val first = markerPositions[i]
            for (j in i + 1 until markerPositions.size) {
                val second = markerPositions[j]
                Location.distanceBetween(
                    first.latitude, first.longitude,
                    second.latitude, second.longitude,
                    distanceResult
                )
                if (distanceResult[0] > maxDistance) {
                    maxDistance = distanceResult[0]
                }
            }
        }
        return maxDistance
    }

    private fun averageMarkerPosition(markerPositions: List<LatLng>): LatLng {
        val latAverage = markerPositions.map { it.latitude }.average()
        val lngAverage = markerPositions.map { it.longitude }.average()
        return LatLng(latAverage, lngAverage)
    }

    private fun clearWearerAnimations() {
        val runningAnimations = wearerMarkerAnimators.values.toList()
        wearerMarkerAnimators.clear()
        runningAnimations.forEach { it.cancel() }
    }

    private fun cancelWearerAnimation(wearerId: String) {
        wearerMarkerAnimators.remove(wearerId)?.cancel()
    }

    private fun shouldDisplayWearerMarker(
        mainCardWatchUser: MainCardWatchUser,
        wearer: Wearer
    ): Boolean {
        val userPermission = mainCardWatchUser.watchUser.userPermission
        if (userPermission == null) {
            Timber.w(
                "GoogleMapRetriever: Watch user ${mainCardWatchUser.watchUser.objectId} " +
                    "for wearer ${wearer.objectId} has null userPermission, skipping"
            )
            return false
        }

        val shouldDisplay =
            mainCardWatchUser.watchUser.active &&
                userPermission.location &&
                wearer.isConnected() &&
                wearer.lastKnownLocation != null

        Timber.d(
            "GoogleMapRetriever: Wearer ${wearer.objectId} display marker=$shouldDisplay " +
                "(active=${mainCardWatchUser.watchUser.active}, locationPermission=${userPermission.location}, " +
                "connected=${wearer.isConnected()}, hasLocation=${wearer.lastKnownLocation != null})"
        )
        return shouldDisplay
    }

    fun loadingWatchUserIntoMap(
        mainCardWatchUsers: List<MainCardWatchUser>,
        onComplete: (() -> Unit)? = null
    ) {
        Timber.d("GoogleMapRetriever: Loading ${mainCardWatchUsers.size} watch users into map")
        runInMapMutex({
            Timber.d("GoogleMapRetriever: Clearing existing ${momoMarkers.size} markers and ${momoCircles.size} circles")
            clearWearerMarkersAndCircles()

            var addedMarkers = 0
            mainCardWatchUsers.forEach { mainsCardWatchUser ->
                val wearer = mainsCardWatchUser.watchUser.watch
                Timber.d("GoogleMapRetriever: Processing watch user: ${wearer?.objectId}")

                if (wearer == null) {
                    Timber.w("GoogleMapRetriever: Watch user has null wearer, skipping")
                    return@forEach
                }

                if (!shouldDisplayWearerMarker(mainsCardWatchUser, wearer)) {
                    return@forEach
                }

                val watchLocation = wearer.lastKnownLocation
                if (watchLocation == null) {
                    Timber.d("GoogleMapRetriever: Skipping wearer ${wearer.objectId} - no lastKnownLocation")
                    return@forEach
                }

                Timber.d("GoogleMapRetriever: Adding marker for connected wearer: ${wearer.objectId}")
                addWearerMarker(
                    mainsCardWatchUser,
                    LatLng(watchLocation.latitude, watchLocation.longitude)
                )
                addedMarkers++
            }

            Timber.d("GoogleMapRetriever: Successfully added $addedMarkers markers to map")
            lastMainCardWatchUsers = mainCardWatchUsers.toMutableList()
            restorePreferredWearerOverlayIfNeeded()
        }, onComplete)
    }

    private fun addWearerMarker(mainsCardWatchUser: MainCardWatchUser, position: LatLng) {
        Timber.d("GoogleMapRetriever: Setting watch marker for user: ${mainsCardWatchUser.watchUser.watch?.objectId}")
        val wearer = mainsCardWatchUser.watchUser.watch!!
        val wearerId = wearer.objectId
        Timber.d("GoogleMapRetriever: Wearer position: $position")

        removeWearerMarker(wearerId)

        val lastUpdateText = getFormattedLastUpdateText(wearer)
        Timber.d("GoogleMapRetriever: Generated snippet text: '$lastUpdateText'")

        val marker = googleMap.addMarker(
            MarkerOptions()
                .position(position)
                .anchor(0.5f, 1f)
                .snippet(lastUpdateText)
        ) ?: return

        Timber.d("GoogleMapRetriever: Marker created successfully with snippet: ${marker.snippet}")
        marker.tag = MarkerPayload.Wearer(wearerId)
        val momoMarker = MomoMarker(
            googleMapMarker = marker,
            appContext = context,
            markerType = MarkerType.CHILD,
            markerId = wearerId,
            visualSpec = MarkerVisualSpec.mainMap()
        )
        momoMarker.loadMarkerImage(wearer.image?.url)
        momoMarkers[wearerId] = momoMarker

        val accuracyMeters = resolveAccuracyMeters(wearer)
        updateAccuracyCircle(wearerId, position, accuracyMeters)
        wearerMarkerSnapshots[wearerId] = WearerMarkerSnapshot(
            position = position,
            timestampMs = resolveMarkerTimestampMillis(wearer),
            accuracyMeters = accuracyMeters,
            imageUrl = wearer.image?.url,
            snippetText = lastUpdateText
        )
    }

    private fun upsertWearerMarker(
        mainCardWatchUser: MainCardWatchUser,
        position: LatLng
    ): Boolean {
        val wearer = mainCardWatchUser.watchUser.watch ?: return false
        val wearerId = wearer.objectId
        val existingMarker = momoMarkers[wearerId]
        if (existingMarker == null) {
            addWearerMarker(mainCardWatchUser, position)
            return false
        }

        val lastUpdateText = getFormattedLastUpdateText(wearer)
        val previousSnapshot = wearerMarkerSnapshots[wearerId]
        val newSnapshot = WearerMarkerSnapshot(
            position = position,
            timestampMs = resolveMarkerTimestampMillis(wearer),
            accuracyMeters = resolveAccuracyMeters(wearer),
            imageUrl = wearer.image?.url,
            snippetText = lastUpdateText
        )
        wearerMarkerSnapshots[wearerId] = newSnapshot

        existingMarker.loadMarkerImage(newSnapshot.imageUrl)
        existingMarker.marker?.snippet = newSnapshot.snippetText

        val displayedStartPosition = existingMarker.position ?: position
        val animationSpec = WearerMarkerAnimationResolver.resolve(
            displayedFrom = displayedStartPosition,
            rawFrom = previousSnapshot?.position,
            rawTo = newSnapshot.position,
            previousTimestampMs = previousSnapshot?.timestampMs,
            currentTimestampMs = newSnapshot.timestampMs
        )

        if (!animationSpec.shouldAnimate) {
            cancelWearerAnimation(wearerId)
            existingMarker.updateMarkerPosition(newSnapshot.position)
            updateAccuracyCircle(wearerId, newSnapshot.position, newSnapshot.accuracyMeters)
            if (overlayStateMachine.isShowingWearer(wearerId)) {
                mapInfoOverlay?.updateText(newSnapshot.snippetText)
                mapInfoOverlay?.updatePosition(newSnapshot.position)
            }
            return false
        }

        animateWearerMarker(
            wearerId = wearerId,
            momoMarker = existingMarker,
            previousSnapshot = previousSnapshot,
            newSnapshot = newSnapshot,
            animationSpec = animationSpec
        )
        return true
    }

    private fun animateWearerMarker(
        wearerId: String,
        momoMarker: MomoMarker,
        previousSnapshot: WearerMarkerSnapshot?,
        newSnapshot: WearerMarkerSnapshot,
        animationSpec: WearerMarkerAnimationSpec
    ) {
        momoMarker.marker ?: return
        val startPosition = momoMarker.position ?: newSnapshot.position

        cancelWearerAnimation(wearerId)

        val endAccuracy = newSnapshot.accuracyMeters?.toDouble()
        val currentCircle = momoCircles[wearerId]
        val animatedCircle = when {
            endAccuracy == null -> {
                currentCircle?.remove()
                momoCircles.remove(wearerId)
                null
            }
            currentCircle != null -> currentCircle
            else -> createAccuracyCircle(startPosition, endAccuracy).also { momoCircles[wearerId] = it }
        }
        val startRadius = animatedCircle?.radius
            ?: previousSnapshot?.accuracyMeters?.toDouble()
            ?: endAccuracy

        Timber.d(
            "GoogleMapRetriever: Animating wearer=$wearerId displayDistance=${animationSpec.displayDistanceMeters}m " +
                "speed=${animationSpec.speedMetersPerSecond}m/s duration=${animationSpec.durationMs}ms"
        )

        val animator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = animationSpec.durationMs
            interpolator = LinearInterpolator()

            addUpdateListener { valueAnimator ->
                if (momoMarker.marker == null) return@addUpdateListener

                val fraction = valueAnimator.animatedFraction.toDouble()
                val interpolatedPosition =
                    SphericalUtil.interpolate(startPosition, newSnapshot.position, fraction)
                momoMarker.updateMarkerPosition(interpolatedPosition)
                animatedCircle?.center = interpolatedPosition

                if (animatedCircle != null && startRadius != null && endAccuracy != null) {
                    animatedCircle.radius = startRadius + (endAccuracy - startRadius) * fraction
                }

                if (overlayStateMachine.isShowingWearer(wearerId)) {
                    mapInfoOverlay?.updatePosition(interpolatedPosition)
                }
            }

            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    if (wearerMarkerAnimators[wearerId] !== this@apply) return
                    wearerMarkerAnimators.remove(wearerId)
                    if (momoMarker.marker == null) return

                    momoMarker.updateMarkerPosition(newSnapshot.position)
                    updateAccuracyCircle(wearerId, newSnapshot.position, newSnapshot.accuracyMeters)

                    if (overlayStateMachine.isShowingWearer(wearerId)) {
                        mapInfoOverlay?.updateText(newSnapshot.snippetText)
                        mapInfoOverlay?.updatePosition(newSnapshot.position)
                    }
                }
            })
        }

        wearerMarkerAnimators[wearerId] = animator
        animator.start()
    }

    private fun createAccuracyCircle(position: LatLng, accuracyMeters: Double): Circle {
        return googleMap.addCircle(
            CircleOptions()
                .center(position)
                .radius(accuracyMeters)
                .strokeWidth(5f)
                .strokeColor(
                    ContextCompat.getColor(context, R.color.colorPrimary)
                )
                .fillColor(
                    ContextCompat.getColor(
                        context, R.color.colorPrimaryTrans
                    )
                )
        )
    }

    private fun updateAccuracyCircle(
        wearerId: String,
        position: LatLng,
        accuracyMeters: Int?
    ) {
        val existingCircle = momoCircles[wearerId]
        when {
            accuracyMeters == null -> {
                existingCircle?.remove()
                momoCircles.remove(wearerId)
            }
            existingCircle == null -> {
                momoCircles[wearerId] = createAccuracyCircle(position, accuracyMeters.toDouble())
            }
            else -> {
                existingCircle.center = position
                existingCircle.radius = accuracyMeters.toDouble()
            }
        }
    }

    private fun removeWearerMarker(wearerId: String) {
        val wasVisibleWearer = overlayStateMachine.isShowingWearer(wearerId)
        cancelWearerAnimation(wearerId)
        momoMarkers.remove(wearerId)?.removeMarker()
        momoCircles.remove(wearerId)?.remove()
        wearerMarkerSnapshots.remove(wearerId)
        overlayStateMachine.handleWearerMarkerRemoved(wearerId)
        if (wasVisibleWearer) {
            mapInfoOverlay?.hide()
        }
    }

    private fun updateCachedWatchUser(mainCardWatchUser: MainCardWatchUser) {
        val watch = mainCardWatchUser.watchUser.watch
        val watchId = watch?.objectId
        val watchUserId = mainCardWatchUser.watchUser.objectId
        val index = lastMainCardWatchUsers.indexOfFirst { current ->
            val currentWatch = current.watchUser.watch
            currentWatch?.objectId == watchId || current.watchUser.objectId == watchUserId
        }

        if (index >= 0) {
            lastMainCardWatchUsers[index] = mainCardWatchUser
        } else {
            lastMainCardWatchUsers.add(mainCardWatchUser)
        }
    }

    private fun resolveAccuracyMeters(wearer: Wearer): Int? {
        return if (wearer.has("accuracy")) wearer.accuracy else null
    }

    private fun resolveMarkerTimestampMillis(wearer: Wearer): Long? {
        return wearer.lastLocationTime?.time
            ?: wearer.updatedAt?.time
            ?: wearer.createdAt?.time
    }

    private fun getFormattedLastUpdateText(wearer: com.sosmartlabs.momo.models.Wearer): String {
        return try {
            Timber.d("GoogleMapRetriever: Formatting last update date and time for wearer: ${wearer.objectId}")
            Timber.d("GoogleMapRetriever: Wearer has updatedAt: ${wearer.has("updatedAt")}")
            Timber.d("GoogleMapRetriever: Wearer has createdAt: ${wearer.has("createdAt")}")
            
            // Try to get updatedAt first, fallback to createdAt if not available
            val lastUpdateTime = when {
                wearer.has("lastLocationTime") -> {
                    val time = wearer.lastLocationTime
                    Timber.d("GoogleMapRetriever: Using lastLocationTime: $time")
                    time
                }
                wearer.has("updatedAt") -> {
                    val time = wearer.updatedAt
                    Timber.d("GoogleMapRetriever: Using updatedAt: $time")
                    time
                }
                wearer.has("createdAt") -> {
                    val time = wearer.createdAt
                    Timber.d("GoogleMapRetriever: Using createdAt: $time")
                    time
                }
                else -> {
                    val time = Date() // Current time as fallback
                    Timber.w("GoogleMapRetriever: No update time available, using current time: $time")
                    time
                }
            }
            
            // Use DateUtil to format date and time according to user preferences
            val formattedDateTime = DateUtil.getFormattedDateTimeDefaultTimeZone(lastUpdateTime!!)
            Timber.d("GoogleMapRetriever: Formatted date and time: '$formattedDateTime'")
            
            val finalText = context.getString(R.string.watch_info_last_update, formattedDateTime)
            Timber.d("GoogleMapRetriever: Final snippet text: '$finalText'")
            finalText
        } catch (e: Exception) {
            Timber.e(e, "GoogleMapRetriever: Error formatting last update time")
            val fallbackText = context.getString(R.string.last_update_unavailable)
            Timber.w("GoogleMapRetriever: Using fallback text: '$fallbackText'")
            fallbackText
        }
    }

    private fun moveMap(position: LatLng, zoom: Float = defaultFocusZoom) {
        Timber.d("GoogleMapRetriever: Moving map to position: $position")
        googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(position, zoom))
    }

    private fun showWearerOverlay(wearerId: String, position: LatLng, snippet: String) {
        overlayStateMachine.showWearer(wearerId)
        mapInfoOverlay?.show(position, snippet, geofence = false)
    }

    private fun showGeofenceOverlay(geofenceId: String, position: LatLng, snippet: String) {
        overlayStateMachine.showGeofence(geofenceId)
        mapInfoOverlay?.show(position, snippet, geofence = true)
    }

    private fun hideOverlayByUser() {
        overlayStateMachine.hideByUser()
        mapInfoOverlay?.hide()
    }

    private fun hideOverlayProgrammatically() {
        overlayStateMachine.hideProgrammatically()
        mapInfoOverlay?.hide()
    }

    private fun showWearerOverlayIfPossible(wearerId: String): Boolean {
        val activeMarker = momoMarkers[wearerId] ?: return false
        val position = activeMarker.position ?: return false
        val snippet = activeMarker.marker?.snippet ?: return false
        showWearerOverlay(wearerId, position, snippet)
        return true
    }

    private fun restorePreferredWearerOverlayIfNeeded() {
        if (!overlayStateMachine.shouldRestorePreferredWearer()) {
            return
        }

        val wearerId = overlayStateMachine.preferredWearerId ?: return
        if (!showWearerOverlayIfPossible(wearerId)) {
            hideOverlayProgrammatically()
        }
    }

    private fun syncVisibleGeofenceOverlayAfterRebuild() {
        val visibleGeofence =
            overlayStateMachine.visibleTarget as? MapOverlayStateMachine.OverlayTarget.Geofence ?: return
        val geofenceIds = geoFenceMarkers.mapTo(linkedSetOf()) { it.markerId }
        overlayStateMachine.handleGeofenceMarkersUpdated(geofenceIds)
        if (!overlayStateMachine.isShowingGeofence(visibleGeofence.geofenceId)) {
            mapInfoOverlay?.hide()
            return
        }

        val geofenceMarker = geoFenceMarkers.firstOrNull { it.markerId == visibleGeofence.geofenceId } ?: run {
            hideOverlayProgrammatically()
            return
        }
        val position = geofenceMarker.position ?: run {
            hideOverlayProgrammatically()
            return
        }
        val snippet = geofenceMarker.marker?.snippet ?: run {
            hideOverlayProgrammatically()
            return
        }
        mapInfoOverlay?.show(position, snippet, geofence = true)
    }

    fun setGeoFence(geofences: List<Geofence>) {
        Timber.d("GoogleMapRetriever: Setting ${geofences.size} geofences")
        runInMapMutex({
            Timber.d("GoogleMapRetriever: Clearing existing ${geoFenceMarkers.size} geofence markers and ${geoFenceCircles.size} circles")
            clearGeofenceMarkersAndCircles()
            for (geofence in geofences) {
                Timber.d("GoogleMapRetriever: Setting geofence: ${geofence.name}")
                val parseGeoPoint = geofence.center
                val center = LatLng(parseGeoPoint.latitude, parseGeoPoint.longitude)
                val geofenceId = if (geofence.isNew()) {
                    geofence.name ?: "unknown_geofence"
                } else {
                    geofence.objectId
                }
                
                // Format geofence snippet text
                val geofenceSnippet = context.getString(R.string.safe_zone_format, geofence.name)
                Timber.d("GoogleMapRetriever: Generated geofence snippet: '$geofenceSnippet'")
                
                val marker = googleMap.addMarker(
                    MarkerOptions()
                        .position(center)
                        .title(geofence.name)
                        .snippet(geofenceSnippet)
                        .anchor(.5f, .5f)
                ) ?: continue
                
                marker.tag = MarkerPayload.Geofence(
                    geofenceId = geofenceId,
                    geofenceName = geofence.name
                )
                val geofenceMarker = MomoMarker(
                    googleMapMarker = marker,
                    appContext = context,
                    markerType = MarkerType.GEOFENCE,
                    markerId = geofenceId,
                    visualSpec = MarkerVisualSpec.geofenceMap()
                )
                geofenceMarker.loadMarkerImage(null)

                Timber.d("GoogleMapRetriever: Geofence marker created with snippet: ${marker.snippet}")
                val circle = googleMap.addCircle(
                    CircleOptions()
                        .center(center)
                        .radius(geofence.radius.toDouble())
                        .strokeWidth(5f)
                        .strokeColor(
                            ContextCompat.getColor(
                                context,
                                R.color.colorSecondary
                            )
                        )
                        .fillColor(
                            ContextCompat.getColor(
                                context,
                                R.color.colorSecondaryTrans
                            )
                        )
                )
                geoFenceCircles.add(circle)
                geoFenceMarkers.add(geofenceMarker)
            }
            Timber.d("GoogleMapRetriever: Successfully added ${geoFenceMarkers.size} geofence markers to map")
            syncVisibleGeofenceOverlayAfterRebuild()
        })
    }

    fun focusWearer(objectId: String, zoom: Float = defaultFocusZoom) {
        Timber.d("GoogleMapRetriever: Focusing wearer with ID: $objectId and zoom $zoom")
        runInMapMutex({
            overlayStateMachine.selectPreferredWearer(objectId)
            val momoMarker = momoMarkers[objectId]
            if (momoMarker != null) {
                val position = momoMarker.position ?: return@runInMapMutex
                moveMap(position, zoom)
                val snippet = momoMarker.marker?.snippet ?: run {
                    hideOverlayProgrammatically()
                    return@runInMapMutex
                }
                showWearerOverlay(objectId, position, snippet)
            } else {
                hideOverlayProgrammatically()
            }
        })
    }

    fun locateWearer(objectId: String) {
        focusWearer(objectId)
    }

    /**
     * Snaps a wearer marker to the parent's position when BLE proximity is detected.
     * Animates the marker to the new position and hides the accuracy circle
     * (the parent's accuracy is used by the cloud update, not displayed here).
     */
    fun snapWearerToProximityPosition(wearerObjectId: String, parentPosition: LatLng) {
        runInMapMutex({
            val momoMarker = momoMarkers[wearerObjectId]
            if (momoMarker == null) {
                Timber.d("GoogleMapRetriever: No marker for wearer $wearerObjectId, skipping proximity snap")
                return@runInMapMutex
            }

            val startPosition = momoMarker.position ?: parentPosition
            val distance = SphericalUtil.computeDistanceBetween(startPosition, parentPosition)
            if (distance < 5) {
                Timber.d("GoogleMapRetriever: Wearer $wearerObjectId already within 5m of parent, skipping snap")
                return@runInMapMutex
            }

            Timber.d("GoogleMapRetriever: Snapping wearer $wearerObjectId to parent position (distance=${distance.roundToInt()}m)")

            cancelWearerAnimation(wearerObjectId)

            val durationMs = (distance / 12.0 * 1000).toLong().coerceIn(500, 2000)
            val circle = momoCircles[wearerObjectId]

            val animator = ValueAnimator.ofFloat(0f, 1f).apply {
                this.duration = durationMs
                interpolator = LinearInterpolator()

                addUpdateListener { va ->
                    if (momoMarker.marker == null) return@addUpdateListener
                    val fraction = va.animatedFraction.toDouble()
                    val interpolated = SphericalUtil.interpolate(startPosition, parentPosition, fraction)
                    momoMarker.updateMarkerPosition(interpolated)
                    circle?.center = interpolated
                    if (overlayStateMachine.isShowingWearer(wearerObjectId)) {
                        mapInfoOverlay?.updatePosition(interpolated)
                    }
                }

                addListener(object : AnimatorListenerAdapter() {
                    override fun onAnimationEnd(animation: Animator) {
                        wearerMarkerAnimators.remove(wearerObjectId)
                    }
                })
            }

            wearerMarkerAnimators[wearerObjectId] = animator
            animator.start()
        })
    }

    @SuppressLint("PotentialBehaviorOverride", "MissingPermission")
    fun setMap(googleMap: GoogleMap, overlayContainer: ViewGroup) {
        Timber.d("GoogleMapRetriever: Setting Google map")
        coroutineScope.launch {
            this@GoogleMapRetriever.googleMap = googleMap
            mapInfoOverlay?.cleanup()
            mapInfoOverlay = MapInfoOverlay(overlayContainer, googleMap)

            googleMap.setOnMarkerClickListener { marker: Marker ->
                val tag = marker.tag
                val snippet = marker.snippet

                if (snippet.isNullOrBlank()) {
                    return@setOnMarkerClickListener false
                }

                when (tag) {
                    is MarkerPayload.Wearer -> {
                        if (overlayStateMachine.isShowingWearer(tag.wearerId)) {
                            hideOverlayByUser()
                        } else {
                            showWearerOverlay(tag.wearerId, marker.position, snippet)
                        }
                    }
                    is MarkerPayload.Geofence -> {
                        if (overlayStateMachine.isShowingGeofence(tag.geofenceId)) {
                            hideOverlayByUser()
                        } else {
                            showGeofenceOverlay(tag.geofenceId, marker.position, snippet)
                        }
                    }
                    else -> {
                        hideOverlayByUser()
                    }
                }

                moveMap(marker.position, defaultFocusZoom)
                true
            }

            // Tapping the map (not a marker) hides the overlay
            googleMap.setOnMapClickListener {
                hideOverlayByUser()
            }

            googleMap.uiSettings.isMapToolbarEnabled = false
            googleMap.uiSettings.isMyLocationButtonEnabled = false

            // Enable native My Location feature (blue dot)
            try {
                googleMap.isMyLocationEnabled = true
                Timber.d("GoogleMapRetriever: My Location enabled")
            } catch (e: SecurityException) {
                Timber.w("GoogleMapRetriever: Location permission not granted, My Location disabled")
            }

            if (mapMutex.isLocked) {
                mapMutex.unlock()
            }
        }
    }

    fun setMarkerVisibility(
        mainCardWatchUser: MainCardWatchUser,
        onComplete: (() -> Unit)? = null
    ) {
        Timber.d("GoogleMapRetriever: Setting marker visibility for user: ${mainCardWatchUser.watchUser.watch?.objectId}")
        runInMapMutex({
            updateCachedWatchUser(mainCardWatchUser)

            val watch = mainCardWatchUser.watchUser.watch
            if (watch == null) {
                Timber.w("GoogleMapRetriever: Watch is null in setMarkerVisibility, skipping")
                return@runInMapMutex
            }

            val wearerId = watch.objectId
            val isAnimating = if (shouldDisplayWearerMarker(mainCardWatchUser, watch)) {
                val watchLocation = watch.lastKnownLocation
                if (watchLocation == null) {
                    removeWearerMarker(wearerId)
                    false
                } else {
                    upsertWearerMarker(
                        mainCardWatchUser,
                        LatLng(watchLocation.latitude, watchLocation.longitude)
                    )
                }
            } else {
                removeWearerMarker(wearerId)
                false
            }

            if (!isAnimating) {
                restorePreferredWearerOverlayIfNeeded()
            }
        }, onComplete)
    }

    /**
     * Sets the active wearer and auto-opens their overlay
     */
    fun setActiveWearer(wearerId: String?) {
        Timber.d("GoogleMapRetriever: Setting active wearer: $wearerId")
        Timber.d("GoogleMapRetriever: Current number of momo markers: ${momoMarkers.size}")

        runInMapMutex({
            overlayStateMachine.selectPreferredWearer(wearerId)
            if (wearerId == null) {
                hideOverlayProgrammatically()
                return@runInMapMutex
            }

            if (!showWearerOverlayIfPossible(wearerId)) {
                hideOverlayProgrammatically()
            }
        })
    }
}
