package com.sosmartlabs.momo.chat.presentation.share

import android.content.Context
import android.graphics.Bitmap
import android.os.Build
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.util.LruCache
import androidx.annotation.ColorInt
import androidx.core.content.ContextCompat
import androidx.core.graphics.createBitmap
import androidx.core.graphics.scale
import com.bumptech.glide.Glide
import com.bumptech.glide.request.FutureTarget
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.utils.InstagramStoryShare
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import java.lang.IllegalStateException
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.max
import kotlin.math.min

@Singleton
class ShareImageRenderer @Inject constructor(
    @param:ApplicationContext private val appContext: Context
) {

    companion object {
        private const val PREVIEW_WIDTH = 720
        private const val PREVIEW_HEIGHT = 1280
        private const val PREVIEW_ORIGINAL_LONG_EDGE = 960
        private const val FINAL_TEMPLATE_WIDTH = 1080
        private const val FINAL_TEMPLATE_HEIGHT = 1920
        private const val FINAL_ORIGINAL_LONG_EDGE = 1440
        private const val PREVIEW_CACHE_KB = 12 * 1024
        private const val WATERMARK_ALPHA = 128
        private const val WATERMARK_WIDTH_FACTOR = 0.18f
        private const val WATERMARK_INSET_FACTOR = 0.04f
        private const val PHOTO_CORNER_FACTOR = 0.055f
        private const val CARD_COMPOSITION_WIDTH_FACTOR = 0.84f
        private const val CARD_COMPOSITION_HEIGHT_FACTOR = 0.72f
        private const val CARD_STORY_STICKER_WIDTH_FACTOR = 0.88f
        private const val CARD_STORY_STICKER_HEIGHT_FACTOR = 0.78f
        private const val INSTAGRAM_CARD_STICKER_CANVAS_SIZE = 1536
        private const val INSTAGRAM_CARD_STICKER_PADDING = 24
        private const val TRANSPARENCY_PREVIEW_TILE_COUNT = 20
    }

    private val previewCache = object : LruCache<String, Bitmap>(PREVIEW_CACHE_KB) {
        override fun sizeOf(key: String, value: Bitmap): Int = value.byteCount / 1024
    }

    fun clearPreviewCache() {
        previewCache.evictAll()
    }

    fun renderPreview(
        request: ChatPhotoShareRequest,
        template: ShareTemplate
    ): Bitmap {
        val cacheKey = "${request.messageId}:${template.analyticsValue()}"
        previewCache.get(cacheKey)?.let { return it }

        val preview = when (template) {
            ShareTemplate.ORIGINAL -> {
                val source = loadBoundedBitmap(
                    imageUrl = request.imageUrl,
                    maxLongEdge = PREVIEW_ORIGINAL_LONG_EDGE
                )
                renderRoundedWatermarkedPhoto(source).also {
                    source.recycle()
                }
            }

            ShareTemplate.PHOTO_CARD -> {
                val source = loadSourceBitmap(
                    imageUrl = request.imageUrl,
                    maxWidth = PREVIEW_WIDTH,
                    maxHeight = PREVIEW_HEIGHT
                )
                val cardBitmap = renderCardStickerBitmap(
                    source = source,
                    width = (PREVIEW_WIDTH * CARD_COMPOSITION_WIDTH_FACTOR).toInt(),
                    height = (PREVIEW_HEIGHT * CARD_COMPOSITION_HEIGHT_FACTOR).toInt()
                )
                source.recycle()
                renderCardComposition(
                    cardBitmap = cardBitmap,
                    width = PREVIEW_WIDTH,
                    height = PREVIEW_HEIGHT
                ).also {
                    cardBitmap.recycle()
                }
            }

            ShareTemplate.TRANSPARENCY -> {
                val source = loadSourceBitmap(
                    imageUrl = request.imageUrl,
                    maxWidth = PREVIEW_WIDTH,
                    maxHeight = PREVIEW_HEIGHT
                )
                val cardBitmap = renderCardStickerBitmap(
                    source = source,
                    width = (PREVIEW_WIDTH * CARD_COMPOSITION_WIDTH_FACTOR).toInt(),
                    height = (PREVIEW_HEIGHT * CARD_COMPOSITION_HEIGHT_FACTOR).toInt()
                )
                source.recycle()
                renderCheckerboardComposition(
                    cardBitmap = cardBitmap,
                    width = PREVIEW_WIDTH,
                    height = PREVIEW_HEIGHT
                ).also {
                    cardBitmap.recycle()
                }
            }
        }

        previewCache.put(cacheKey, preview)
        return preview
    }

    fun renderFinal(
        request: ChatPhotoShareRequest,
        template: ShareTemplate
    ): RenderedSharePayload {
        return when (template) {
            ShareTemplate.ORIGINAL -> {
                val intermediates = mutableListOf<Bitmap>()
                try {
                    val source = loadSourceBitmap(
                        imageUrl = request.imageUrl,
                        maxWidth = FINAL_TEMPLATE_WIDTH,
                        maxHeight = FINAL_TEMPLATE_HEIGHT
                    ).also { intermediates += it }
                    val bounded = scaleBitmapLongEdge(source, FINAL_ORIGINAL_LONG_EDGE)
                    if (bounded !== source) intermediates += bounded
                    RenderedSharePayload(
                        primaryImage = RenderedShareBitmap(
                            bitmap = renderRoundedWatermarkedPhoto(bounded),
                            compressFormat = Bitmap.CompressFormat.PNG,
                            mimeType = "image/png",
                            fileExtension = "png",
                            quality = 100
                        ),
                        instagramStoryBackground = RenderedShareBitmap(
                            bitmap = renderFullBleedWatermarkedPhoto(
                                source = source,
                                width = FINAL_TEMPLATE_WIDTH,
                                height = FINAL_TEMPLATE_HEIGHT
                            ),
                            compressFormat = Bitmap.CompressFormat.JPEG,
                            mimeType = "image/jpeg",
                            fileExtension = "jpg",
                            quality = 92
                        )
                    )
                } finally {
                    intermediates.forEach { it.recycle() }
                }
            }

            ShareTemplate.PHOTO_CARD -> {
                val intermediates = mutableListOf<Bitmap>()
                try {
                    val source = loadSourceBitmap(
                        imageUrl = request.imageUrl,
                        maxWidth = FINAL_TEMPLATE_WIDTH,
                        maxHeight = FINAL_TEMPLATE_HEIGHT
                    ).also { intermediates += it }
                    val cardBitmap = renderCardStickerBitmap(
                        source = source,
                        width = (FINAL_TEMPLATE_WIDTH * CARD_COMPOSITION_WIDTH_FACTOR).toInt(),
                        height = (FINAL_TEMPLATE_HEIGHT * CARD_COMPOSITION_HEIGHT_FACTOR).toInt()
                    ).also { intermediates += it }
                    val instagramStoryCardBitmap = renderCardStickerBitmap(
                        source = source,
                        width = (FINAL_TEMPLATE_WIDTH * CARD_STORY_STICKER_WIDTH_FACTOR).toInt(),
                        height = (FINAL_TEMPLATE_HEIGHT * CARD_STORY_STICKER_HEIGHT_FACTOR).toInt()
                    ).also { intermediates += it }
                    RenderedSharePayload(
                        primaryImage = RenderedShareBitmap(
                            bitmap = renderCardComposition(
                                cardBitmap = cardBitmap,
                                width = FINAL_TEMPLATE_WIDTH,
                                height = FINAL_TEMPLATE_HEIGHT
                            ),
                            compressFormat = Bitmap.CompressFormat.JPEG,
                            mimeType = "image/jpeg",
                            fileExtension = "jpg",
                            quality = 92
                        ),
                        instagramStoryBackground = RenderedShareBitmap(
                            bitmap = createSolidColorBitmap(
                                width = FINAL_TEMPLATE_WIDTH,
                                height = FINAL_TEMPLATE_HEIGHT,
                                color = color(R.color.background_sim_step_card_title)
                            ),
                            compressFormat = Bitmap.CompressFormat.PNG,
                            mimeType = "image/png",
                            fileExtension = "png",
                            quality = 100
                        ),
                        instagramStorySticker = RenderedShareBitmap(
                            bitmap = InstagramStoryShare.prepareStickerBitmap(
                                source = instagramStoryCardBitmap,
                                canvasSize = INSTAGRAM_CARD_STICKER_CANVAS_SIZE,
                                padding = INSTAGRAM_CARD_STICKER_PADDING
                            ),
                            compressFormat = Bitmap.CompressFormat.PNG,
                            mimeType = "image/png",
                            fileExtension = "png",
                            quality = 100
                        )
                    )
                } finally {
                    intermediates.forEach { it.recycle() }
                }
            }

            ShareTemplate.TRANSPARENCY -> {
                val intermediates = mutableListOf<Bitmap>()
                try {
                    val source = loadSourceBitmap(
                        imageUrl = request.imageUrl,
                        maxWidth = FINAL_TEMPLATE_WIDTH,
                        maxHeight = FINAL_TEMPLATE_HEIGHT
                    ).also { intermediates += it }
                    val transparentCardBitmap = renderCardStickerBitmap(
                        source = source,
                        width = (FINAL_TEMPLATE_WIDTH * CARD_COMPOSITION_WIDTH_FACTOR).toInt(),
                        height = (FINAL_TEMPLATE_HEIGHT * CARD_COMPOSITION_HEIGHT_FACTOR).toInt()
                    )
                    val instagramStoryCardBitmap = renderCardStickerBitmap(
                        source = source,
                        width = (FINAL_TEMPLATE_WIDTH * CARD_STORY_STICKER_WIDTH_FACTOR).toInt(),
                        height = (FINAL_TEMPLATE_HEIGHT * CARD_STORY_STICKER_HEIGHT_FACTOR).toInt()
                    ).also { intermediates += it }
                    RenderedSharePayload(
                        primaryImage = RenderedShareBitmap(
                            bitmap = transparentCardBitmap,
                            compressFormat = Bitmap.CompressFormat.PNG,
                            mimeType = "image/png",
                            fileExtension = "png",
                            quality = 100
                        ),
                        instagramStoryBackground = RenderedShareBitmap(
                            bitmap = createTransparentBitmap(
                                width = FINAL_TEMPLATE_WIDTH,
                                height = FINAL_TEMPLATE_HEIGHT
                            ),
                            compressFormat = Bitmap.CompressFormat.PNG,
                            mimeType = "image/png",
                            fileExtension = "png",
                            quality = 100
                        ),
                        instagramStorySticker = RenderedShareBitmap(
                            bitmap = InstagramStoryShare.prepareStickerBitmap(
                                source = instagramStoryCardBitmap,
                                canvasSize = INSTAGRAM_CARD_STICKER_CANVAS_SIZE,
                                padding = INSTAGRAM_CARD_STICKER_PADDING
                            ),
                            compressFormat = Bitmap.CompressFormat.PNG,
                            mimeType = "image/png",
                            fileExtension = "png",
                            quality = 100
                        )
                    )
                } finally {
                    intermediates.forEach { it.recycle() }
                }
            }
        }
    }

    private fun loadBoundedBitmap(
        imageUrl: String,
        maxLongEdge: Int
    ): Bitmap {
        val source = loadSourceBitmap(
            imageUrl = imageUrl,
            maxWidth = maxLongEdge,
            maxHeight = maxLongEdge
        )
        val bounded = scaleBitmapLongEdge(source, maxLongEdge)
        if (bounded !== source) source.recycle()
        return bounded
    }

    private fun renderRoundedWatermarkedPhoto(source: Bitmap): Bitmap {
        val output = createBitmap(source.width, source.height)
        val canvas = Canvas(output)
        val bounds = RectF(0f, 0f, source.width.toFloat(), source.height.toFloat())
        val radius = min(source.width, source.height) * PHOTO_CORNER_FACTOR
        drawBitmapCover(canvas, source, bounds, radius)
        drawWatermark(canvas, bounds)
        return output
    }

    private fun renderFullBleedWatermarkedPhoto(
        source: Bitmap,
        width: Int,
        height: Int
    ): Bitmap {
        val output = createBitmap(width, height)
        val canvas = Canvas(output)
        val bounds = RectF(0f, 0f, width.toFloat(), height.toFloat())
        drawBitmapCover(canvas, source, bounds, 0f)
        drawWatermark(canvas, bounds)
        return output
    }

    private fun renderCardComposition(
        cardBitmap: Bitmap,
        width: Int,
        height: Int
    ): Bitmap {
        return renderCardComposition(
            cardBitmap = cardBitmap,
            width = width,
            height = height,
            backgroundColor = color(R.color.background_sim_step_card_title)
        )
    }

    private fun renderCardComposition(
        cardBitmap: Bitmap,
        width: Int,
        height: Int,
        @ColorInt backgroundColor: Int
    ): Bitmap {
        val output = createBitmap(width, height)
        val canvas = Canvas(output)
        canvas.drawColor(backgroundColor)

        val left = (width - cardBitmap.width) / 2f
        val top = (height - cardBitmap.height) / 2f
        canvas.drawBitmap(cardBitmap, left, top, null)
        return output
    }

    private fun renderCheckerboardComposition(
        cardBitmap: Bitmap,
        width: Int,
        height: Int
    ): Bitmap {
        val output = createBitmap(width, height)
        val canvas = Canvas(output)
        drawCheckerboardBackground(canvas, width, height)

        val left = (width - cardBitmap.width) / 2f
        val top = (height - cardBitmap.height) / 2f
        canvas.drawBitmap(cardBitmap, left, top, null)
        return output
    }

    private fun renderCardStickerBitmap(
        source: Bitmap,
        width: Int,
        height: Int
    ): Bitmap {
        val output = createBitmap(width, height)
        val canvas = Canvas(output)

        val outerRect = RectF(
            width * 0.02f,
            height * 0.015f,
            width * 0.98f,
            height * 0.985f
        )
        val cardRadius = width * 0.085f

        val shadowRect = RectF(
            outerRect.left,
            outerRect.top + (height * 0.012f),
            outerRect.right,
            outerRect.bottom + (height * 0.012f)
        )
        canvas.drawRoundRect(
            shadowRect,
            cardRadius,
            cardRadius,
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = color(R.color.black_20)
            }
        )

        canvas.drawRoundRect(
            outerRect,
            cardRadius,
            cardRadius,
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = color(R.color.white)
            }
        )

        val photoRect = RectF(
            outerRect.left + width * 0.055f,
            outerRect.top + height * 0.045f,
            outerRect.right - width * 0.055f,
            outerRect.bottom - height * 0.16f
        )
        drawBitmapCover(canvas, source, photoRect, width * 0.06f)

        val labelRect = RectF(
            photoRect.left,
            photoRect.bottom + height * 0.032f,
            photoRect.right,
            outerRect.bottom - height * 0.03f
        )
        drawCenteredDrawable(
            canvas = canvas,
            drawableRes = R.drawable.ic_soymomo_logo,
            bounds = labelRect,
            alpha = 255
        )

        return output
    }

    private fun drawCenteredDrawable(
        canvas: Canvas,
        bounds: RectF,
        drawableRes: Int,
        alpha: Int
    ) {
        val drawable = ContextCompat.getDrawable(appContext, drawableRes)?.mutate() ?: return
        drawable.alpha = alpha

        val drawableWidth = drawable.intrinsicWidth.takeIf { it > 0 } ?: 1
        val drawableHeight = drawable.intrinsicHeight.takeIf { it > 0 } ?: 1
        val scale = min(bounds.width() / drawableWidth, bounds.height() / drawableHeight)
        val targetWidth = drawableWidth * scale
        val targetHeight = drawableHeight * scale
        val left = bounds.centerX() - (targetWidth / 2f)
        val top = bounds.centerY() - (targetHeight / 2f)

        drawable.setBounds(
            left.toInt(),
            top.toInt(),
            (left + targetWidth).toInt(),
            (top + targetHeight).toInt()
        )
        drawable.draw(canvas)
    }

    private fun drawWatermark(
        canvas: Canvas,
        imageBounds: RectF
    ) {
        val drawable = ContextCompat.getDrawable(appContext, R.drawable.ic_vector_logo_no_icon)
            ?.mutate() ?: return
        drawable.alpha = WATERMARK_ALPHA

        val drawableWidth = drawable.intrinsicWidth.takeIf { it > 0 } ?: 1
        val drawableHeight = drawable.intrinsicHeight.takeIf { it > 0 } ?: 1
        val aspectRatio = drawableHeight.toFloat() / drawableWidth.toFloat()

        val watermarkWidth = imageBounds.width() * WATERMARK_WIDTH_FACTOR
        val watermarkHeight = watermarkWidth * aspectRatio
        val insetX = imageBounds.width() * WATERMARK_INSET_FACTOR
        val insetY = imageBounds.height() * WATERMARK_INSET_FACTOR

        drawable.setBounds(
            (imageBounds.right - insetX - watermarkWidth).toInt(),
            (imageBounds.bottom - insetY - watermarkHeight).toInt(),
            (imageBounds.right - insetX).toInt(),
            (imageBounds.bottom - insetY).toInt()
        )
        drawable.draw(canvas)
    }

    private fun createSolidColorBitmap(
        width: Int,
        height: Int,
        @ColorInt color: Int
    ): Bitmap {
        val bitmap = createBitmap(width, height)
        val canvas = Canvas(bitmap)
        canvas.drawColor(color)
        return bitmap
    }

    private fun createTransparentBitmap(
        width: Int,
        height: Int
    ): Bitmap {
        return createBitmap(width, height)
    }

    private fun drawCheckerboardBackground(
        canvas: Canvas,
        width: Int,
        height: Int
    ) {
        val tileSize = max(width, height) / TRANSPARENCY_PREVIEW_TILE_COUNT.toFloat()
        val lightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = color(R.color.transparency_preview_checker_light)
        }
        val darkPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = color(R.color.transparency_preview_checker_dark)
        }

        var rowIndex = 0
        var top = 0f
        while (top < height) {
            var columnIndex = 0
            var left = 0f
            while (left < width) {
                val paint = if ((rowIndex + columnIndex) % 2 == 0) lightPaint else darkPaint
                canvas.drawRect(
                    left,
                    top,
                    min(left + tileSize, width.toFloat()),
                    min(top + tileSize, height.toFloat()),
                    paint
                )
                left += tileSize
                columnIndex += 1
            }
            top += tileSize
            rowIndex += 1
        }
    }

    private fun loadSourceBitmap(
        imageUrl: String,
        maxWidth: Int,
        maxHeight: Int
    ): Bitmap {
        val glide = Glide.with(appContext)
        val target: FutureTarget<Bitmap> = glide
            .asBitmap()
            .load(imageUrl)
            .submit(maxWidth, maxHeight)

        return try {
            copyOwnedBitmap(target.get())
        } catch (throwable: Throwable) {
            Timber.e(throwable, "ShareImageRenderer: failed to load bitmap from %s", imageUrl)
            throw IllegalStateException("Unable to load source image", throwable)
        } finally {
            glide.clear(target)
        }
    }

    private fun copyOwnedBitmap(bitmap: Bitmap): Bitmap {
        val currentConfig = bitmap.config
        val isHardwareConfig = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            currentConfig == Bitmap.Config.HARDWARE
        val safeConfig = if (currentConfig == null || isHardwareConfig) {
            Bitmap.Config.ARGB_8888
        } else {
            currentConfig
        }
        return bitmap.copy(safeConfig, false)
    }

    private fun scaleBitmapLongEdge(bitmap: Bitmap, maxLongEdge: Int): Bitmap {
        val longEdge = max(bitmap.width, bitmap.height)
        if (longEdge <= maxLongEdge) return bitmap

        val scale = maxLongEdge.toFloat() / longEdge.toFloat()
        val targetWidth = (bitmap.width * scale).toInt().coerceAtLeast(1)
        val targetHeight = (bitmap.height * scale).toInt().coerceAtLeast(1)
        return bitmap.scale(targetWidth, targetHeight)
    }

    private fun drawBitmapCover(
        canvas: Canvas,
        bitmap: Bitmap,
        destination: RectF,
        cornerRadius: Float
    ) {
        val shader = BitmapShader(bitmap, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP)
        val matrix = Matrix()
        val scale = max(destination.width() / bitmap.width, destination.height() / bitmap.height)
        val dx = destination.left + (destination.width() - bitmap.width * scale) / 2f
        val dy = destination.top + (destination.height() - bitmap.height * scale) / 2f
        matrix.setScale(scale, scale)
        matrix.postTranslate(dx, dy)
        shader.setLocalMatrix(matrix)

        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.shader = shader
        }
        canvas.drawRoundRect(destination, cornerRadius, cornerRadius, paint)
    }

    @ColorInt
    private fun color(colorRes: Int): Int = ContextCompat.getColor(appContext, colorRes)
}
