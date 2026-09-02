package com.sosmartlabs.momotabletpadres.cropimage

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContract
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowInsetsControllerCompat
import com.google.firebase.Firebase
import com.google.firebase.crashlytics.crashlytics
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.ActivityCropImageBinding
import com.sosmartlabs.momotabletpadres.utils.Constants
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.io.File
import java.io.FileOutputStream

@AndroidEntryPoint
class CropImageActivity : AppCompatActivity() {
    private lateinit var mBinding: ActivityCropImageBinding
    private lateinit var mImageUri: Uri

    enum class ImageRequest { PICK_IMAGE, TAKE_IMAGE, CROP_IMAGE }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        mBinding = ActivityCropImageBinding.inflate(layoutInflater)
        setContentView(mBinding.root)
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = false
        // Single listener on the shared root lifts all three buttons clear of the
        // navigation bar; registering one listener per button on the same root would
        // leave only the last one lifted (see WindowInsetsUtils doc).
        WindowInsetsUtils.applyBottomInsetAsMargin(
            mBinding.root,
            listOf(mBinding.buttonCancel, mBinding.buttonRotate, mBinding.buttonSave)
        )

        if (intent.getStringExtra(Constants.EXTRA_IMAGE_URI).isNullOrEmpty()) {
            Toast.makeText(this, R.string.toast_error_loading_image, Toast.LENGTH_LONG).show()
            finish()
        }
        mImageUri = Uri.parse(intent.getStringExtra(Constants.EXTRA_IMAGE_URI))
        with(mBinding) {
            buttonCancel.setOnClickListener {
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
            buttonSave.setOnClickListener {
                val appFolder = File(cacheDir.absolutePath)
                if (!appFolder.exists()) appFolder.mkdirs()
                val path =
                    appFolder.absolutePath + "/" + System.currentTimeMillis() + ".png"
                Timber.d("path is $path")
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
        }

        override fun parseResult(resultCode: Int, intent: Intent?): String? {
            if (resultCode == Activity.RESULT_OK && intent != null) {
                return intent.data!!.path!!
            }

            return null
        }
    }

    /**
     * Parameters required for launch CropImageActivity
     */
    data class ActivityParams(val imageUri: Uri)
}