package com.sosmartlabs.momo.utils

import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.Shader
import android.graphics.drawable.Drawable
import android.net.Uri
import androidx.annotation.ColorInt
import androidx.annotation.DrawableRes
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import timber.log.Timber
import java.io.File
import java.io.FileOutputStream
import androidx.core.graphics.scale
import androidx.core.graphics.createBitmap

object InstagramStoryShare {

    private const val TAG = "InstagramStorySharer:"
    private const val INSTAGRAM_PACKAGE = "com.instagram.android"
    private const val INSTAGRAM_ACTION = "com.instagram.share.ADD_TO_STORY"

    data class Metadata(
        val facebookAppId: String,
        val contentUrl: String? = null,
        val attributionLinkUrl: String? = null,
        val linkText: String? = null,
        val topBackgroundColor: String? = null,
        val bottomBackgroundColor: String? = null
    )

    fun shareWithSolidColorBackground(
        context: Context,
        @ColorInt backgroundColor: Int,
        metadata: Metadata,
        stickerBitmap: Bitmap? = null,
        backgroundWidth: Int = 720,
        backgroundHeight: Int = 1280
    ) {
        val backgroundBitmap = createSolidBitmap(
            width = backgroundWidth,
            height = backgroundHeight,
            color = backgroundColor
        )

        share(
            context = context,
            backgroundBitmap = backgroundBitmap,
            stickerBitmap = stickerBitmap,
            metadata = metadata.copy(
                topBackgroundColor = metadata.topBackgroundColor ?: colorIntToHex(backgroundColor),
                bottomBackgroundColor = metadata.bottomBackgroundColor ?: colorIntToHex(backgroundColor)
            )
        )
    }

    fun shareWithGradientBackground(
        context: Context,
        @ColorInt topColor: Int,
        @ColorInt bottomColor: Int,
        metadata: Metadata,
        stickerBitmap: Bitmap? = null,
        backgroundWidth: Int = 720,
        backgroundHeight: Int = 1280
    ) {
        val backgroundBitmap = createLinearGradientBitmap(
            width = backgroundWidth,
            height = backgroundHeight,
            topColor = topColor,
            bottomColor = bottomColor
        )

        share(
            context = context,
            backgroundBitmap = backgroundBitmap,
            stickerBitmap = stickerBitmap,
            metadata = metadata.copy(
                topBackgroundColor = metadata.topBackgroundColor ?: colorIntToHex(topColor),
                bottomBackgroundColor = metadata.bottomBackgroundColor ?: colorIntToHex(bottomColor)
            )
        )
    }

    fun shareWithImageBackground(
        context: Context,
        backgroundBitmap: Bitmap,
        metadata: Metadata,
        stickerBitmap: Bitmap? = null
    ) {
        share(
            context = context,
            backgroundBitmap = backgroundBitmap,
            stickerBitmap = stickerBitmap,
            metadata = metadata
        )
    }

    fun shareWithSolidColorBackgroundAndDrawableSticker(
        context: Context,
        @ColorInt backgroundColor: Int,
        @DrawableRes stickerDrawableRes: Int,
        metadata: Metadata,
        backgroundWidth: Int = 720,
        backgroundHeight: Int = 1280
    ) {
        shareWithSolidColorBackground(
            context = context,
            backgroundColor = backgroundColor,
            metadata = metadata,
            stickerBitmap = drawableResToBitmap(context, stickerDrawableRes),
            backgroundWidth = backgroundWidth,
            backgroundHeight = backgroundHeight
        )
    }

    fun shareWithGradientBackgroundAndDrawableSticker(
        context: Context,
        @ColorInt topColor: Int,
        @ColorInt bottomColor: Int,
        @DrawableRes stickerDrawableRes: Int,
        metadata: Metadata,
        backgroundWidth: Int = 720,
        backgroundHeight: Int = 1280
    ) {
        shareWithGradientBackground(
            context = context,
            topColor = topColor,
            bottomColor = bottomColor,
            metadata = metadata,
            stickerBitmap = drawableResToBitmap(context, stickerDrawableRes),
            backgroundWidth = backgroundWidth,
            backgroundHeight = backgroundHeight
        )
    }

    fun shareWithImageBackgroundAndDrawableSticker(
        context: Context,
        backgroundBitmap: Bitmap,
        @DrawableRes stickerDrawableRes: Int,
        metadata: Metadata
    ) {
        shareWithImageBackground(
            context = context,
            backgroundBitmap = backgroundBitmap,
            metadata = metadata,
            stickerBitmap = drawableResToBitmap(context, stickerDrawableRes)
        )
    }

    fun share(
        context: Context,
        backgroundBitmap: Bitmap,
        stickerBitmap: Bitmap? = null,
        metadata: Metadata
    ): Boolean {
        try {
            Timber.d("$TAG share() called")
            Timber.d("$TAG contentUrl=${metadata.contentUrl}")
            Timber.d("$TAG attributionLinkUrl=${metadata.attributionLinkUrl}")
            Timber.d("$TAG linkText=${metadata.linkText}")
            Timber.d("$TAG topBackgroundColor=${metadata.topBackgroundColor}")
            Timber.d("$TAG bottomBackgroundColor=${metadata.bottomBackgroundColor}")

            val backgroundUri = exportBitmapToCache(
                context = context,
                bitmap = backgroundBitmap,
                fileName = "ig_background.png"
            )

            val stickerUri = stickerBitmap?.let {
                exportBitmapToCache(
                    context = context,
                    bitmap = prepareStickerBitmap(it),
                    fileName = "ig_sticker.png"
                )
            }

            Timber.d("$TAG backgroundUri=$backgroundUri")
            Timber.d("$TAG stickerUri=$stickerUri")

            launchStoryShare(
                context = context,
                backgroundUri = backgroundUri,
                backgroundMimeType = "image/png",
                metadata = metadata,
                stickerUri = stickerUri
            )
            return true
        } catch (e: ActivityNotFoundException) {
            Timber.e(e, "$TAG Instagram is not installed")
        } catch (t: Throwable) {
            Timber.e(t, "$TAG failed to share story")
        }
        return false
    }

    fun shareBackgroundUri(
        context: Context,
        backgroundUri: Uri,
        backgroundMimeType: String,
        metadata: Metadata,
        stickerUri: Uri? = null
    ): Boolean {
        return try {
            launchStoryShare(
                context = context,
                backgroundUri = backgroundUri,
                backgroundMimeType = backgroundMimeType,
                metadata = metadata,
                stickerUri = stickerUri
            )
            true
        } catch (e: ActivityNotFoundException) {
            Timber.e(e, "$TAG Instagram is not installed")
            false
        } catch (t: Throwable) {
            Timber.e(t, "$TAG failed to share story from URI")
            false
        }
    }

    fun createSolidBitmap(
        width: Int,
        height: Int,
        @ColorInt color: Int
    ): Bitmap {
        val bitmap = createBitmap(width, height)
        val canvas = Canvas(bitmap)
        canvas.drawColor(color)
        return bitmap
    }

    fun createLinearGradientBitmap(
        width: Int,
        height: Int,
        @ColorInt topColor: Int,
        @ColorInt bottomColor: Int
    ): Bitmap {
        val bitmap = createBitmap(width, height)
        val canvas = Canvas(bitmap)

        val shader = LinearGradient(
            0f,
            0f,
            0f,
            height.toFloat(),
            topColor,
            bottomColor,
            Shader.TileMode.CLAMP
        )

        val paint = Paint().apply {
            isAntiAlias = true
            this.shader = shader
        }

        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        return bitmap
    }

    fun drawableResToBitmap(
        context: Context,
        @DrawableRes drawableRes: Int
    ): Bitmap {
        val drawable = requireNotNull(ContextCompat.getDrawable(context, drawableRes)) {
            "$TAG Drawable not found: $drawableRes"
        }
        return drawableToBitmap(drawable)
    }

    fun drawableToBitmap(drawable: Drawable): Bitmap {
        val width = drawable.intrinsicWidth.takeIf { it > 0 } ?: 512
        val height = drawable.intrinsicHeight.takeIf { it > 0 } ?: 512

        val bitmap = createBitmap(width, height)
        val canvas = Canvas(bitmap)

        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)

        return bitmap
    }

    fun prepareStickerBitmap(
        source: Bitmap,
        canvasSize: Int = 512,
        padding: Int = 96
    ): Bitmap {
        val output = createBitmap(canvasSize, canvasSize)

        val canvas = Canvas(output)
        canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)

        val availableSize = (canvasSize - (padding * 2)).coerceAtLeast(1)

        val scale = minOf(
            availableSize.toFloat() / source.width.toFloat(),
            availableSize.toFloat() / source.height.toFloat()
        )

        val scaledWidth = (source.width * scale).toInt().coerceAtLeast(1)
        val scaledHeight = (source.height * scale).toInt().coerceAtLeast(1)

        val scaled = source.scale(scaledWidth, scaledHeight)
        try {
            val left = (canvasSize - scaled.width) / 2f
            val top = (canvasSize - scaled.height) / 2f

            canvas.drawBitmap(scaled, left, top, null)
        } finally {
            if (scaled !== source) scaled.recycle()
        }

        return output
    }

    fun exportBitmapToCache(
        context: Context,
        bitmap: Bitmap,
        fileName: String
    ): Uri {
        val file = File(context.cacheDir, fileName)

        FileOutputStream(file).use { out ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        }

        Timber.d("$TAG exported file=${file.absolutePath}, size=${file.length()}")

        return FileProvider.getUriForFile(
            context,
            FileProviderHelper.getFileProviderAuthority(context),
            file
        )
    }

    private fun grantReadPermission(context: Context, uri: Uri) {
        context.grantUriPermission(
            INSTAGRAM_PACKAGE,
            uri,
            Intent.FLAG_GRANT_READ_URI_PERMISSION
        )
        Timber.d("$TAG granted URI permission for $uri")
    }

    private fun launchStoryShare(
        context: Context,
        backgroundUri: Uri,
        backgroundMimeType: String,
        metadata: Metadata,
        stickerUri: Uri? = null
    ) {
        val intent = Intent(INSTAGRAM_ACTION).apply {
            setPackage(INSTAGRAM_PACKAGE)
            setDataAndType(backgroundUri, backgroundMimeType)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            if (context !is android.app.Activity) {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            putExtra("source_application", metadata.facebookAppId)

            stickerUri?.let {
                putExtra("interactive_asset_uri", it)
            }

            metadata.topBackgroundColor?.let {
                putExtra("top_background_color", it)
            }

            metadata.bottomBackgroundColor?.let {
                putExtra("bottom_background_color", it)
            }

            metadata.contentUrl?.let {
                putExtra("content_url", it)
            }

            metadata.attributionLinkUrl?.let {
                putExtra("attribution_link_url", it)
            }

            metadata.linkText?.let {
                putExtra("link_text", it)
            }

            clipData = ClipData.newUri(
                context.contentResolver,
                "instagram_story_background",
                backgroundUri
            ).apply {
                stickerUri?.let { addItem(ClipData.Item(it)) }
            }
        }

        grantReadPermission(context, backgroundUri)
        stickerUri?.let { grantReadPermission(context, it) }

        if (intent.resolveActivity(context.packageManager) == null) {
            throw ActivityNotFoundException("Instagram Stories activity not found")
        }

        Timber.d("$TAG launching Instagram story intent for $backgroundUri")
        context.startActivity(intent)
    }

    private fun colorIntToHex(@ColorInt color: Int): String {
        return String.format("#%06X", 0xFFFFFF and color)
    }
}
