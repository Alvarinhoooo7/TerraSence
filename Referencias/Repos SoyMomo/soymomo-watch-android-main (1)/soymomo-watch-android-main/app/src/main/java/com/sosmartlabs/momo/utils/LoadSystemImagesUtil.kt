package com.sosmartlabs.momo.utils

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.app.ActivityCompat
import androidx.core.content.FileProvider
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ActivityContext
import java.io.File
import java.io.IOException
import javax.inject.Inject

/**
 * Util class for helping on loading images from device Camera and gallery
 * @param context Activity context
 */
class LoadSystemImagesUtil @Inject constructor(@ActivityContext private val context: Context) {

    /**
     * Current photo file reference.
     * It is used for retrieving the picture taken by the device camera.
     */
    private var currentPhotoFile: File? = null

    /**
     * Absolute path for the current pending photo file, if any.
     */
    val currentPhotoPath: String?
        get() = currentPhotoFile?.absolutePath

    /**
     * Checks if the app has the [Manifest.permission.CAMERA] permission granted
     * @return True if the [Manifest.permission.CAMERA] permission is granted to the app, false otherwise
     */
    fun hasCameraPermissions(): Boolean {
        return ActivityCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Creates a temporal [File] for been used on loading a picture from device camera
     * @return Temporal [File] for load device camera image.
     */
    @Throws(IOException::class)
    private fun createImageFile(objectId: String): File {
        val imageFileName = objectId + System.currentTimeMillis()
        val storageDir = context.cacheDir
        return File.createTempFile(
            imageFileName,
            ".png",
            storageDir
        )
    }

    /**
     * Creates a [File] for loading a new picture from device camera
     * @param objectId Id for been used in file creation
     * @return [Uri] for created file
     */
    fun createNewPictureFile(objectId: String): Uri? {
        tryDeleteCurrentPhotoFile()

        runCatching {
            currentPhotoFile = createImageFile(objectId)
            FileProvider.getUriForFile(context,
                FileProviderHelper.getFileProviderAuthority(context.applicationContext), currentPhotoFile!!)
        }.onSuccess {
            return it
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it, "Error creating picture file")
            return null
        }
        return null
    }

    /**
     * Restores the pending photo file reference after an Activity/Fragment recreation.
     */
    fun restoreCurrentPhotoFile(path: String?) {
        currentPhotoFile = path?.let(::File)?.takeIf { it.exists() }
    }

    /**
     * Tries to delete the temporal [currentPhotoFile], and handles the errors produced if any.
     */
    private fun tryDeleteCurrentPhotoFile() {
        val photoFile = currentPhotoFile ?: return
        runCatching {
            photoFile.delete()
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it, "Error on deleting current photo file")
        }
        currentPhotoFile = null
    }

    /**
     * Cleans the resources used by this class
     */
    fun clean() {
        tryDeleteCurrentPhotoFile()
    }
}
