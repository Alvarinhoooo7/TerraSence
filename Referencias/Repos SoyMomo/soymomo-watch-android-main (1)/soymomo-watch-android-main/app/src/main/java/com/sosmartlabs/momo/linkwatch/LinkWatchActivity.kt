package com.sosmartlabs.momo.linkwatch

import android.app.Fragment
import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.navigation.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityLinkwatchBinding
import com.sosmartlabs.momo.linkwatch.ui.LinkWatchViewModel
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class LinkWatchActivity :AppCompatActivity(){

    private val linkWatchViewModel: LinkWatchViewModel by viewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by viewModels()

    private lateinit var binding: ActivityLinkwatchBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLinkwatchBinding.inflate(layoutInflater)
        setContentView(binding.root)
    }

    override fun onSupportNavigateUp(): Boolean {
        Timber.d("onSupportNavigateUp, current destination: ${findNavController(R.id.nav_host_fragment_linkwatch).currentDestination}")
        findNavController(R.id.nav_host_fragment_linkwatch).navigateUp()
        return true
    }

    override fun onAttachFragment(fragment: Fragment?) {
        super.onAttachFragment(fragment)

        window?.let {
            val windowInsetsController =
                WindowCompat.getInsetsController(window, window.decorView)
            windowInsetsController?.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            windowInsetsController.hide(WindowInsetsCompat.Type.navigationBars())
        }
    }
}