package com.sosmartlabs.momotabletpadres.locationhistory.model

import android.content.Context
import android.graphics.Canvas
import androidx.annotation.DrawableRes
import androidx.core.content.ContextCompat
import androidx.core.graphics.createBitmap
import androidx.core.graphics.scale
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.BitmapDescriptor
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.maps.model.PolylineOptions
import com.google.maps.android.SphericalUtil
import timber.log.Timber
import kotlin.math.max

class MapSVGLines {

    companion object {
        fun drawLine(
            path: PolylineOptions,
            map: GoogleMap,
            markers: MutableList<Marker>,
            icon: BitmapDescriptor,
            key: String,
            isForward: Boolean
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

            val numMarkers = max(1, (effectiveDistance / 100).toInt()) // One marker every 100 meters
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