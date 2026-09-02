package com.sosmartlabs.momotabletpadres.main.model

import android.content.Context
import android.graphics.*
import android.graphics.drawable.Drawable
import androidx.appcompat.content.res.AppCompatResources
import androidx.core.content.ContextCompat
import com.bumptech.glide.Glide
import com.bumptech.glide.request.target.CustomTarget
import com.bumptech.glide.request.transition.Transition
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.utils.DisplayUtils
import timber.log.Timber
import androidx.core.graphics.createBitmap
import androidx.core.graphics.scale

class MomoMarker(
    private var googleMapMarker: Marker?,
    private val appContext: Context,
    private val markerType: MarkerType,
    private var imageUrl: String? = null,
    val markerId: String
) {

    enum class MarkerType { CHILD, PARENT, GEOFENCE }

    fun getMarkerPosition(): LatLng? = googleMapMarker?.position

    fun updateMarkerPosition(position: LatLng) {
        Timber.d("MomoMarker: Updating position for marker ID $markerId to $position")
        googleMapMarker?.position = position
    }

    fun removeMarker() {
        Timber.d("MomoMarker: Removing marker ID $markerId")
        googleMapMarker?.remove()
        googleMapMarker = null
    }

    /**
     * Load the image for the marker. If the URL is different from the previous one, reload.
     */
    fun loadMarkerImage() {
        Timber.d("MomoMarker: Loading marker image for marker ID $markerId with imageUrl $imageUrl")
        Glide.with(appContext)
            .asBitmap()
            .load(imageUrl)
            .into(object : CustomTarget<Bitmap>() {
                override fun onResourceReady(resource: Bitmap, transition: Transition<in Bitmap>?) {
                    Timber.d("MomoMarker: Image loaded successfully for marker ID $markerId, creating custom marker")
                    createMarkerWithImage(resource)
                }

                override fun onLoadCleared(placeholder: Drawable?) {
                    Timber.d("MomoMarker: Image cleared for marker ID $markerId, falling back to default marker")
                    createDefaultMarker()
                }

                override fun onLoadFailed(errorDrawable: Drawable?) {
                    Timber.e("MomoMarker: Failed to load image for marker ID $markerId, using default marker")
                    createDefaultMarker()
                }
            })
    }

    /**
     * Create a marker with a custom bitmap image.
     */
    private fun createMarkerWithImage(bitmap: Bitmap) {
        Timber.d("MomoMarker: Creating custom marker for ID $markerId")
        val markerWidth = DisplayUtils.dpToPx(47f, appContext).toInt()
        val markerHeight = DisplayUtils.dpToPx(67f, appContext).toInt()

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

        val imageSize = (0.75f * markerBitmap.width).toInt()
        val horizontalPadding = (markerBitmap.width - imageSize) / 2
        val verticalPadding = ((markerBitmap.width - imageSize) * (3f / 5f)).toInt()

        val scaledBitmap = bitmap.scale(imageSize, imageSize, false)
        val circularBitmap = getCircularBitmap(scaledBitmap)

        canvas.drawBitmap(circularBitmap, horizontalPadding.toFloat(), verticalPadding.toFloat(), null)

        googleMapMarker?.setIcon(BitmapDescriptorFactory.fromBitmap(markerBitmap))
        Timber.d("MomoMarker: Custom marker created successfully for ID $markerId")
    }

    /**
     * Create a default marker with a placeholder image.
     */
    private fun createDefaultMarker() {
        Timber.d("MomoMarker: Creating default marker for ID $markerId")
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
            Timber.d("MomoMarker: Default marker created successfully for ID $markerId")
        } ?: Timber.e("MomoMarker: Failed to create default marker - drawable resource is null for ID $markerId")
    }

    /**
     * Create a circular cropped bitmap.
     */
    private fun getCircularBitmap(bitmap: Bitmap): Bitmap {
        Timber.d("MomoMarker: Creating circular bitmap for marker ID $markerId")
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

        Timber.d("MomoMarker: Circular bitmap created successfully for ID $markerId")
        return circularBitmap
    }
}