package com.sosmartlabs.momotabletpadres.settings.ui.picture

import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import com.google.firebase.Firebase
import com.google.firebase.crashlytics.crashlytics
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.cropimage.CropImageActivity
import com.sosmartlabs.momotabletpadres.utils.LoadSystemImagesUtil
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
abstract class TakePictureFragment : Fragment(), TakePictureCallbacks {

    @Inject
    lateinit var systemImagesUtil: LoadSystemImagesUtil

    private var currentPhotoUri: Uri? = null
    private lateinit var selectPicture: ActivityResultLauncher<PickVisualMediaRequest>
    private lateinit var cropImage: ActivityResultLauncher<CropImageActivity.ActivityParams>
    private lateinit var takePicture: ActivityResultLauncher<Uri>
    protected lateinit var requestCameraPermissionLauncher: ActivityResultLauncher<String>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        selectPicture = registerForActivityResult(ActivityResultContracts.PickVisualMedia()) { data ->
            Timber.d("selectPicture $data")
            if (data != null) {
                cropImage.launch(CropImageActivity.ActivityParams(data))
            }
        }

        cropImage = registerForActivityResult(CropImageActivity.ResultContract()) { path ->
            onImageLoaded(path)
        }

        takePicture = registerForActivityResult(ActivityResultContracts.TakePicture()) { success ->
            if (success) {
                cropImage.launch(CropImageActivity.ActivityParams(currentPhotoUri!!))
            }
        }

        requestCameraPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                launchTakePicture()
            } else {
                Toast.makeText(
                    requireContext(),
                    R.string.toast_error_no_photo_permissions,
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    override val hasCameraPermission: Boolean get() = systemImagesUtil.hasCameraPermissions()

    override fun launchTakePicture() {
        runCatching {
            currentPhotoUri = systemImagesUtil.createNewPictureFile()
            currentPhotoUri?.let { takePicture.launch(currentPhotoUri!!) }
        }.onFailure {
            with(Firebase.crashlytics) {
                log("Error launching take picture")
                recordException(it)
            }
            onTakingPictureError(it)
        }
    }

    override fun onTakingPictureError(e: Throwable) {
        // Does nothing by default. Implement if you require to taking pictures with the camera
    }

    override fun launchSelectPictureFromGallery() {
        selectPicture.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
    }

    override fun onDestroy() {
        systemImagesUtil.clean()
        super.onDestroy()
    }
}