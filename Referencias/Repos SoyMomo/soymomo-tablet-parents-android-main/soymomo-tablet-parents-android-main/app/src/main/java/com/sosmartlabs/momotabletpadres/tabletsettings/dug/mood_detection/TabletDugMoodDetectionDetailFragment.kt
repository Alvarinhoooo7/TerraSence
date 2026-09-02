package com.sosmartlabs.momotabletpadres.tabletsettings.dug.mood_detection

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.GridLayoutManager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.ScreenshotsAdapter
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.helpers.MoodDetectionItemHelper
import com.sosmartlabs.momotabletpadres.databinding.SettingsFragmentDugDetectionMoodDetailBinding
import com.sosmartlabs.momotabletpadres.glide.loadAppIcon
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.MoodSearchesViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class TabletDugMoodDetectionDetailFragment : Fragment() {

    private val viewModel: MoodSearchesViewModel by activityViewModels()
    private lateinit var binding: SettingsFragmentDugDetectionMoodDetailBinding

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = SettingsFragmentDugDetectionMoodDetailBinding.inflate(inflater, container, false)
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
        binding.header.headerTitle.setText(R.string.dug_detail_header_mood)
        binding.header.backButton.setOnClickListener { findNavController().navigateUp() }

        val adapter = ScreenshotsAdapter(requireContext())
        binding.recyclerView.layoutManager = GridLayoutManager(requireContext(), 3)
        binding.recyclerView.adapter = adapter

        viewModel.currentDetection.observe(viewLifecycleOwner) {
            // App icon
            viewModel.loadAppIconUrl(it.packageName ?: it.appName) { iconUrl ->
                if (isAdded) {
                    binding.summaryCard.appIcon.loadAppIcon(iconUrl, it.appName)
                }
            }

            // Summary
            binding.summaryCard.appName.text = it.appName
            binding.summaryCard.detectionDate.text = DateUtil.getFormattedDateTime(it.date)

            // Chips — mood uses dynamic risk factor chips
            binding.summaryCard.chipGroup.removeAllViews()
            MoodDetectionItemHelper.addRiskFactorChips(
                requireContext(),
                it.riskFactors!!,
                it.totalMoodScore!!,
                binding.summaryCard.chipGroup,
                false
            )

            // Mood text
            binding.moodText.text = it.text

            // Captures
            val hasCaptures = it.screenshots != null
            binding.capturesTitle.visibility = if (hasCaptures) View.VISIBLE else View.GONE
            binding.recyclerView.visibility = if (hasCaptures) View.VISIBLE else View.GONE
            it.screenshots?.let { screenshots -> adapter.addData(screenshots) }
        }
    }
}
