package com.sosmartlabs.momo.takepicture

import android.Manifest
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.cropimage.CropImageActivity
import com.sosmartlabs.momo.utils.LoadSystemImagesUtil
import timber.log.Timber
import javax.inject.Inject

/**
 * Class intended for been used as a base implementation for fragments that requires obtaining
 * images from device camera and/or gallery.
 *
 * If you require device camera images, you will need the [Manifest.permission.CAMERA] permission.
 * For requesting this permission, you can use the [requestCameraPermissionLauncher] launcher for it.
 * The request permission response will call the [launchTakePicture] function if successful.
 * Also, you can use the [hasCameraPermission] property for checking whether the permission is
 * granted to the app or not.
 */
abstract class TakePictureFragment: Fragment(), TakePictureCallbacks {

    private companion object {
        const val STATE_CURRENT_PHOTO_URI = "take_picture_fragment.current_photo_uri"
        const val STATE_CURRENT_PHOTO_PATH = "take_picture_fragment.current_photo_path"
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
     * Registers the activity for handling a request for getting a picture from the device gallery
     */
    private lateinit var selectPicture: ActivityResultLauncher<PickVisualMediaRequest>

    /**
     * Launcher for cropping a picture with [CropImageActivity]
     */
    private lateinit var cropImage: ActivityResultLauncher<CropImageActivity.ActivityParams>

    /**
     * Registers the activity for handling a request for taking a photo with the device camera
     */
    private lateinit var takePicture: ActivityResultLauncher<Uri>

    /**
     * Request permission for using the device camera
     */
    protected lateinit var requestCameraPermissionLauncher: ActivityResultLauncher<String>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        restorePendingPhotoState(savedInstanceState)
        Timber.d("Initializing TakePictureFragment")

        selectPicture = registerForActivityResult(ActivityResultContracts.PickVisualMedia()) { data ->
            if (data != null) {
                Timber.d("Image selected from gallery")
                cropImage.launch(CropImageActivity.ActivityParams(data))
            } else {
                Timber.d("No image selected from gallery")
            }
        }

        cropImage = registerForActivityResult(CropImageActivity.ResultContract()) { path ->
            Timber.d("Image cropped")
            cleanupPendingPhoto()
            onImageLoaded(path)
        }

        takePicture = registerForActivityResult(ActivityResultContracts.TakePicture()) { success ->
            Timber.d("Picture taken result: $success")
            if (!success) {
                Timber.d("Picture capture cancelled")
                cleanupPendingPhoto()
                return@registerForActivityResult
            }

            val photoUri = currentPhotoUri
            if (photoUri == null) {
                val error = IllegalStateException(
                    "Camera returned success but pending photo Uri was missing"
                )
                Timber.e(error, "TakePictureFragment lost the pending photo Uri before result delivery")
                with(Firebase.crashlytics) {
                    log("TakePictureFragment: Missing pending photo Uri after camera result")
                    recordException(error)
                }
                cleanupPendingPhoto()
                onTakingPictureError(error)
                return@registerForActivityResult
            }

            Timber.d("Launching crop for captured image")
            cropImage.launch(CropImageActivity.ActivityParams(photoUri))
        }

        requestCameraPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            Timber.d("Camera permission request result: $isGranted")
            if (isGranted) {
                launchTakePicture()
            } else {
                Timber.w("Camera permission denied")
                Toast.makeText(
                    requireContext(),
                    R.string.toast_error_no_photo_permissions,
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    /**
     * Checks whether the app has the [Manifest.permission.CAMERA] permission granted
     */
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
                log("TakePictureFragment: Missing objectId when launching camera")
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
        if (activity?.isChangingConfigurations == true && currentPhotoUri != null) {
            Timber.d("Retaining pending TakePictureFragment photo across configuration change")
        } else {
            Timber.d("Cleaning up TakePictureFragment resources")
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
