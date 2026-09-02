package com.sosmartlabs.momo.takepicture

import android.Manifest
import android.net.Uri
import android.os.Bundle
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.cropimage.CropImageActivity
import com.sosmartlabs.momo.utils.LoadSystemImagesUtil
import timber.log.Timber
import javax.inject.Inject

/**
 * Class intended for been used as a base implementation for activities that requires obtaining
 * images from device camera and/or gallery.
 *
 * If you require device camera images, you will need the [Manifest.permission.CAMERA] permission.
 * For requesting this permission, you can use the [requestPermissions] launcher for it (and add any
 * other permission you need). The request permission response will be available calling the
 * [onRequestPermissionsResult] function, that should be override for handling the request result.
 * Also, you can use the [hasCameraPermission] property for checking whether the permission is
 * granted to the app or not.
 */
abstract class TakePictureActivity: AppCompatActivity(), TakePictureCallbacks {

    private companion object {
        const val STATE_CURRENT_PHOTO_URI = "take_picture_activity.current_photo_uri"
        const val STATE_CURRENT_PHOTO_PATH = "take_picture_activity.current_photo_path"
    }

    /**
     * Helper class for loading images from system
     */
    @Inject
    lateinit var systemImagesUtil: LoadSystemImagesUtil

    /**
     * Object Id used for generating temporal image files that will be deleted once they were used.
     */
    protected abstract val objectId: String?

    /**
     * Current photo Uri reference.
     * It is used for retrieving the picture taken by the device camera.
     */
    private var currentPhotoUri: Uri? = null

    /**
     * Launcher for requesting permissions to the system.
     * Can be used for requesting the [Manifest.permission.CAMERA] permission, needed for taking
     * photos with the device camera, and/or any other permission needed.
     * Example:
     * requestPermissions.launch(arrayOf(Manifest.permission.CAMERA, ...))
     *
     * The permissions request result will be available on the [onRequestPermissionsResult] function,
     * that should be override for handling it.
     */
    protected val requestPermissions =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            Timber.d("Permission request result: $result")
            onRequestPermissionsResult(result)
        }

    /**
     * Handles the result for the permissions request made through the [requestPermissions] launcher.
     *
     * The default implementation is no-op, so it should be override for handling the results if
     * required.
     */
    protected open fun onRequestPermissionsResult(result: Map<String, Boolean>) {
        Timber.d("Default permission result handler called with result: $result")
        // Does nothing by default
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        restorePendingPhotoState(savedInstanceState)
    }

    /**
     * Launcher for taking a picture with the device camera
     */
    private val takePicture =
        registerForActivityResult(ActivityResultContracts.TakePicture()) { success ->
            Timber.d("Take picture result: success=$success")
            if (!success) {
                Timber.d("Picture capture cancelled")
                cleanupPendingPhoto()
                return@registerForActivityResult
            }

            val pendingObjectId = objectId
            val photoUri = currentPhotoUri
            if (pendingObjectId == null || photoUri == null) {
                val error = IllegalStateException(
                    "Camera returned success but pending photo state was incomplete"
                )
                Timber.e(error, "TakePictureActivity lost pending photo state before result delivery")
                with(Firebase.crashlytics) {
                    log("TakePictureActivity: Missing pending photo state after camera result")
                    recordException(error)
                }
                cleanupPendingPhoto()
                onTakingPictureError(error)
                return@registerForActivityResult
            }

            Timber.d("Launching crop image activity")
            cropImage.launch(CropImageActivity.ActivityParams(photoUri, pendingObjectId))
        }

    /**
     * Launcher for selecting a picture from the device gallery
     */
    private val selectPicture =
        registerForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
            Timber.d("Picture selected from gallery")
            if (uri != null && objectId != null) {
                Timber.d("Launching crop image activity")
                cropImage.launch(CropImageActivity.ActivityParams(uri, objectId))
            }
        }

    /**
     * Launcher for cropping a picture with [CropImageActivity]
     */
    private val cropImage = registerForActivityResult(CropImageActivity.ResultContract()) { path ->
        Timber.d("Image cropped")
        cleanupPendingPhoto()
        onImageLoaded(path)
    }

    override val hasCameraPermission: Boolean
        get() = systemImagesUtil.hasCameraPermissions().also {
            Timber.d("Checking camera permission: $it")
        }

    /**
     * Launches the device camera for taking a picture.
     * If the request is successful, the function [onImageLoaded] will be called with the obtained
     * image path. If the request fails with an exception, the function [onTakingPictureError] will be called.
     */
    override fun launchTakePicture() {
        Timber.d("Launching camera to take picture")
        val pendingObjectId = objectId
        if (pendingObjectId == null) {
            val error = IllegalStateException("Cannot launch camera without an objectId")
            Timber.e(error, "Failed to launch camera")
            with(Firebase.crashlytics) {
                log("TakePictureActivity: Missing objectId when launching camera")
                recordException(error)
            }
            onTakingPictureError(error)
            return
        }

        runCatching {
            val photoUri = checkNotNull(systemImagesUtil.createNewPictureFile(pendingObjectId)) {
                "Unable to create temporary picture file"
            }
            currentPhotoUri = photoUri
            Timber.d("Created new picture file URI")
            takePicture.launch(photoUri)
        }.onFailure { error ->
            Timber.e(error, "Failed to launch camera")
            with(Firebase.crashlytics) {
                log("Error launching take picture")
                recordException(error)
            }
            cleanupPendingPhoto()
            onTakingPictureError(error)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString(STATE_CURRENT_PHOTO_URI, currentPhotoUri?.toString())
        outState.putString(STATE_CURRENT_PHOTO_PATH, systemImagesUtil.currentPhotoPath)
        super.onSaveInstanceState(outState)
    }

    /**
     * Handles the error when the [launchTakePicture] function fails on obtaining an image from
     * device camera.
     *
     * The default implementation is no-op, so it should be override if required. Also, consider
     * that when this function is called, the error was already registered on Crashlytics as non-fatal.
     */
    override fun onTakingPictureError(e: Throwable) {
        Timber.e(e, "Error taking picture")
        // Does nothing by default. Implement if you require to taking pictures with the camera
    }

    override fun launchSelectPictureFromGallery() {
        Timber.d("Launching gallery picker")
        selectPicture.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
    }

    override fun onDestroy() {
        if (isChangingConfigurations && currentPhotoUri != null) {
            Timber.d("Retaining pending TakePictureActivity photo across configuration change")
        } else {
            Timber.d("Cleaning up TakePictureActivity resources")
            cleanupPendingPhoto()
        }
        super.onDestroy()
    }

    private fun restorePendingPhotoState(savedInstanceState: Bundle?) {
        currentPhotoUri = savedInstanceState?.getString(STATE_CURRENT_PHOTO_URI)?.let(Uri::parse)
        systemImagesUtil.restoreCurrentPhotoFile(savedInstanceState?.getString(STATE_CURRENT_PHOTO_PATH))
        if (currentPhotoUri != null) {
            Timber.d("Restored pending photo URI")
        }
    }

    private fun cleanupPendingPhoto() {
        systemImagesUtil.clean()
        currentPhotoUri = null
    }
}
