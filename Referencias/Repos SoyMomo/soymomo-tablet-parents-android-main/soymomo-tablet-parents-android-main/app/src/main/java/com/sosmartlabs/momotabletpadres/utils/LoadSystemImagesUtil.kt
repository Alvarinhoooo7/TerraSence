package com.sosmartlabs.momotabletpadres.utils

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.app.ActivityCompat
import androidx.core.content.FileProvider
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import java.io.File
import java.io.IOException
import javax.inject.Inject

/**
 * Util class for helping on loading images from device Camera and gallery
 * @param context Activity context
 */
class LoadSystemImagesUtil @Inject constructor(@ApplicationContext private val context: Context) {

    /**
     * Current photo file reference.
     * It is used for retrieving the picture taken by the device camera.
     */
    private var currentPhotoFile: File? = null

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
    private fun createImageFile(): File {
        val imageFileName = System.currentTimeMillis().toString()
        val storageDir = context.cacheDir
        return File.createTempFile(
            imageFileName,
            ".png",
            storageDir
        )
    }

    /**
     * Creates a [File] for loading a new picture from device camera
     * @return [Uri] for created file
     */
    fun createNewPictureFile(): Uri? {
        tryDeleteCurrentPhotoFile()

        runCatching {
            Timber.d("LoadSystemImages")
            currentPhotoFile = createImageFile()
            FileProvider.getUriForFile(context,
                FileProviderHelper.getFileProviderAuthority(context.applicationContext), currentPhotoFile!!)
        }.onSuccess {
            Timber.d("LoadSystemImages: Picture file created successfully $it")
            return it
        }.onFailure {
            Timber.d("LoadSystemImages: Error creating picture file $it")
            CrashlyticsLog.recordNonFatalError(it, "Error creating picture file")
            return null
        }
        return null
    }

    /**
     * Tries to delete the temporal [currentPhotoFile], and handles the errors produced if any.
     */
    private fun tryDeleteCurrentPhotoFile() {
        runCatching {
            if (currentPhotoFile != null) currentPhotoFile!!.delete()
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it, "Error on deleting current photo file")
        }
    }

    /**
     * Cleans the resources used by this class
     */
    fun clean() {
        tryDeleteCurrentPhotoFile()
    }
}