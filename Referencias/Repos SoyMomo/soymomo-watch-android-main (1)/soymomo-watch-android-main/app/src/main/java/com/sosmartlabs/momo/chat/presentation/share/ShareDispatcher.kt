package com.sosmartlabs.momo.chat.presentation.share

import android.app.Activity
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.annotation.StringRes
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.utils.InstagramStoryShare
import javax.inject.Inject
import javax.inject.Singleton

data class ShareDispatchResult(
    val success: Boolean,
    val errorType: String? = null,
    @param:StringRes @field:StringRes val messageResId: Int? = null
)

@Singleton
class ShareDispatcher @Inject constructor() {

    companion object {
        private const val INSTAGRAM_PACKAGE = "com.instagram.android"
        const val ERROR_GENERIC_SHARE = "generic_share_failed"
        const val ERROR_INSTAGRAM_UNAVAILABLE = "instagram_unavailable"
        const val ERROR_INSTAGRAM_SHARE = "instagram_share_failed"
    }

    fun canShareToInstagramStories(context: Context): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(
                    INSTAGRAM_PACKAGE,
                    PackageManager.PackageInfoFlags.of(0)
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(INSTAGRAM_PACKAGE, 0)
            }
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        }
    }

    fun shareGeneric(
        context: Context,
        exportedImage: ExportedSharePayload,
        chooserTitle: String
    ): ShareDispatchResult {
        return try {
            val primaryImage = exportedImage.primaryImage
            val sendIntent = Intent(Intent.ACTION_SEND).apply {
                type = primaryImage.mimeType
                putExtra(Intent.EXTRA_STREAM, primaryImage.contentUri)
                clipData = ClipData.newUri(
                    context.contentResolver,
                    "shared_chat_photo",
                    primaryImage.contentUri
                )
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            grantUriPermissionToResolvedActivities(context, primaryImage.contentUri, sendIntent)

            val chooser = Intent.createChooser(sendIntent, chooserTitle).apply {
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                if (context !is Activity) {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            context.startActivity(chooser)
            ShareDispatchResult(success = true)
        } catch (_: Exception) {
            ShareDispatchResult(
                success = false,
                errorType = ERROR_GENERIC_SHARE,
                messageResId = R.string.chat_photo_share_error_generic
            )
        }
    }

    fun shareInstagramStories(
        context: Context,
        exportedImage: ExportedSharePayload,
        facebookAppId: String
    ): ShareDispatchResult {
        if (!canShareToInstagramStories(context)) {
            return ShareDispatchResult(
                success = false,
                errorType = ERROR_INSTAGRAM_UNAVAILABLE,
                messageResId = R.string.chat_photo_share_error_instagram_unavailable
            )
        }

        val backgroundImage = exportedImage.instagramStoryBackground ?: exportedImage.primaryImage
        val launched = InstagramStoryShare.shareBackgroundUri(
            context = context,
            backgroundUri = backgroundImage.contentUri,
            backgroundMimeType = backgroundImage.mimeType,
            metadata = InstagramStoryShare.Metadata(
                facebookAppId = facebookAppId
            ),
            stickerUri = exportedImage.instagramStorySticker?.contentUri
        )
        return if (launched) {
            ShareDispatchResult(success = true)
        } else {
            ShareDispatchResult(
                success = false,
                errorType = ERROR_INSTAGRAM_SHARE,
                messageResId = R.string.chat_photo_share_error_instagram_unavailable
            )
        }
    }

    private fun grantUriPermissionToResolvedActivities(
        context: Context,
        uri: android.net.Uri,
        intent: Intent
    ) {
        val resolvedActivities = context.packageManager.queryIntentActivities(
            intent,
            PackageManager.MATCH_DEFAULT_ONLY
        )
        resolvedActivities.forEach { resolveInfo ->
            context.grantUriPermission(
                resolveInfo.activityInfo.packageName,
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION
            )
        }
    }
}
