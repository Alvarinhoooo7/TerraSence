package com.sosmartlabs.momo.settingsapp

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.navigation.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivitySettingsAppBinding
import com.sosmartlabs.momo.settingsapp.ui.SettingsAppViewModel
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class SettingsAppActivity : AppCompatActivity() {
    /**
     * Binding
     */
    private lateinit var binding: ActivitySettingsAppBinding

    /**
     * ViewModel
     */
    private val settingsAppViewModel: SettingsAppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        binding = ActivitySettingsAppBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()
    }

    private fun setupEdgeToEdge() {
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            val topInset = systemBars.top.coerceAtLeast(displayCutout.top)

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            // Apply both top and bottom insets to the nav host fragment
            val param = binding.navHostFragmentSettingsApp.layoutParams as ViewGroup.MarginLayoutParams
            param.setMargins(0, topInset, 0, bottomPadding)
            binding.navHostFragmentSettingsApp.layoutParams = param

            windowInsets
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        Timber.d("onSupportNavigateUp")
        findNavController(R.id.nav_host_fragment_settings_app).navigateUp()
        return true
    }
}