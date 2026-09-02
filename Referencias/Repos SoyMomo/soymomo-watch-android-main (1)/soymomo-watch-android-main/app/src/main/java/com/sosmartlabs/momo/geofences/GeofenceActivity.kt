package com.sosmartlabs.momo.geofences

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.sosmartlabs.momo.databinding.ActivityGeofenceBinding
import com.sosmartlabs.momo.geofences.ui.GeofenceViewModel
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class GeofenceActivity : AppCompatActivity() {
    private lateinit var binding: ActivityGeofenceBinding

    private val geofenceViewModel: GeofenceViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("GeofenceActivity: onCreate")
        enableEdgeToEdge()
        binding = ActivityGeofenceBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()

        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            setDisplayShowHomeEnabled(true)
            setDisplayShowTitleEnabled(false)
        }
    }

    private fun setupEdgeToEdge() {
        Timber.d("GeofenceActivity: setupEdgeToEdge")

        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("GeofenceActivity: systemBars $systemBars")
            Timber.d("GeofenceActivity: displayCutout $displayCutout")
            Timber.d("GeofenceActivity: navigationBars $navigationBars")

            // Apply top insets to the NavHostFragment for status bar
            binding.navGeofences.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                0
            )

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("GeofenceActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to NavHostFragment for navigation bar
            binding.navGeofences.setPadding(
                binding.navGeofences.paddingLeft,
                binding.navGeofences.paddingTop,
                binding.navGeofences.paddingRight,
                bottomPadding
            )

            windowInsets
        }
    }
}