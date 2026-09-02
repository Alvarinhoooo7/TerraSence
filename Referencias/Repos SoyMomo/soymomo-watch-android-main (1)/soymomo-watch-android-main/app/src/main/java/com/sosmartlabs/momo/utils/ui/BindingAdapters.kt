package com.sosmartlabs.momo.utils.ui

import android.view.View
import android.widget.ImageView
import androidx.databinding.BindingAdapter
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.bitmap.RoundedCorners
import com.bumptech.glide.request.RequestOptions
import com.parse.ParseFile
import com.sosmartlabs.momo.R

/**
 * Helpers for DataBinding that can be user from different places in the code
 */
object BindingAdapters {
    /**
     * Uses Glide library for formatting a bitmap before putting it on a ImageView
     * @param view ImageView in which the bitmap will be placed
     * @param image String with the URI of the image resource to load
     */
    @BindingAdapter("app:imageApp")
    @JvmStatic fun loadImage(view: ImageView, image: String?) {
        Glide.with(view.context)
            .load(image)
            .apply(RequestOptions.bitmapTransform( RoundedCorners(8)))
            .placeholder(R.drawable.ic_apps_primary)
            .error(R.drawable.ic_apps_primary)
            .into(view)
    }

    /**
     * Uses Glide library for formatting a bitmap before putting it on a ImageView
     * @param view ImageView in which the bitmap will be placed
     * @param image ParseFile image resource to load
     */
    @BindingAdapter("app:image")
    @JvmStatic fun loadImage(view: ImageView, image: ParseFile?) {
        if (image != null) {
            view.visibility = View.VISIBLE
            Glide.with(view.context)
                .load(image.url)
                .apply(RequestOptions.bitmapTransform( RoundedCorners(8)))
                .into(view)
        }
    }
}