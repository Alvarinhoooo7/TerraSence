package com.sosmartlabs.momotabletpadres.settings

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowInsetsControllerCompat
import androidx.navigation.fragment.NavHostFragment
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.ActivitySettingsBinding
import com.sosmartlabs.momotabletpadres.geofences.ui.GeofenceViewModel
import com.sosmartlabs.momotabletpadres.main.ui.MainViewModel
import com.sosmartlabs.momotabletpadres.utils.Constants
import com.sosmartlabs.momotabletpadres.viewmodels.UserViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber

/**
 * Container for Tablet Info Fragments
 */
@OptIn(ExperimentalCoroutinesApi::class)
@AndroidEntryPoint
class SettingsActivity: AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding

    /**
     * ViewModel
     */
    private val userViewModel: UserViewModel by viewModels()
    private val mainViewModel: MainViewModel by viewModels()
    private val geofenceViewModel: GeofenceViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        Timber.d("SettingsActivity: onCreate")
        
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Configure system bars
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = false
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightNavigationBars = true

        setupNavigation()
    }

    private fun setupNavigation() {
        Timber.d("SettingsActivity: Setting up navigation")
        val navHostFragment = supportFragmentManager.findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController
        val graph = navController.navInflater.inflate(R.navigation.nav_settings)
        
        navController.setGraph(graph, intent.extras)
    }

    override fun onSupportNavigateUp(): Boolean {
        Timber.d("SettingsActivity: Navigating up")
        onBackPressed()
        return true
    }
}