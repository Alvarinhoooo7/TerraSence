package com.sosmartlabs.momo.sim

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.navigation.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivitySimBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.sim.ui.SimViewModel
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class SimActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySimBinding

    private val simViewModel: SimViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("SimActivity: onCreate() - Starting activity creation")
        CrashlyticsLog.log("SimActivity: Starting activity creation")
        
        enableEdgeToEdge()
        binding = ActivitySimBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()
        applyDeepLinkExtras()
        simViewModel.trackSimCenterOpened()
    }

    private fun applyDeepLinkExtras() {
        val subscriptionId = intent.getStringExtra(Constants.EXTRA_DEEP_LINK_SUBSCRIPTION_ID)
        val scrollToUpgrade = intent.getBooleanExtra(Constants.EXTRA_DEEP_LINK_SCROLL_TO_UPGRADE, false)
        if (subscriptionId.isNullOrEmpty()) return
        simViewModel.setPendingDeepLink(subscriptionId, scrollToUpgrade)
        // Consume from the Intent so a config change doesn't re-trigger.
        intent.removeExtra(Constants.EXTRA_DEEP_LINK_SUBSCRIPTION_ID)
        intent.removeExtra(Constants.EXTRA_DEEP_LINK_SCROLL_TO_UPGRADE)
    }

    private fun setupEdgeToEdge() {
        Timber.d("SimActivity: setupEdgeToEdge")

        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("SimActivity: systemBars $systemBars")
            Timber.d("SimActivity: displayCutout $displayCutout")
            Timber.d("SimActivity: navigationBars $navigationBars")

            // Apply top insets to the NavHostFragment for status bar
            binding.navHostFragmentSubscriptions.setPadding(
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

            Timber.d("SimActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to NavHostFragment for navigation bar
            binding.navHostFragmentSubscriptions.setPadding(
                binding.navHostFragmentSubscriptions.paddingLeft,
                binding.navHostFragmentSubscriptions.paddingTop,
                binding.navHostFragmentSubscriptions.paddingRight,
                bottomPadding
            )

            windowInsets
        }
    }

    // Polling is paused while the activity is in the background (it used to keep
    // hitting the network every 5s after a Home press) and resumed on return.
    // Scoped to the ACTIVITY, not the fragments: the detail screen depends on the
    // list's polling for live payment-status refresh, so a fragment-level stop
    // would silently kill that.
    private var resumePollingOnStart = false

    override fun onStart() {
        super.onStart()
        if (resumePollingOnStart) {
            resumePollingOnStart = false
            Timber.d("SimActivity: onStart() - Resuming subscription polling")
            simViewModel.startPollingSubscriptions()
        }
    }

    override fun onStop() {
        super.onStop()
        if (simViewModel.isPollingSubscriptions()) {
            resumePollingOnStart = true
            Timber.d("SimActivity: onStop() - Pausing subscription polling while backgrounded")
            simViewModel.stopPollingSubscriptions()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Timber.d("SimActivity: onDestroy() - Stopping subscription polling")
        CrashlyticsLog.log("SimActivity: Stopping subscription polling")
        simViewModel.stopPollingSubscriptions()
    }

    override fun onSupportNavigateUp(): Boolean {
        Timber.d("SimActivity: onSupportNavigateUp() - Attempting navigation up")
        CrashlyticsLog.log("SimActivity: Attempting navigation up")
        
        val navigated = findNavController(R.id.nav_host_fragment_subscriptions).navigateUp()
        
        Timber.d("SimActivity: onSupportNavigateUp() - Navigation completed with result: $navigated")
        CrashlyticsLog.log("SimActivity: Navigation completed with result: $navigated")
        
        return navigated
    }

}
