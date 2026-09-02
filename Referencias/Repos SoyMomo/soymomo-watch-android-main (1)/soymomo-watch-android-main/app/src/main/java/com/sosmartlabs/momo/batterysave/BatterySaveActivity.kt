package com.sosmartlabs.momo.batterysave

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
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.batterysave.ui.BatterySaveViewModel
import com.sosmartlabs.momo.databinding.ActivityBatterySaveBinding
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.SnackbarUtils
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class BatterySaveActivity : AppCompatActivity() {

    @Inject lateinit var toolbarConstructor: ToolbarConstructor

    private lateinit var mWearerId: String

    private lateinit var dialog: ProgressDialog

    private val mViewModel: BatterySaveViewModel by viewModels()
    private lateinit var mBinding: ActivityBatterySaveBinding

    private var isConnected = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        enableEdgeToEdge()
        mBinding = ActivityBatterySaveBinding.inflate(layoutInflater)
        setContentView(mBinding.root)
        setupEdgeToEdge()
        
        if (!intent.hasExtra(Constants.EXTRA_WEARER_ID)) supportFinishAfterTransition()

        mWearerId = intent.getStringExtra(Constants.EXTRA_WEARER_ID)!!

        toolbarConstructor
            .setErrorName("BatterySaveActivity")
            .build()

        mBinding.batterySaveSwitch.setOnClickListener {
            mViewModel.setBatterySaveEnabled(mBinding.batterySaveSwitch.isChecked)
        }

        dialog = ProgressDialog(this)

        subscribeViewModel()
    }

    private fun subscribeViewModel() {
        mViewModel.isWatchConnected.observe(this) {
            isConnected = it
        }
        mViewModel.isBatterySaveEnabled.observe(this) {
            when (it.status) {
                Resource.Status.LOADING -> with (dialog) {
                    setMessage(getString(R.string.progress_finding_momo))
                    show()
                }
                Resource.Status.LOAD_SUCCESS -> {
                    dialog.dismiss()
                    mBinding.batterySaveSwitch.isChecked = it.data!!
                }
                Resource.Status.LOAD_ERROR -> {
                    dialog.dismiss()
                    Toast.makeText(this@BatterySaveActivity, R.string.toast_error_could_not_load_settings, Toast.LENGTH_LONG).show()
                    finish()
                }
                Resource.Status.UPDATING -> with (dialog) {
                    setMessage(getString(R.string.progress_saving_changes))
                    show()
                }
                Resource.Status.UPDATING_SUCCESS -> {
                    dialog.dismiss()
                    if (isConnected) {
                        showSnackbar(getString(R.string.snackbar_battery_saving_mode_updated))
                    }
                    else {
                        SnackbarUtils.showNotConnected(this@BatterySaveActivity, mBinding.batterySaveConstraintLayout)
                    }
                }
                Resource.Status.UPDATING_ERROR -> {
                    dialog.dismiss()
                    showSnackbar(getString(R.string.snackbar_battery_saving_error))
                    mBinding.batterySaveSwitch.isChecked = it.data!!
                }
                else -> {}
            }
        }
    }

    override fun onResume() {
        super.onResume()
        mViewModel.fetchInformation(mWearerId)
    }

    fun showSnackbar(message: String) {
        val snackbar = Snackbar.make(mBinding.batterySaveConstraintLayout, Html.fromHtml(message), Snackbar.LENGTH_LONG)
        snackbar.view.setBackgroundColor(ContextCompat.getColor(this, R.color.colorPrimary))
        snackbar.show()
    }

    private fun setupEdgeToEdge() {
        // Set dark status bar appearance (colorPrimary is dark purple)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(mBinding.batterySaveConstraintLayout) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            // Apply top padding to AppBarLayout to extend colorPrimary background into status bar area
            mBinding.batterySaveAppbarlayout.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                mBinding.batterySaveAppbarlayout.paddingBottom
            )

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            // Apply bottom padding to root ConstraintLayout for navigation bar
            mBinding.batterySaveConstraintLayout.setPadding(
                mBinding.batterySaveConstraintLayout.paddingLeft,
                mBinding.batterySaveConstraintLayout.paddingTop,
                mBinding.batterySaveConstraintLayout.paddingRight,
                bottomPadding
            )

            windowInsets
        }
    }
}
