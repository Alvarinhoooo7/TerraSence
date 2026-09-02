package com.sosmartlabs.momo.utils

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable

class ImageUtils {

    companion object {

        fun drawableToBitmap(drawable: Drawable): Bitmap {
            // If drawable is already a bitmap, return it directly
            if (drawable is BitmapDrawable && drawable.bitmap != null) {
                return drawable.bitmap
            }

            // Create bitmap with appropriate dimensions
            val width = if (drawable.intrinsicWidth <= 0) 1 else drawable.intrinsicWidth
            val height = if (drawable.intrinsicHeight <= 0) 1 else drawable.intrinsicHeight

            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)

            return bitmap
        }

    }

}