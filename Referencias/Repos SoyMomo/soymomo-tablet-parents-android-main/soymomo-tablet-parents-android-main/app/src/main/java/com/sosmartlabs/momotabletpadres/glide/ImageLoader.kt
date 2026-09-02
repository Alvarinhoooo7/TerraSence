package com.sosmartlabs.momotabletpadres.glide

import android.widget.ImageView
import com.bumptech.glide.Glide

/**
 * Loads an image into this [ImageView] using Glide.
 * 
 * This works with any Glide-supported model including EncryptedParseFile for encrypted images.
 * 
 * @param model Any object supported by Glide (Uri, File, Bitmap, String, resource id as Int, ByteArray, Drawable, EncryptedParseFile)
 * @param fallback Image resource Id to display if loading fails
 */
fun <T> ImageView.loadImage(model: T, fallback: Int = 0) {
    Glide.with(context)
        .load(model)
        .error(fallback)
        .into(this)
}
