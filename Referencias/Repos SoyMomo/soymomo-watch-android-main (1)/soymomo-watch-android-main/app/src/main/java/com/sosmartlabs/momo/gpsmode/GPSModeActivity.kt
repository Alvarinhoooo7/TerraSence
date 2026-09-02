package com.sosmartlabs.momo.gpsmode

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.slider.Slider
import com.google.android.material.snackbar.Snackbar
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityGpsModeBinding
import com.sosmartlabs.momo.gpsmode.model.GPSFrequency
import com.sosmartlabs.momo.gpsmode.ui.GpsModeViewModel
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.SnackbarUtils
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class GPSModeActivity : AppCompatActivity() {

    @Inject lateinit var toolbarConstructor: ToolbarConstructor

    private lateinit var binding: ActivityGpsModeBinding

    companion object {
        private const val VALUE_SLIDER_1 = 0F
        private const val VALUE_SLIDER_3 = 10F
        private const val VALUE_SLIDER_5 = 20F
        private const val VALUE_SLIDER_10 = 30F
        private const val VALUE_SLIDER_30 = 40F
        private const val VALUE_SLIDER_60 = 50F
    }

    private var wearerId: String? = null

    private val gpsViewModel: GpsModeViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("GPSModeActivity: onCreate")
        
        enableEdgeToEdge()
        binding = ActivityGpsModeBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()

        wearerId = intent.getStringExtra(Constants.EXTRA_WEARER_ID)
        setToolbar()
        setViews()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        wearerId?.let { id ->
            gpsViewModel.fetchInformation(id)
        } ?: supportFinishAfterTransition()
    }

    private fun setToolbar() {
        toolbarConstructor
            .setDisplayShowTitle(false)
            .setTitle(R.string.settings_gps_title)
            .setErrorName("GPSModeActivity")
            .build()
    }

    private fun setViews() {
        binding.slider.addOnSliderTouchListener(object : Slider.OnSliderTouchListener {
            override fun onStartTrackingTouch(slider: Slider) {
                Timber.d("Value on start ${slider.value}")
            }

            override fun onStopTrackingTouch(slider: Slider) {
                Timber.d("Value on stop ${slider.value}")
                when (slider.value) {
                    0F -> {
                        gpsViewModel.saveGpsMode(GPSFrequency.ONE_MINUTE)
                        updateFrequencyDisplayAndAnimation(GPSFrequency.ONE_MINUTE)
                    }
                    10F -> {
                        gpsViewModel.saveGpsMode(GPSFrequency.THREE_MINUTES)
                        updateFrequencyDisplayAndAnimation(GPSFrequency.THREE_MINUTES)
                    }
                    20F -> {
                        gpsViewModel.saveGpsMode(GPSFrequency.FIVE_MINUTES)
                        updateFrequencyDisplayAndAnimation(GPSFrequency.FIVE_MINUTES)
                    }
                    30F -> {
                        gpsViewModel.saveGpsMode(GPSFrequency.TEN_MINUTES)
                        updateFrequencyDisplayAndAnimation(GPSFrequency.TEN_MINUTES)
                    }
                    40F -> {
                        gpsViewModel.saveGpsMode(GPSFrequency.THIRTY_MINUTES)
                        updateFrequencyDisplayAndAnimation(GPSFrequency.THIRTY_MINUTES)
                    }
                    50F -> {
                        gpsViewModel.saveGpsMode(GPSFrequency.ONE_HOUR)
                        updateFrequencyDisplayAndAnimation(GPSFrequency.ONE_HOUR)

                    }
                }
            }
        })
    }

    private fun observeViewModel() {
        gpsViewModel.isWatchConnected.observe(this) {
            if (!it) {
                SnackbarUtils.showNotConnected(this@GPSModeActivity, binding.gpsModeLayout)
            }
        }

        gpsViewModel.isBatterySaveEnabled.observe(this) {
            if (it) {
                showBatterySaveAlert()
            }
        }

        gpsViewModel.watch.observe(this) {
            when (it.status) {
                Resource.Status.LOADING -> {
                    showLinearProgressIndicator()
                }
                Resource.Status.LOAD_SUCCESS -> {
                    hideLinearProgressIndicator()
                }
                Resource.Status.LOAD_ERROR -> {
                    hideLinearProgressIndicator()
                    Toast.makeText(
                        this@GPSModeActivity,
                        R.string.toast_error_could_not_load_settings, Toast.LENGTH_LONG
                    ).show()
                    finish()
                }
                Resource.Status.UPDATING -> {
                    showLinearProgressIndicator()
                }
                Resource.Status.UPDATING_SUCCESS -> {
                    hideLinearProgressIndicator()
                    showSnackbar(getString(R.string.gps_snackbar_mode_updated))
                }
                Resource.Status.UPDATING_ERROR -> {
                    hideLinearProgressIndicator()
                    showSnackbar(getString(R.string.gps_snackbar_error))
                }
                else -> { /* Do nothing in any other case */
                }
            }
        }

        gpsViewModel.gpsFrequencySelected.observe(this) { gpsFrequency ->
            binding.slider.value = when (gpsFrequency) {
                GPSFrequency.ONE_MINUTE -> {
                    VALUE_SLIDER_1
                }
                GPSFrequency.THREE_MINUTES -> {
                    VALUE_SLIDER_3
                }
                GPSFrequency.FIVE_MINUTES -> {
                    VALUE_SLIDER_5
                }
                GPSFrequency.TEN_MINUTES -> {
                    VALUE_SLIDER_10
                }
                GPSFrequency.THIRTY_MINUTES -> {
                    VALUE_SLIDER_30
                }
                GPSFrequency.ONE_HOUR -> {
                    VALUE_SLIDER_60
                }
                null -> {
                    VALUE_SLIDER_1
                }
            }
            updateFrequencyDisplayAndAnimation(gpsFrequency)
        }

    }

    private fun updateFrequencyDisplayAndAnimation(gpsFrequencySelected: GPSFrequency) {
        val isHighConsumption = gpsFrequencySelected.minutes <= GPSFrequency.FIVE_MINUTES.minutes
        val consumptionText =
            if (isHighConsumption) getString(R.string.gps_consumption_high) else getString(R.string.gps_consumption_normal)
        val backgroundResource =
            if (isHighConsumption) R.drawable.background_shape_rounded_accent else R.drawable.background_shape_rounded_purple_light

        binding.informationFrequencyAndBattery.text = getString(
            R.string.gps_minutes_text_information,
            gpsFrequencySelected.minutes,
            consumptionText
        )
        binding.informationFrequencyAndBattery.setBackgroundResource(backgroundResource)
        binding.informationRecommendedLabel.visibility =
            if (gpsFrequencySelected == GPSFrequency.TEN_MINUTES) View.VISIBLE else View.INVISIBLE

        val animationResource = when (gpsFrequencySelected) {
            GPSFrequency.ONE_MINUTE -> R.raw.frequency_gps_1
            GPSFrequency.THREE_MINUTES -> R.raw.frequency_gps_3
            GPSFrequency.FIVE_MINUTES -> R.raw.frequency_gps_5
            GPSFrequency.TEN_MINUTES -> R.raw.frequency_gps_10
            GPSFrequency.THIRTY_MINUTES -> R.raw.frequency_gps_30
            GPSFrequency.ONE_HOUR -> R.raw.frequency_gps_60
        }

        binding.gpsExampleAnimation.setAnimation(animationResource)
        binding.gpsExampleAnimation.playAnimation()
    }

    private fun showBatterySaveAlert() {
        AlertDialog.Builder(this@GPSModeActivity)
            .setTitle(R.string.gps_warning_battery_saving_title)
            .setMessage(getString(R.string.gps_warning_battery_saving_text))
            .setPositiveButton(R.string.button_accept) { _, _ -> }.show()
    }

    private fun showLinearProgressIndicator() {
        with(binding.progressIndicator) {
            visibility = View.VISIBLE
            isIndeterminate = true
        }
    }

    private fun hideLinearProgressIndicator() {
        binding.progressIndicator.visibility = View.GONE
    }

    fun showSnackbar(message: String) {
        val snackbar = Snackbar.make(binding.gpsModeLayout, message, Snackbar.LENGTH_LONG)
        snackbar.view.setBackgroundColor(ContextCompat.getColor(this, R.color.colorPrimary))
        snackbar.show()
    }

    private fun setupEdgeToEdge() {
        Timber.d("GPSModeActivity: setupEdgeToEdge")

        // Set dark status bar appearance (colorPrimary is dark purple)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.gpsModeLayout) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("GPSModeActivity: systemBars $systemBars")
            Timber.d("GPSModeActivity: displayCutout $displayCutout")
            Timber.d("GPSModeActivity: navigationBars $navigationBars")

            // Apply top padding to AppBarLayout to extend colorPrimary background into status bar area
            binding.contentAppBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.contentAppBar.paddingBottom
            )

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("GPSModeActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to NestedScrollView for navigation bar
            // Find the NestedScrollView (it's a child of the CoordinatorLayout)
            val nestedScrollView = binding.gpsModeLayout.getChildAt(1) as? androidx.core.widget.NestedScrollView
            nestedScrollView?.setPadding(
                nestedScrollView.paddingLeft,
                nestedScrollView.paddingTop,
                nestedScrollView.paddingRight,
                bottomPadding
            )

            windowInsets
        }
    }
}
