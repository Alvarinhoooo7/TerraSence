package com.sosmartlabs.momotabletpadres.tabletsettings.dug.music_detection.steps

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.sosmartlabs.momotabletpadres.databinding.FragmentSpotifyConfigurationReadyBinding
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class SpotifyConfigurationReadyFragment : Fragment() {

    private lateinit var binding: FragmentSpotifyConfigurationReadyBinding

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                          savedInstanceState: Bundle?): View {
        Timber.d("SpotifyConfigurationReadyFragment: onCreateView")
        return FragmentSpotifyConfigurationReadyBinding.inflate(inflater, container, false).apply {
            binding = this
        }.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("SpotifyConfigurationReadyFragment: onViewCreated")
        
        binding.configurationDoneButton.setOnClickListener {
            Timber.d("SpotifyConfigurationReadyFragment: Configuration done button clicked, finishing activity")
            requireActivity().finish()
        }
    }
}