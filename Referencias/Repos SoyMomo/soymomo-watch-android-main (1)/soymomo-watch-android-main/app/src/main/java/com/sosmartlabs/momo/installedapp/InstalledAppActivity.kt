package com.sosmartlabs.momo.installedapp

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.sosmartlabs.momo.databinding.ActivityInstalledAppBinding
import com.sosmartlabs.momo.installedapp.ui.InstalledAppViewModel
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class InstalledAppActivity : AppCompatActivity() {

    private lateinit var binding: ActivityInstalledAppBinding

    private val installedAppViewModel: InstalledAppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        val watch = intent.getParcelableExtra<Wearer>(Constants.EXTRA_WATCH)
        if (watch == null) {
            finish()
            return
        }

        installedAppViewModel.watch = watch

        binding = ActivityInstalledAppBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupEdgeToEdge()
    }

    private fun setupEdgeToEdge() {
        Timber.d("InstalledAppActivity: setupEdgeToEdge")

        // Set dark status bar appearance (fragments will extend their AppBars into status bar)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.container) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime())

            Timber.d("InstalledAppActivity: systemBars $systemBars")
            Timber.d("InstalledAppActivity: displayCutout $displayCutout")
            Timber.d("InstalledAppActivity: navigationBars $navigationBars")
            Timber.d("InstalledAppActivity: ime $ime")

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

            Timber.d("InstalledAppActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, navigationBarPadding $navigationBarPadding")
            Timber.d("InstalledAppActivity: keyboardPadding $keyboardPadding, bottomPadding $bottomPadding")

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
