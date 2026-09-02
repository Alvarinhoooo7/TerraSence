package com.sosmartlabs.momo.chat.presentation.share

import android.graphics.Bitmap
import android.net.Uri
import android.os.Parcelable
import kotlinx.parcelize.Parcelize
import java.io.File

@Parcelize
data class ChatPhotoShareRequest(
    val messageId: String,
    val imageUrl: String,
    val createdAt: Long
) : Parcelable

enum class ShareTemplate {
    ORIGINAL,
    PHOTO_CARD,
    TRANSPARENCY;

    fun analyticsValue(): String = name.lowercase()

    companion object {
        val all: List<ShareTemplate> = entries.toList()
    }
}

enum class ShareTarget {
    GENERIC,
    INSTAGRAM_STORIES,
    SAVE_TO_DEVICE;

    fun analyticsValue(): String = name.lowercase()
}

sealed class SharePreviewState {
    data object Loading : SharePreviewState()

    data object Failed : SharePreviewState()

    data class Ready(val bitmap: Bitmap) : SharePreviewState()
}

data class RenderedShareBitmap(
    val bitmap: Bitmap,
    val compressFormat: Bitmap.CompressFormat,
    val mimeType: String,
    val fileExtension: String,
    val quality: Int
)

data class RenderedSharePayload(
    val primaryImage: RenderedShareBitmap,
    val instagramStoryBackground: RenderedShareBitmap? = null,
    val instagramStorySticker: RenderedShareBitmap? = null
) {
    fun recycle() {
        primaryImage.bitmap.recycle()
        instagramStoryBackground?.bitmap?.recycle()
        instagramStorySticker?.bitmap?.recycle()
    }
}

data class ExportedShareImage(
    val file: File,
    val contentUri: Uri,
    val mimeType: String
)

data class ExportedSharePayload(
    val template: ShareTemplate,
    val primaryImage: ExportedShareImage,
    val instagramStoryBackground: ExportedShareImage? = null,
    val instagramStorySticker: ExportedShareImage? = null
)
