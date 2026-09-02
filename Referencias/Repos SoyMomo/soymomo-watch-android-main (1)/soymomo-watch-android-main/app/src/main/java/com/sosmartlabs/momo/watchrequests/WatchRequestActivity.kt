package com.sosmartlabs.momo.watchrequests

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.sosmartlabs.momo.databinding.ActivityWatchRequestBinding
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.watchrequests.ui.WatchRequestViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class WatchRequestActivity : AppCompatActivity() {
    private lateinit var binding: ActivityWatchRequestBinding
    private val viewModel: WatchRequestViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        
        val watchId = intent.getStringExtra(Constants.EXTRA_WEARER_ID)
        if (watchId.isNullOrEmpty()) {
            finish()
            return
        }

        viewModel.loadRequests(watchId)

        binding = ActivityWatchRequestBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupEdgeToEdge()
    }

    private fun setupEdgeToEdge() {
        Timber.d("WatchRequestActivity: setupEdgeToEdge")

        // Set dark status bar appearance (colorPrimary is dark purple) - fragments will extend their AppBars into status bar
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.container) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime())

            Timber.d("WatchRequestActivity: systemBars $systemBars")
            Timber.d("WatchRequestActivity: displayCutout $displayCutout")
            Timber.d("WatchRequestActivity: navigationBars $navigationBars")
            Timber.d("WatchRequestActivity: ime $ime")

            // DO NOT apply top padding at activity level - let fragments handle their own AppBar padding
            // This allows each fragment's AppBar to extend its background into the status bar area

            // Handle bottom insets: combine navigation bars and IME (keyboard)
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)

            // Calculate bottom padding considering both navigation bar and keyboard
            val navigationBarPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            // IME inset represents the keyboard height
            val keyboardPadding = ime.bottom

            // Use the larger of keyboard or navigation bar
            val bottomPadding = keyboardPadding.coerceAtLeast(navigationBarPadding)

            Timber.d("WatchRequestActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, navigationBarPadding $navigationBarPadding")
            Timber.d("WatchRequestActivity: keyboardPadding $keyboardPadding, bottomPadding $bottomPadding")

            // Apply bottom padding to NavHostFragment for navigation bar and keyboard
            binding.navHostFragment.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                0, // No top padding - fragments handle their own AppBar padding
                systemBars.right.coerceAtLeast(displayCutout.right),
                bottomPadding
            )

            // Important: Return windowInsets WITHOUT consuming them
            // This allows fragments to receive and handle top insets themselves
            windowInsets
        }
    }
}
