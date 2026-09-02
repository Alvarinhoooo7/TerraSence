package com.sosmartlabs.momo.cropimage

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContract
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityCropImageBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import timber.log.Timber
import java.io.File
import java.io.FileOutputStream


/**
 * @author mrg
 * @date 11/29/17
 */
class CropImageActivity : AppCompatActivity() {
    private lateinit var mBinding: ActivityCropImageBinding
    private lateinit var mImageUri: Uri

    enum class ImageRequest { PICK_IMAGE, TAKE_IMAGE, CROP_IMAGE }


    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        
        mBinding = ActivityCropImageBinding.inflate(layoutInflater)
        setContentView(mBinding.root)

        if (intent.getStringExtra(Constants.EXTRA_IMAGE_URI).isNullOrEmpty()) {
            Toast.makeText(this, R.string.toast_error_loading_image, Toast.LENGTH_LONG).show()
            finish()
        }
        mImageUri = Uri.parse(intent.getStringExtra(Constants.EXTRA_IMAGE_URI))
        
        setupEdgeToEdge()
        
        with(mBinding) {
            buttonCancel.setOnClickListener {
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
            buttonSave.setOnClickListener {
                val appFolder = File(cacheDir.absolutePath)
                if (!appFolder.exists()) appFolder.mkdirs()
                val path =
                    appFolder.absolutePath + "/" + (intent.getStringExtra(Constants.EXTRA_DEVICE_ID)?:"") + System.currentTimeMillis() + ".png"
                val file = File(path)
                val out = FileOutputStream(file)
                try {
                    val croppedBitmap = cropView.getCroppedImage(400, 400)
                    croppedBitmap?.compress(Bitmap.CompressFormat.JPEG, 80, out)
                    out.close()
                    val result = Intent()
                    result.data = Uri.fromFile(file)
                    result.putExtra(Constants.EXTRA_IMAGE_URI, path)
                    setResult(Activity.RESULT_OK, result)
                } catch (e: Exception) {
                    setResult(Activity.RESULT_CANCELED)
                    Toast.makeText(
                        this@CropImageActivity,
                        R.string.toast_error_cropping_image,
                        Toast.LENGTH_LONG
                    ).show()
                    Timber.e(e)
                    with(Firebase.crashlytics) {
                        log("Error cropping image")
                        recordException(e)
                    }
                } finally {
                    finish()
                }
            }
            buttonRotate.setOnClickListener {
                cropView.rotateImage(-90)
            }
        }
        loadImage()
    }

    private fun loadImage() {
        mBinding.cropView.setImageUriAsync(mImageUri)
    }

    /**
     * Class for launch CropImageActivity and handle the result from it
     */
    class ResultContract : ActivityResultContract<ActivityParams, String?>() {
        override fun createIntent(context: Context, activityParams: ActivityParams): Intent {
            return Intent(context, CropImageActivity::class.java)
                .putExtra(Constants.EXTRA_IMAGE_URI, activityParams.imageUri.toString())
                .putExtra(Constants.EXTRA_DEVICE_ID, activityParams.deviceId)
        }

        override fun parseResult(resultCode: Int, intent: Intent?): String? {
            if (resultCode != Activity.RESULT_OK) {
                return null
            }

            intent?.getStringExtra(Constants.EXTRA_IMAGE_URI)?.let { path ->
                return path
            }

            intent?.data?.path?.let { path ->
                return path
            }

            val error = IllegalStateException(
                "CropImageActivity returned RESULT_OK without an image path"
            )
            Timber.e(error, "CropImageActivity.ResultContract received malformed success result")
            CrashlyticsLog.recordNonFatalError(
                error,
                "CropImageActivity.ResultContract: RESULT_OK without image path"
            )
            return null
        }
    }

    private fun setupEdgeToEdge() {
        Timber.d("CropImageActivity: setupEdgeToEdge")

        // Set light status bar appearance for better visibility on black background
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(mBinding.root) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("CropImageActivity: systemBars $systemBars")
            Timber.d("CropImageActivity: displayCutout $displayCutout")
            Timber.d("CropImageActivity: navigationBars $navigationBars")

            // Apply top padding to CropImageView for status bar
            mBinding.cropView.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                mBinding.cropView.paddingBottom
            )

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("CropImageActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to root container for navigation bar
            // This pushes all bottom-constrained buttons up from the navigation bar
            mBinding.root.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                0, // No top padding - CropImageView handles its own top padding
                systemBars.right.coerceAtLeast(displayCutout.right),
                bottomPadding
            )

            windowInsets
        }
    }

    /**
     * Parameters required for launch CropImageActivity
     */
    data class ActivityParams(val imageUri: Uri, val deviceId: String? = null)
}
