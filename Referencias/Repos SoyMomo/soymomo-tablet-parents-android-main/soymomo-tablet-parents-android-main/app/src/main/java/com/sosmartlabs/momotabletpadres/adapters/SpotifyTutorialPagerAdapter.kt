package com.sosmartlabs.momotabletpadres.adapters

import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.viewpager2.adapter.FragmentStateAdapter
import com.sosmartlabs.momotabletpadres.tabletsettings.dug.music_detection.steps.SpotifyConfigurationReadyFragment
import com.sosmartlabs.momotabletpadres.tabletsettings.dug.music_detection.steps.SpotifyConfigurationStep1Fragment
import com.sosmartlabs.momotabletpadres.tabletsettings.dug.music_detection.steps.SpotifyConfigurationStep2Fragment

/**
 * Pager Adapter for Spotify Configuration steps
 * @param activity Activity that holds this adapter
 */
class SpotifyTutorialPagerAdapter(activity: FragmentActivity): FragmentStateAdapter(activity) {
    override fun getItemCount(): Int = 3

    override fun createFragment(position: Int): Fragment = when(position) {
        0 -> SpotifyConfigurationStep1Fragment()
        1 -> SpotifyConfigurationStep2Fragment()
        else -> SpotifyConfigurationReadyFragment()
    }

}