package com.sosmartlabs.momo.map.infowindow

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.LatLng
import com.sosmartlabs.momo.databinding.InfowindowGeofenceMarkerBinding
import com.sosmartlabs.momo.databinding.InfowindowMainMarkerBinding
import com.sosmartlabs.momo.utils.DisplayUtils
import kotlin.math.roundToInt

/**
 * A custom map overlay that replaces the native Google Maps InfoWindow.
 *
 * Native InfoWindows are rendered as static bitmaps, so they flicker when the
 * underlying marker moves (e.g. during location-update animations). This class
 * manages a real View that is repositioned via [GoogleMap.Projection] on every
 * camera or marker-position change, providing a smooth, flicker-free experience.
 */
class MapInfoOverlay(
    private val container: ViewGroup,
    private val googleMap: GoogleMap
) {

    private val wearerBinding: InfowindowMainMarkerBinding =
        InfowindowMainMarkerBinding.inflate(LayoutInflater.from(container.context), container, false)

    private val geofenceBinding: InfowindowGeofenceMarkerBinding =
        InfowindowGeofenceMarkerBinding.inflate(LayoutInflater.from(container.context), container, false)

    private val wearerMarkerHeightPx =
        DisplayUtils.dpToPx(67f, container.context).roundToInt()

    private val geofenceMarkerHeightPx =
        DisplayUtils.dpToPx(50f, container.context).roundToInt()

    private var activePosition: LatLng? = null
    private var isGeofence: Boolean = false
    private var isVisible: Boolean = false

    private val activeView: View
        get() = if (isGeofence) geofenceBinding.root else wearerBinding.root

    private val activeMarkerHeightPx: Int
        get() = if (isGeofence) geofenceMarkerHeightPx else wearerMarkerHeightPx

    init {
        wearerBinding.root.visibility = View.GONE
        geofenceBinding.root.visibility = View.GONE
        container.addView(wearerBinding.root)
        container.addView(geofenceBinding.root)

        googleMap.setOnCameraMoveListener { reposition() }
    }

    fun show(position: LatLng, text: String, geofence: Boolean) {
        // Hide the previously active view if switching type
        if (isVisible && geofence != isGeofence) {
            activeView.visibility = View.GONE
        }

        isGeofence = geofence
        activePosition = position
        isVisible = true

        if (geofence) {
            geofenceBinding.textSafeZone.text = text
        } else {
            wearerBinding.textLastUpdate.text = text
        }

        activeView.visibility = View.VISIBLE
        reposition()
    }

    fun updatePosition(position: LatLng) {
        activePosition = position
        if (isVisible) reposition()
    }

    fun updateText(text: String) {
        if (isGeofence) {
            geofenceBinding.textSafeZone.text = text
        } else {
            wearerBinding.textLastUpdate.text = text
        }
        if (isVisible) reposition()
    }

    fun hide() {
        isVisible = false
        activePosition = null
        wearerBinding.root.visibility = View.GONE
        geofenceBinding.root.visibility = View.GONE
    }

    fun isShowing(): Boolean = isVisible

    fun reposition() {
        val position = activePosition ?: return
        if (!isVisible) return
        if (container.width <= 0 || container.height <= 0) {
            if (container.isAttachedToWindow) {
                container.post { reposition() }
            }
            return
        }

        val view = activeView

        // Measure the overlay so we can center it horizontally and place it above the marker
        view.measure(
            View.MeasureSpec.makeMeasureSpec(container.width, View.MeasureSpec.AT_MOST),
            View.MeasureSpec.makeMeasureSpec(container.height, View.MeasureSpec.AT_MOST)
        )

        val overlayWidth = view.measuredWidth
        val overlayHeight = view.measuredHeight
        if (overlayWidth <= 0 || overlayHeight <= 0) {
            if (container.isAttachedToWindow) {
                container.post { reposition() }
            }
            return
        }

        val screenPoint = googleMap.projection.toScreenLocation(position)

        view.translationX = (screenPoint.x - overlayWidth / 2f)
        view.translationY = (screenPoint.y - overlayHeight - activeMarkerHeightPx).toFloat()
    }

    fun cleanup() {
        hide()
        container.removeView(wearerBinding.root)
        container.removeView(geofenceBinding.root)
    }
}
