package com.sosmartlabs.momotabletpadres.locationhistory.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import androidx.appcompat.content.res.AppCompatResources
import androidx.core.content.ContextCompat
import androidx.core.graphics.createBitmap
import androidx.core.graphics.scale
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.utils.DisplayUtils
import timber.log.Timber

class AvatarMarker(
    private var googleMapMarker: Marker?,
    private val appContext: Context,
    private val markerType: MarkerType,
    private var bitmap: Bitmap,
    val markerId: String
) {

    enum class MarkerType { CHILD, PARENT, GEOFENCE }

    fun getMarkerPosition(): LatLng? = googleMapMarker?.position

    fun updateMarkerPosition(position: LatLng) {
        Timber.d("AvatarMarker: Updating position for marker ID $markerId to $position")
        googleMapMarker?.position = position
    }

    fun removeMarker() {
        Timber.d("AvatarMarker: Removing marker ID $markerId")
        googleMapMarker?.remove()
        googleMapMarker = null
    }

    /**
     * Load the image for the marker. If the URL is different from the previous one, reload.
     */
    fun loadMarkerImage() {
        createMarkerWithImage(bitmap)
    }

    /**
     * Create a marker with a custom bitmap image.
     */
    private fun createMarkerWithImage(bitmap: Bitmap) {
        Timber.d("AvatarMarker: Creating custom marker for ID $markerId")
        val markerWidth = DisplayUtils.dpToPx(67f, appContext).toInt()
        val markerHeight = DisplayUtils.dpToPx(80f, appContext).toInt()

        val markerResource = when (markerType) {
            MarkerType.CHILD -> R.drawable.marker_kid
            MarkerType.PARENT -> R.drawable.marker_parent
            MarkerType.GEOFENCE -> R.drawable.marker_geofence
        }
        val markerBackgroundDrawable = ContextCompat.getDrawable(appContext, markerResource)

        val markerBitmap = createBitmap(markerWidth, markerHeight)
        val canvas = Canvas(markerBitmap)
        markerBackgroundDrawable?.setBounds(0, 0, markerWidth, markerHeight)
        markerBackgroundDrawable?.draw(canvas)

        val imageSize = (0.8f * markerBitmap.width).toInt()
        val horizontalPadding = (markerBitmap.width - imageSize) / 2
        val verticalPadding = ((markerBitmap.width - imageSize) * (3f / 6f)).toInt()

        val scaledBitmap = bitmap.scale(imageSize, imageSize, false)
        val circularBitmap = getCircularBitmap(scaledBitmap)

        canvas.drawBitmap(circularBitmap, horizontalPadding.toFloat(), verticalPadding.toFloat(), null)

        googleMapMarker?.setIcon(BitmapDescriptorFactory.fromBitmap(markerBitmap))
        Timber.d("AvatarMarker: Custom marker created successfully for ID $markerId")
    }

    /**
     * Create a default marker with a placeholder image.
     */
    private fun createDefaultMarker() {
        Timber.d("AvatarMarker: Creating default marker for ID $markerId")
        val defaultDrawable = when (markerType) {
            MarkerType.CHILD, MarkerType.PARENT -> AppCompatResources.getDrawable(appContext, R.drawable.default_profile_pic)
            MarkerType.GEOFENCE -> AppCompatResources.getDrawable(appContext, R.drawable.ic_safe_zone)
        }
        defaultDrawable?.let {
            val defaultWidth = if (defaultDrawable.bounds.isEmpty) defaultDrawable.intrinsicWidth else defaultDrawable.bounds.width()
            val defaultHeight = if (defaultDrawable.bounds.isEmpty) defaultDrawable.intrinsicHeight else defaultDrawable.bounds.height()

            val defaultBitmap = createBitmap(defaultWidth, defaultHeight)
            val canvas = Canvas(defaultBitmap)
            defaultDrawable.setBounds(0, 0, canvas.width, canvas.height)
            defaultDrawable.draw(canvas)

            createMarkerWithImage(defaultBitmap)
            Timber.d("AvatarMarker: Default marker created successfully for ID $markerId")
        } ?: Timber.e("AvatarMarker: Failed to create default marker - drawable resource is null for ID $markerId")
    }

    /**
     * Create a circular cropped bitmap.
     */
    private fun getCircularBitmap(bitmap: Bitmap): Bitmap {
        Timber.d("AvatarMarker: Creating circular bitmap for marker ID $markerId")
        val bitmapWidth = bitmap.width
        val bitmapHeight = bitmap.height
        val circularBitmap = createBitmap(bitmapWidth, bitmapHeight)

        val path = Path().apply {
            addCircle(
                bitmapWidth / 2f,
                bitmapHeight / 2f,
                bitmapWidth.toDouble().coerceAtMost((bitmapHeight / 2f).toDouble()).toFloat(),
                Path.Direction.CCW
            )
        }

        val paint = Paint().apply {
            color = Color.WHITE
            style = Paint.Style.STROKE
            strokeWidth = 4f
        }

        val canvas = Canvas(circularBitmap)
        canvas.clipPath(path)
        canvas.drawBitmap(bitmap, 0f, 0f, null)
        canvas.drawPath(path, paint)

        Timber.d("AvatarMarker: Circular bitmap created successfully for ID $markerId")
        return circularBitmap
    }
} 