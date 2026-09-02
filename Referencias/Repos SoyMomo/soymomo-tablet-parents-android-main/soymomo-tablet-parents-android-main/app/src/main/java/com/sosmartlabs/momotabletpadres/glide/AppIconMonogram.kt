package com.sosmartlabs.momotabletpadres.glide

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.widget.ImageView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions
import com.sosmartlabs.momotabletpadres.R

/**
 * A Gmail-style circular monogram avatar: a filled circle in a deterministic colour with the first
 * letter of [text] centred in white.
 *
 * The drawable reports no intrinsic size so it always fills the host [ImageView]'s bounds, drawing a
 * circle of `min(width, height) / 2` — matching the circle-crop applied to real icons.
 */
class MonogramDrawable(
    private val text: String,
    backgroundColor: Int,
) : Drawable() {

    private val backgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = backgroundColor
        style = Paint.Style.FILL
    }

    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textAlign = Paint.Align.CENTER
        typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
    }

    override fun draw(canvas: Canvas) {
        val radius = minOf(bounds.width(), bounds.height()) / 2f
        if (radius <= 0f) return
        val centerX = bounds.exactCenterX()
        val centerY = bounds.exactCenterY()

        canvas.drawCircle(centerX, centerY, radius, backgroundPaint)

        textPaint.textSize = radius * 0.9f
        val metrics = textPaint.fontMetrics
        val baseline = centerY - (metrics.ascent + metrics.descent) / 2f
        canvas.drawText(text, centerX, baseline, textPaint)
    }

    override fun setAlpha(alpha: Int) {
        backgroundPaint.alpha = alpha
        textPaint.alpha = alpha
    }

    override fun setColorFilter(colorFilter: ColorFilter?) {
        backgroundPaint.colorFilter = colorFilter
        textPaint.colorFilter = colorFilter
    }

    @Deprecated("Deprecated in Java", ReplaceWith("PixelFormat.TRANSLUCENT"))
    override fun getOpacity(): Int = PixelFormat.TRANSLUCENT
}

/**
 * Builds [MonogramDrawable]s for app icons that have no remote image.
 *
 * The colour is picked deterministically from the app name's hash, so a given app always keeps the
 * same identity colour across binds, scrolls and screens (unlike a random colour, which would
 * flicker on every redraw). The palette lives in res/values/monogram_colors.xml so design can tune
 * it without touching code.
 */
object AppIconMonogram {

    private const val FALLBACK_COLOR = 0xFF455A64.toInt() // blue grey, used only if the array is empty

    // Cached once: only the resolved colours are held, never a Context.
    @Volatile
    private var palette: IntArray? = null

    private fun palette(context: Context): IntArray {
        palette?.let { return it }
        val typed = context.resources.obtainTypedArray(R.array.app_monogram_colors)
        val colors = IntArray(typed.length()) { typed.getColor(it, FALLBACK_COLOR) }
        typed.recycle()
        return colors.also { palette = it }
    }

    fun forName(context: Context, appName: String?): MonogramDrawable {
        val colors = palette(context)
        val color = if (colors.isEmpty()) FALLBACK_COLOR else colors[colorIndex(appName, colors.size)]
        return MonogramDrawable(firstGlyph(appName), color)
    }

    /**
     * The display glyph for [appName]: the upper-cased first Unicode code point (so accents and
     * emoji survive intact), or "?" when the name is null/blank. Pure — unit tested.
     */
    fun firstGlyph(appName: String?): String {
        val name = appName?.trim().orEmpty()
        return name
            .takeIf { it.isNotEmpty() }
            ?.let { String(Character.toChars(it.codePointAt(0))) }
            ?.uppercase()
            ?: "?"
    }

    /**
     * Deterministic palette index in `[0, paletteSize)` derived from [appName]'s hash, so a given app
     * always maps to the same colour across binds, scrolls and screens. Pure — unit tested.
     */
    fun colorIndex(appName: String?, paletteSize: Int): Int {
        if (paletteSize <= 0) return 0
        val name = appName?.trim().orEmpty()
        return Math.floorMod(name.hashCode(), paletteSize)
    }
}

/**
 * Loads an app icon into this [ImageView], using a deterministic [AppIconMonogram] avatar derived
 * from [appName] as both the loading placeholder and the fallback when [model] is null or the load
 * fails. The real icon (when present) is circle-cropped and crossfades in over the monogram.
 *
 * [model] is any Glide-supported source: typically an icon URL [String], but also a pre-resolved
 * [android.graphics.drawable.Drawable], a [android.net.Uri], a resource id, etc.
 */
fun ImageView.loadAppIcon(model: Any?, appName: String?) {
    val monogram = AppIconMonogram.forName(context, appName)
    Glide.with(context)
        .load(model)
        .circleCrop()
        .placeholder(monogram)
        .error(monogram)
        .transition(DrawableTransitionOptions.withCrossFade())
        .into(this)
}
