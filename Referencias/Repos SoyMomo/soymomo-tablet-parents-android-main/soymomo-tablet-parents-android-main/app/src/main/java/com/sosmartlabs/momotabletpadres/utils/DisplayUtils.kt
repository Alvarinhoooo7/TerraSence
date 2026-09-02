package com.sosmartlabs.momotabletpadres.utils

import android.content.Context
import android.util.DisplayMetrics

object DisplayUtils {

    /**
     * Converts dp (density-independent pixels) to equivalent pixels based on device density.
     *
     * @param dp The value in dp to convert to pixels.
     * @param context The context to access resources and display metrics.
     * @return The equivalent pixel value as a float.
     */
    fun dpToPx(dp: Float, context: Context): Float {
        val metrics = context.resources.displayMetrics
        return dp * (metrics.densityDpi.toFloat() / DisplayMetrics.DENSITY_DEFAULT)
    }

    /**
     * Converts pixels to dp (density-independent pixels) based on device density.
     *
     * @param px The value in pixels to convert to dp.
     * @param context The context to access resources and display metrics.
     * @return The equivalent dp value as a float.
     */
    fun pxToDp(px: Float, context: Context): Float {
        val metrics = context.resources.displayMetrics
        return px / (metrics.densityDpi.toFloat() / DisplayMetrics.DENSITY_DEFAULT)
    }
}