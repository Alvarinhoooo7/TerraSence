package com.sosmartlabs.momotabletpadres.tabletsettings.dug.music_detection.steps

import android.os.Bundle
import androidx.activity.addCallback
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowInsetsControllerCompat
import com.google.android.material.tabs.TabLayoutMediator
import com.sosmartlabs.momotabletpadres.adapters.SpotifyTutorialPagerAdapter
import com.sosmartlabs.momotabletpadres.databinding.ActivityEnableSpotifyMusicDetectorBinding
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import dagger.hilt.android.AndroidEntryPoint

/**
 * Activity that shows a tutorial for enabling Explicit music detector on Spotify
 */
@AndroidEntryPoint
class EnableSpotifyMusicDetectorActivity : AppCompatActivity() {

    /**
     * View binding for this activity
     */
    private lateinit var binding: ActivityEnableSpotifyMusicDetectorBinding

    /**
     * Pager adapter for tutorial steps
     */
    private lateinit var pagerAdapter: SpotifyTutorialPagerAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        binding = ActivityEnableSpotifyMusicDetectorBinding.inflate(layoutInflater)
        setContentView(binding.root)
        // The activity's dark indigo gradient (#331A8C) sits behind the status bar,
        // so use white status-bar icons — matching the other dark-header activities.
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = false
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            bottomView = binding.stepsIndicator
        )
        setupPager()

        // Step back through the pager on Back; fall through to default back on the
        // first page. Uses OnBackPressedDispatcher (back-gesture compatible).
        onBackPressedDispatcher.addCallback(this) {
            val pager = binding.stepsViewPager
            if (pager.currentItem == 0) {
                isEnabled = false
                onBackPressedDispatcher.onBackPressed()
            } else {
                pager.currentItem -= 1
            }
        }
    }

    /**
     * Setup the [pagerAdapter] to a ViewPager for display tutorial steps
     */
    private fun setupPager() {
        pagerAdapter = SpotifyTutorialPagerAdapter(this)
        with(binding) {
            stepsViewPager.adapter = pagerAdapter
            TabLayoutMediator(stepsIndicator, stepsViewPager) { _, _ ->
                // We don't do anything here
            }.attach()
        }
    }
}