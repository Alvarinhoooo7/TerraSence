package com.sosmartlabs.momotabletpadres.tabletsettings.dug.music_detection.steps

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.FragmentSpotifyConfigurationStepBinding
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class SpotifyConfigurationStep2Fragment: Fragment() {
    private val stepImageId: Int = R.drawable.spotify_config_step_2
    private val stepTextId: Int = R.string.explicit_music_detection_config_step_2
    private lateinit var binding: FragmentSpotifyConfigurationStepBinding

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                          savedInstanceState: Bundle?): View {
        Timber.d("SpotifyConfigurationStep2Fragment: onCreateView() called")
        return FragmentSpotifyConfigurationStepBinding.inflate(inflater, container, false).also {
            Timber.d("SpotifyConfigurationStep2Fragment: Initializing view binding")
            binding = it
        }.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("SpotifyConfigurationStep2Fragment: onViewCreated() called")
        
        with(binding) {
            Timber.d("SpotifyConfigurationStep2Fragment: Setting up UI components")
            configurationStepImage.setImageResource(stepImageId)
            configurationStepText.setText(stepTextId)
            Timber.d("SpotifyConfigurationStep2Fragment: UI components setup completed")
        }
    }
}