package com.sosmartlabs.momo.reminders

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.sosmartlabs.momo.databinding.ActivityRemindersBinding
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.reminders.ui.RemindersViewModel
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class RemindersActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRemindersBinding

    private val viewModel: RemindersViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        if (!intent.hasExtra(Constants.EXTRA_WATCH)) {
            finish()
        }

        val watch = intent.getParcelableExtra<Wearer>(Constants.EXTRA_WATCH)!!
        viewModel.watch = watch

        viewModel.getReminders()

        binding = ActivityRemindersBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupEdgeToEdge()
    }

    private fun setupEdgeToEdge() {
        Timber.d("RemindersActivity: setupEdgeToEdge")

        // Set dark status bar appearance (fragments will extend their AppBars into status bar)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.container) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime())

            Timber.d("RemindersActivity: systemBars $systemBars")
            Timber.d("RemindersActivity: displayCutout $displayCutout")
            Timber.d("RemindersActivity: navigationBars $navigationBars")
            Timber.d("RemindersActivity: ime $ime")

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

            Timber.d("RemindersActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, navigationBarPadding $navigationBarPadding")
            Timber.d("RemindersActivity: keyboardPadding $keyboardPadding, bottomPadding $bottomPadding")

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