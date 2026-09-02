package com.sosmartlabs.momo.chat.presentation.share

import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import com.sosmartlabs.momo.utils.FileProviderHelper
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ShareFileManager @Inject constructor(
    @param:ApplicationContext private val appContext: Context
) {

    companion object {
        private const val CACHE_DIR_NAME = "chat-photo-share"
        private const val STALE_FILE_AGE_MS = 24 * 60 * 60 * 1000L
        private const val GALLERY_SUBDIR = "SoyMomo"
    }

    fun cleanupStaleCacheFiles() {
        val now = System.currentTimeMillis()
        cacheDirectory().listFiles().orEmpty().forEach { file ->
            if (now - file.lastModified() > STALE_FILE_AGE_MS) {
                file.delete()
            }
        }
    }

    fun exportRenderedImage(
        request: ChatPhotoShareRequest,
        template: ShareTemplate,
        renderedBitmap: RenderedSharePayload
    ): ExportedSharePayload {
        val safeMessageId = sanitizeSegment(request.messageId)
        val exportToken = "${System.currentTimeMillis()}_${System.nanoTime()}"

        return ExportedSharePayload(
            template = template,
            primaryImage = exportAsset(
                safeMessageId = safeMessageId,
                template = template,
                exportToken = exportToken,
                suffix = "primary",
                renderedBitmap = renderedBitmap.primaryImage
            ),
            instagramStoryBackground = renderedBitmap.instagramStoryBackground?.let { storyBackground ->
                exportAsset(
                    safeMessageId = safeMessageId,
                    template = template,
                    exportToken = exportToken,
                    suffix = "story_background",
                    renderedBitmap = storyBackground
                )
            },
            instagramStorySticker = renderedBitmap.instagramStorySticker?.let { storySticker ->
                exportAsset(
                    safeMessageId = safeMessageId,
                    template = template,
                    exportToken = exportToken,
                    suffix = "story_sticker",
                    renderedBitmap = storySticker
                )
            }
        )
    }

    fun saveToGallery(exportedImage: ExportedShareImage): Uri {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            saveToGalleryScopedStorage(exportedImage)
        } else {
            saveToGalleryLegacy(exportedImage)
        }
    }

    private fun saveToGalleryScopedStorage(exportedImage: ExportedShareImage): Uri {
        val resolver = appContext.contentResolver
        val displayName = exportedImage.file.name
        val contentValues = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, displayName)
            put(MediaStore.Images.Media.MIME_TYPE, exportedImage.mimeType)
            put(
                MediaStore.Images.Media.RELATIVE_PATH,
                "${Environment.DIRECTORY_PICTURES}/$GALLERY_SUBDIR"
            )
            put(MediaStore.Images.Media.IS_PENDING, 1)
        }

        val collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        val uri = resolver.insert(collection, contentValues)
            ?: throw IllegalStateException("Unable to create MediaStore record")

        try {
            resolver.openOutputStream(uri)?.use { outputStream ->
                exportedImage.file.inputStream().use { inputStream ->
                    inputStream.copyTo(outputStream)
                }
            } ?: throw IllegalStateException("Unable to open gallery output stream")

            contentValues.clear()
            contentValues.put(MediaStore.Images.Media.IS_PENDING, 0)
            resolver.update(uri, contentValues, null, null)
            return uri
        } catch (throwable: Throwable) {
            resolver.delete(uri, null, null)
            throw throwable
        }
    }

    @Suppress("DEPRECATION")
    private fun saveToGalleryLegacy(exportedImage: ExportedShareImage): Uri {
        val picturesDirectory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
        val targetDirectory = File(picturesDirectory, GALLERY_SUBDIR).apply {
            if (!exists()) mkdirs()
        }
        if (!targetDirectory.exists()) {
            throw IllegalStateException("Unable to create gallery directory")
        }

        val targetFile = File(targetDirectory, exportedImage.file.name)
        exportedImage.file.inputStream().use { input ->
            targetFile.outputStream().use { output ->
                input.copyTo(output)
            }
        }

        MediaScannerConnection.scanFile(
            appContext,
            arrayOf(targetFile.absolutePath),
            arrayOf(exportedImage.mimeType),
            null
        )
        return Uri.fromFile(targetFile)
    }

    private fun cacheDirectory(): File {
        return File(appContext.cacheDir, CACHE_DIR_NAME).apply {
            if (!exists()) mkdirs()
        }
    }

    private fun exportAsset(
        safeMessageId: String,
        template: ShareTemplate,
        exportToken: String,
        suffix: String,
        renderedBitmap: RenderedShareBitmap
    ): ExportedShareImage {
        val file = File(
            cacheDirectory(),
            "chat-photo-share_${safeMessageId}_${template.analyticsValue()}_${suffix}_$exportToken.${renderedBitmap.fileExtension}"
        )

        FileOutputStream(file).use { output ->
            val compressed = renderedBitmap.bitmap.compress(
                renderedBitmap.compressFormat,
                renderedBitmap.quality,
                output
            )
            if (!compressed) {
                throw IllegalStateException("Unable to compress rendered image")
            }
        }

        val contentUri = FileProvider.getUriForFile(
            appContext,
            FileProviderHelper.getFileProviderAuthority(appContext),
            file
        )

        return ExportedShareImage(
            file = file,
            contentUri = contentUri,
            mimeType = renderedBitmap.mimeType
        )
    }

    private fun sanitizeSegment(value: String): String {
        return value.replace(Regex("[^A-Za-z0-9._-]"), "_")
    }
}
