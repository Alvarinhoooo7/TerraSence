package com.sosmartlabs.momo.heymomohistory

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.os.bundleOf
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.navigation.NavController
import androidx.navigation.fragment.NavHostFragment
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityHeyMomoHistoryNewBinding
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class HeyMomoHistoryActivity : AppCompatActivity() {

    @Inject lateinit var watchUserRepository: WatchUserRepository

    private lateinit var binding: ActivityHeyMomoHistoryNewBinding
    private lateinit var navController: NavController
    private lateinit var wearerId: String
    private lateinit var deviceId: String

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("HeyMomoHistoryActivity: onCreate() - Starting activity creation")
        
        enableEdgeToEdge()
        
        binding = ActivityHeyMomoHistoryNewBinding.inflate(layoutInflater)
        setContentView(binding.root)

        wearerId = intent.getStringExtra(Constants.EXTRA_WEARER_ID) ?: run {
            Timber.e("HeyMomoHistoryActivity launched without EXTRA_WEARER_ID")
            finish()
            return
        }
        deviceId = intent.getStringExtra(Constants.EXTRA_DEVICE_ID) ?: run {
            Timber.e("HeyMomoHistoryActivity launched without EXTRA_DEVICE_ID")
            finish()
            return
        }

        Timber.d("HeyMomoHistoryActivity: Intent extras - deviceId: $deviceId, wearerId: $wearerId")

        setupNavigation()
        setupEdgeToEdge()
    }

    private fun setupEdgeToEdge() {
        Timber.d("HeyMomoHistoryActivity: setupEdgeToEdge")

        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("HeyMomoHistoryActivity: systemBars $systemBars")
            Timber.d("HeyMomoHistoryActivity: displayCutout $displayCutout")
            Timber.d("HeyMomoHistoryActivity: navigationBars $navigationBars")

            // DO NOT apply top padding at activity level - let each fragment pad its own
            // AppBar so the colored toolbar extends into the status bar area (true edge-to-edge),
            // matching the rest of the app (e.g. Reminders). Applying top padding here instead
            // pushed the whole fragment below the status bar, leaving a mismatched strip.
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("HeyMomoHistoryActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply left/right (cutout) and bottom (navigation bar) insets to the NavHostFragment.
            // Top stays 0 so fragments can extend their AppBar behind the status bar.
            binding.navHostFragmentHeymomo.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                0,
                systemBars.right.coerceAtLeast(displayCutout.right),
                bottomPadding
            )

            // Return insets WITHOUT consuming them so fragments receive the top inset themselves.
            windowInsets
        }
    }

    private fun setupNavigation() {
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment_heymomo) as NavHostFragment
        navController = navHostFragment.navController

        // Get the watch model to determine start destination
        val watch = watchUserRepository.findLocalWatchByWatchId(wearerId)

        // Determine start destination based on watch model
        val startDestination = if (watch?.isSpace4OrNewer() == true) {
            R.id.heyMomoMenuFragment
        } else {
            R.id.heyMomoHistoryFragment
        }

        Timber.d("HeyMomoHistoryActivity: Setting start destination to ${if (watch?.isSpace4OrNewer() == true) "Menu" else "History"}")

        // Create bundle with arguments
        val args = bundleOf(
            "deviceId" to deviceId,
            "wearerId" to wearerId
        )

        Timber.d("HeyMomoHistoryActivity: Setting navigation args - deviceId: $deviceId, wearerId: $wearerId")
        Timber.d("HeyMomoHistoryActivity: Args bundle contents: $args")

        // Create navigation graph with custom start destination
        val navGraph = navController.navInflater.inflate(R.navigation.nav_heymomo)
        
        // IMPORTANT: Set start destination BEFORE setting the graph
        navGraph.setStartDestination(startDestination)
        
        // Set the graph with default arguments
        navController.setGraph(navGraph, args)
        
        Timber.d("HeyMomoHistoryActivity: Navigation graph set successfully")
    }

    override fun onSupportNavigateUp(): Boolean {
        Timber.d("HeyMomoHistoryActivity: onSupportNavigateUp() - Attempting navigation up")
        return navController.navigateUp() || super.onSupportNavigateUp()
    }
}
