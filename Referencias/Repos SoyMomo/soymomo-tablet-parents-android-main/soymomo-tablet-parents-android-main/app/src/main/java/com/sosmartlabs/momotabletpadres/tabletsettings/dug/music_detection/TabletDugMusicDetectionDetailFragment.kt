package com.sosmartlabs.momotabletpadres.tabletsettings.dug.music_detection

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SettingsFragmentDugDetectionMusicDetailBinding
import com.sosmartlabs.momotabletpadres.glide.loadAppIcon
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.ExplicitMusicViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlin.math.roundToInt

@AndroidEntryPoint
class TabletDugMusicDetectionDetailFragment : Fragment() {

    private val viewModel: ExplicitMusicViewModel by activityViewModels()
    private lateinit var binding: SettingsFragmentDugDetectionMusicDetailBinding

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = SettingsFragmentDugDetectionMusicDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Reserve the status bar for the fixed-height 56dp purple header (as MARGIN so
        // its content isn't compressed; the root is colorPrimary, so the status-bar
        // strip stays purple) and pad the scroll body clear of the navigation bar.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.header.root,
            topAsMargin = true,
            bottomView = binding.detailScrollView,
            extraTopPx = resources.getDimensionPixelSize(R.dimen.horizontal_margin_small),
        )

        // Header
        binding.header.headerTitle.setText(R.string.dug_detail_header_music)
        binding.header.backButton.setOnClickListener { findNavController().navigateUp() }

        viewModel.selectedDetection.observe(viewLifecycleOwner) {
            // App icon
            viewModel.loadAppIconUrl(it.packageName) { iconUrl ->
                if (isAdded) {
                    binding.summaryCard.appIcon.loadAppIcon(iconUrl, it.appName)
                }
            }

            // Summary
            binding.summaryCard.appName.text = it.appName ?: it.packageName
            binding.summaryCard.detectionDate.text = DateUtil.getFormattedDateTime(it.detectionDate)

            // Song info
            Glide.with(requireContext())
                .load(it.songImage)
                .error(R.drawable.ic_action_app_hover)
                .into(binding.songImage)

            binding.songTitle.text = it.songTitle
            binding.artistName.text = it.detectedArtist
            binding.explicitScore.text = getString(
                R.string.dug_detection_song_detail,
                (it.explicitArtistScore * 100).roundToInt()
            )

        }
    }
}
