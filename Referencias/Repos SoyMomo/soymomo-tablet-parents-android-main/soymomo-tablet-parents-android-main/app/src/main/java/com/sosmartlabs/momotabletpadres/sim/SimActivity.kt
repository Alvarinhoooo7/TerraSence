package com.sosmartlabs.momotabletpadres.sim

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowInsetsControllerCompat
import androidx.navigation.findNavController
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.ActivitySimBinding
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.sim.ui.SimViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class SimActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySimBinding

    private val simViewModel: SimViewModel by viewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        Timber.d("SimActivity: onCreate() - Starting activity creation")
        CrashlyticsLog.log("SimActivity: Starting activity creation")

        binding = ActivitySimBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Configure system bars
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = false
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightNavigationBars = true
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