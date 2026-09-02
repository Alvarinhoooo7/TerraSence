package com.sosmartlabs.momotabletpadres.utils.ui

import android.graphics.Color
import android.graphics.drawable.GradientDrawable

object GradientBackground {

    fun createGradient(planColors: String, gradientOrientation: GradientDrawable.Orientation): GradientDrawable {
        val firstColor = Color.parseColor(planColors.split(",")[0])
        val secondColor = Color.parseColor(planColors.split(",")[1])

        val drawable = GradientDrawable().apply {
            colors = intArrayOf(
                firstColor, secondColor
            )
            orientation = gradientOrientation
            gradientType = GradientDrawable.LINEAR_GRADIENT
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 16f
        }
        return drawable
    }
}