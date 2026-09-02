package com.sosmartlabs.momo.utils.ui

import android.widget.ImageView
import com.bumptech.glide.Glide

/**
 * Loads an image on this [ImageView]
 * @param model Any object supported by Glide (Uri, File, Bitmap, String, resource id as Int, ByteArray, and Drawable)
 * @param fallback Image resource Id for loading into the [ImageView] if loading fails
 */
fun <T> ImageView.loadImage(model: T, fallback: Int = 0) {
    Glide.with(context)
        .load(model)
        .error(fallback)
        .into(this)
}