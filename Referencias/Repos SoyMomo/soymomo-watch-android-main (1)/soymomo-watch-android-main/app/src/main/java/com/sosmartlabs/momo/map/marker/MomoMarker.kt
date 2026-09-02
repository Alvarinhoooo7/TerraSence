package com.sosmartlabs.momo.map.marker

import android.content.Context
import android.graphics.Bitmap
import android.graphics.drawable.Drawable
import com.bumptech.glide.Glide
import com.bumptech.glide.request.target.CustomTarget
import com.bumptech.glide.request.transition.Transition
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import timber.log.Timber

class MomoMarker(
    private var googleMapMarker: Marker?,
    appContext: Context,
    private val markerType: MarkerType,
    val markerId: String,
    private val visualSpec: MarkerVisualSpec = MarkerVisualSpec.mainMap(),
    /** See [MarkerIconFactory.createMarkerIcon]. Applies to every reload, including the
     *  async Glide callback, so a late-arriving avatar cannot land in full colour. */
    private val grayscale: Boolean = false
) {

    /**
     * Normalised here on purpose: callers pass an Activity context (see [GoogleMapRetriever],
     * which injects `@ActivityContext`), but marker images load asynchronously and can land
     * after the host is gone — binding Glide to an Activity threw "You cannot start a load
     * for a destroyed activity" in production. Keeping the constructor parameter named
     * `appContext` is deliberate: every call site already uses it as a named argument.
     */
    private val applicationContext: Context = appContext.applicationContext

    private val markerIconFactory = MarkerIconFactory(applicationContext)
    private var imageUrl: String? = null
    private var imageTarget: CustomTarget<Bitmap>? = null

    val marker: Marker?
        get() = googleMapMarker

    val position: LatLng?
        get() = googleMapMarker?.position

    fun updateMarkerPosition(position: LatLng) {
        googleMapMarker?.position = position
    }

    fun removeMarker() {
        clearPendingImageLoad()
        googleMapMarker?.remove()
        googleMapMarker = null
    }

    fun loadMarkerImage(newImageUrl: String?) {
        if (imageUrl == newImageUrl && imageTarget != null) {
            return
        }

        imageUrl = newImageUrl
        clearPendingImageLoad()

        if (newImageUrl.isNullOrBlank()) {
            applyMarkerBitmap(null)
            return
        }

        imageTarget = object : CustomTarget<Bitmap>() {
            override fun onResourceReady(resource: Bitmap, transition: Transition<in Bitmap>?) {
                applyMarkerBitmap(resource)
            }

            override fun onLoadCleared(placeholder: Drawable?) {
                applyMarkerBitmap(null)
            }

            override fun onLoadFailed(errorDrawable: Drawable?) {
                Timber.w("MomoMarker: Failed to load marker image for markerId=$markerId")
                applyMarkerBitmap(null)
            }
        }

        Glide.with(applicationContext)
            .asBitmap()
            .load(newImageUrl)
            .into(requireNotNull(imageTarget))
    }

    fun loadMarkerBitmap(bitmap: Bitmap?) {
        clearPendingImageLoad()
        applyMarkerBitmap(bitmap)
    }

    fun clearPendingImageLoad() {
        imageTarget?.let { target ->
            Glide.with(applicationContext).clear(target)
        }
        imageTarget = null
    }

    private fun applyMarkerBitmap(bitmap: Bitmap?) {
        val markerBitmap = markerIconFactory.createMarkerIcon(markerType, bitmap, visualSpec, grayscale) ?: return
        googleMapMarker?.setIcon(BitmapDescriptorFactory.fromBitmap(markerBitmap))
    }
}
