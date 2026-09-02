package com.sosmartlabs.momo.map.marker

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import android.graphics.Path
import androidx.appcompat.content.res.AppCompatResources
import androidx.core.content.ContextCompat
import androidx.core.graphics.createBitmap
import androidx.core.graphics.scale
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.utils.DisplayUtils
import timber.log.Timber
import kotlin.math.min
import kotlin.math.roundToInt

data class MarkerVisualSpec(
    val widthDp: Float,
    val heightDp: Float,
    val imageScale: Float,
    val verticalPaddingRatio: Float
) {
    companion object {
        fun mainMap(): MarkerVisualSpec = MarkerVisualSpec(
            widthDp = 47f,
            heightDp = 67f,
            imageScale = 0.75f,
            verticalPaddingRatio = 3f / 5f
        )

        fun geofenceMap(): MarkerVisualSpec = MarkerVisualSpec(
            widthDp = 36f,
            heightDp = 50f,
            imageScale = 0.64f,
            verticalPaddingRatio = 3f / 5f
        )
    }
}

class MarkerIconFactory(private val appContext: Context) {

    /**
     * @param grayscale desaturates the finished marker — teardrop and avatar together — so
     *   it still identifies the wearer but reads as a record rather than a live position.
     *   Used by the disconnection screens, where the fix on show may be days old.
     */
    fun createMarkerIcon(
        markerType: MarkerType,
        avatarBitmap: Bitmap?,
        visualSpec: MarkerVisualSpec = MarkerVisualSpec.mainMap(),
        grayscale: Boolean = false
    ): Bitmap? {
        val markerWidth = DisplayUtils.dpToPx(visualSpec.widthDp, appContext).roundToInt()
        val markerHeight = DisplayUtils.dpToPx(visualSpec.heightDp, appContext).roundToInt()

        val markerBackgroundDrawable = ContextCompat.getDrawable(
            appContext,
            getBackgroundResource(markerType)
        ) ?: return null

        val markerBitmap = createBitmap(markerWidth, markerHeight)
        val canvas = Canvas(markerBitmap)
        markerBackgroundDrawable.setBounds(0, 0, markerWidth, markerHeight)
        markerBackgroundDrawable.draw(canvas)

        val sourceBitmap = avatarBitmap ?: getDefaultAvatarBitmap(markerType)
            ?: return if (grayscale) desaturate(markerBitmap) else markerBitmap
        val imageSize = (visualSpec.imageScale * markerBitmap.width).roundToInt()
        val horizontalPadding = (markerBitmap.width - imageSize) / 2
        val verticalPadding = ((markerBitmap.width - imageSize) * visualSpec.verticalPaddingRatio).roundToInt()

        val scaledBitmap = sourceBitmap.scale(imageSize, imageSize, false)
        val circularBitmap = getCircularBitmap(scaledBitmap)
        canvas.drawBitmap(
            circularBitmap,
            horizontalPadding.toFloat(),
            verticalPadding.toFloat(),
            null
        )

        return if (grayscale) desaturate(markerBitmap) else markerBitmap
    }

    /**
     * Applied to the composed marker rather than to the avatar alone, so the coloured
     * teardrop greys out too — a grey photo inside a bright pin would read as a loading
     * state rather than a deliberate one.
     */
    private fun desaturate(source: Bitmap): Bitmap {
        val output = createBitmap(source.width, source.height)
        val paint = Paint().apply {
            colorFilter = ColorMatrixColorFilter(ColorMatrix().apply { setSaturation(0f) })
        }
        Canvas(output).drawBitmap(source, 0f, 0f, paint)
        return output
    }

    private fun getBackgroundResource(markerType: MarkerType): Int {
        return when (markerType) {
            MarkerType.CHILD -> R.drawable.marker_kid
            MarkerType.PARENT -> R.drawable.marker_parent
            MarkerType.GEOFENCE -> R.drawable.marker_geofence
        }
    }

    private fun getDefaultAvatarBitmap(markerType: MarkerType): Bitmap? {
        val drawableRes = when (markerType) {
            MarkerType.CHILD, MarkerType.PARENT -> R.drawable.default_profile_pic
            MarkerType.GEOFENCE -> R.drawable.ic_safe_zone
        }
        val drawable = AppCompatResources.getDrawable(appContext, drawableRes) ?: run {
            Timber.e("MarkerIconFactory: Drawable resource not found for marker type: $markerType")
            return null
        }
        val width = if (drawable.bounds.isEmpty) drawable.intrinsicWidth else drawable.bounds.width()
        val height = if (drawable.bounds.isEmpty) drawable.intrinsicHeight else drawable.bounds.height()
        if (width <= 0 || height <= 0) {
            Timber.e("MarkerIconFactory: Invalid drawable dimensions for marker type: $markerType")
            return null
        }
        val bitmap = createBitmap(width, height)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        return bitmap
    }

    private fun getCircularBitmap(bitmap: Bitmap): Bitmap {
        val bitmapWidth = bitmap.width
        val bitmapHeight = bitmap.height
        val circularBitmap = createBitmap(bitmapWidth, bitmapHeight)

        val path = Path().apply {
            addCircle(
                bitmapWidth / 2f,
                bitmapHeight / 2f,
                min(bitmapWidth / 2f, bitmapHeight / 2f),
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
        return circularBitmap
    }
}
