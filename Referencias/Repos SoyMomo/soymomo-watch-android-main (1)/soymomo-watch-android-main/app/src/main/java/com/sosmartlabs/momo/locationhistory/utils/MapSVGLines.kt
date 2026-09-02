package com.sosmartlabs.momo.locationhistory.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.location.Location
import androidx.annotation.DrawableRes
import androidx.core.content.ContextCompat
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.BitmapDescriptor
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.maps.model.PolylineOptions
import com.google.maps.android.SphericalUtil
import com.sosmartlabs.momo.locationhistory.ui.PolylineData
import timber.log.Timber
import androidx.core.graphics.createBitmap
import androidx.core.graphics.scale
import kotlin.math.max
import kotlin.math.min

class MapSVGLines {

    companion object {

        /**
         * Upper bound on the direction arrows drawn for a single segment.
         *
         * Arrows are spaced one every 100 m, and when a segment has no road-snapped path that
         * distance is the raw distance between two GPS fixes: a single noisy fix can be tens of
         * kilometres away and used to produce thousands of markers. Every marker is a synchronous
         * Binder round-trip to the maps process and is retained for the life of the screen, which
         * exhausted the heap (Crashlytics a46a7fdf29b49356318bfed244445fd7) and blocked the main
         * thread (Crashlytics 8c95ad5d69ae93e3a214e655add56816).
         */
        const val MAX_MARKERS_PER_SEGMENT = 20

        /**
         * Upper bound on the direction arrows drawn for a whole route. The per-segment cap alone
         * still scales with the number of segments, so callers split this budget across the
         * segments they are about to draw and pass the remainder as `markerBudget`.
         */
        const val MAX_MARKERS_PER_ROUTE = 300

        /**
         * @param markerBudget how many markers this call may add, further capped by
         *   [MAX_MARKERS_PER_SEGMENT]. Nothing is drawn once the budget is exhausted.
         */
        fun drawLine(
            path: PolylineOptions,
            map: GoogleMap,
            markers: MutableList<Marker>,
            icon: BitmapDescriptor,
            key: String,
            isForward: Boolean,
            markerBudget: Int = MAX_MARKERS_PER_SEGMENT
        ) {
            Timber.d("MapSVGLines: Drawing line $key (isForward: $isForward)")
            val points = path.points
            if (points.size < 2) return

            val start = points[0]
            val end = points[1]
            val distance = SphericalUtil.computeDistanceBetween(start, end)

            // For reverse direction, if we're starting 50m later, we need to adjust the number of markers
            val effectiveDistance = if (isForward) {
                distance
            } else {
                max(0.0, distance - 50.0) // Ensure we don't get negative distance
            }
            
            val allowedMarkers = min(markerBudget, MAX_MARKERS_PER_SEGMENT)
            if (allowedMarkers < 1) {
                Timber.d("MapSVGLines: Marker budget exhausted, skipping direction arrows for $key")
                return
            }

            val requestedMarkers = (effectiveDistance / 100).toInt() // One marker every 100 meters
            val numMarkers = max(1, min(requestedMarkers, allowedMarkers))
            if (requestedMarkers > numMarkers) {
                Timber.d("MapSVGLines: Capping $key direction arrows from $requestedMarkers to $numMarkers (distance: ${effectiveDistance}m)")
            }
            val positions = mutableListOf<LatLng>()

            for (i in 0 until numMarkers) {
                // Calculate fraction for even distribution
                val fraction = if (isForward) {
                    (i + 1.0) / (numMarkers + 1)
                } else {
                    // Start 50m later but still evenly distribute the remaining markers
                    val startOffset = 50.0 / distance
                    startOffset + (i * (1.0 - startOffset)) / numMarkers
                }
                
                val position = if (isForward) {
                    SphericalUtil.interpolate(start, end, fraction)
                } else {
                    SphericalUtil.interpolate(end, start, fraction)
                }
                positions.add(position)
            }

            // For each marker, calculate the local bearing
            for (i in positions.indices) {
                val prev = if (i == 0) {
                    if (isForward) start else end
                } else {
                    positions[i - 1]
                }
                val next = positions[i]
                val rawBearing = SphericalUtil.computeHeading(prev, next)
                val normalizedBearing = ((rawBearing % 360) + 360) % 360
                val marker = map.addMarker(
                    MarkerOptions()
                        .position(next)
                        .icon(icon)
                        .anchor(0.5f, 0.5f)
                        .rotation(normalizedBearing.toFloat())
                )
                marker?.let {
                    markers.add(it)
                    Timber.d("MapSVGLines: Added marker at ${next.latitude},${next.longitude} with rotation ${normalizedBearing.toFloat()} (raw: $rawBearing), this rotation is for isForward: $isForward")
                }
            }
        }

        fun vectorToBitmap(@DrawableRes id: Int, context: Context, width: Int? = null, height: Int? = null): BitmapDescriptor {
            Timber.d("MapSVGLines: Converting vector drawable to bitmap descriptor")

            val vectorDrawable = ContextCompat.getDrawable(context, id)?.apply {
                setBounds(0, 0, intrinsicWidth, intrinsicHeight)
            } ?: return BitmapDescriptorFactory.defaultMarker()

            val bitmap = createBitmap(vectorDrawable.intrinsicWidth, vectorDrawable.intrinsicHeight).also { bitmap ->
                Canvas(bitmap).let { vectorDrawable.draw(it) }
            }

            return if (width != null && height != null) {
                Timber.d("MapSVGLines: Scaling bitmap to specified dimensions: ${width}x${height}")
                val scaledBitmap = bitmap.scale(width, height, false)
                BitmapDescriptorFactory.fromBitmap(scaledBitmap)
            } else {
                BitmapDescriptorFactory.fromBitmap(bitmap)
            }
        }
    }
}