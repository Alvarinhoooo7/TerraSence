package com.sosmartlabs.momo.dialpad

import android.annotation.SuppressLint
import android.app.ProgressDialog
import android.os.Build
import android.os.Bundle
import android.text.Html
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.snackbar.Snackbar
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityDialPadBinding
import com.sosmartlabs.momo.dialpad.ui.DialPadViewModel
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.SnackbarUtils
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class DialPadActivity : AppCompatActivity() {

    @Inject lateinit var toolbarConstructor : ToolbarConstructor

    private val TAG = javaClass.name

    private lateinit var binding: ActivityDialPadBinding
    private lateinit var mWearerId: String

    private val mViewModel: DialPadViewModel by viewModels()
    private lateinit var mDialog: ProgressDialog

    private var isConnected = false

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        
        binding = ActivityDialPadBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        mWearerId = intent.getStringExtra(Constants.EXTRA_WEARER_ID)!!

        binding.dialPadSwitch.setOnClickListener {
            mViewModel.saveDialPadMode(binding.dialPadSwitch.isChecked)
        }

        setUpToolbar()
        setupEdgeToEdge()

        mDialog = ProgressDialog(this)
        observeViewModel()
    }

    private fun setUpToolbar(){
        toolbarConstructor
            .setErrorName("DialPadActivity")
            .build()
    }

    private fun observeViewModel() {
        mViewModel.isWatchConnected.observe(this) { isConnected = it }
        mViewModel.watch.observe(this) {
            when (it.status) {
                Resource.Status.LOADING -> with(mDialog) {
                    setMessage(getString(R.string.progress_finding_momo))
                    show()
                }
                Resource.Status.LOAD_SUCCESS -> {
                    mDialog.dismiss()
                    val watch = it.data!!
                    val settings = watch.settings
                    if (settings.has("dialpadEnabled")) {
                        binding.dialPadSwitch.isChecked = settings.dialpadEnabled
                    } else {
                        settings.put("dialpadEnabled", false)
                        binding.dialPadSwitch.isChecked = false
                    }
                }
                Resource.Status.LOAD_ERROR -> {
                    mDialog.dismiss()
                    Toast.makeText(this@DialPadActivity, R.string.toast_error_could_not_load_settings, Toast.LENGTH_LONG).show()
                    finish()
                }
                Resource.Status.UPDATING -> with(mDialog) {
                    setMessage(getString(R.string.progress_saving_changes))
                    show()
                }
                Resource.Status.UPDATING_SUCCESS -> {
                    mDialog.dismiss()
                    if (isConnected) {
                        showSnackbar(getString(R.string.snackbar_dialpad_mode_updated))
                    }
                    else {
                        SnackbarUtils.showNotConnected(this@DialPadActivity, binding.dialPadConstraintLayout)
                    }
                }
                Resource.Status.UPDATING_ERROR -> {
                    mDialog.dismiss()
                    showSnackbar(getString(R.string.snackbar_dialpad_error))
                }
                else -> { }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (mWearerId == null) supportFinishAfterTransition()
        mViewModel.fetchInformation(mWearerId)
    }

    fun showSnackbar(message: String) {
        val snackbar = Snackbar.make(binding.dialPadConstraintLayout, Html.fromHtml(message), Snackbar.LENGTH_LONG)
        snackbar.view.setBackgroundColor(ContextCompat.getColor(this, R.color.colorPrimary))
        snackbar.show()
    }

    private fun setupEdgeToEdge() {
        Timber.d("DialPadActivity: setupEdgeToEdge")

        // Set dark status bar appearance (colorPrimary is dark purple)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.dialPadConstraintLayout) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("DialPadActivity: systemBars $systemBars")
            Timber.d("DialPadActivity: displayCutout $displayCutout")
            Timber.d("DialPadActivity: navigationBars $navigationBars")

            // Apply top padding to AppBarLayout to extend colorPrimary background into status bar area
            binding.dialPadAppbarlayout.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.dialPadAppbarlayout.paddingBottom
            )

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("DialPadActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to root ConstraintLayout for navigation bar
            binding.dialPadConstraintLayout.setPadding(
                binding.dialPadConstraintLayout.paddingLeft,
                binding.dialPadConstraintLayout.paddingTop,
                binding.dialPadConstraintLayout.paddingRight,
                bottomPadding
            )

            windowInsets
        }
    }
}
