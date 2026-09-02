package com.sosmartlabs.momotabletpadres.tabletsettings.dug.search_detection

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.core.content.res.ResourcesCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.chip.Chip
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.util.DetectionSeverityUtil
import com.sosmartlabs.momotabletpadres.databinding.SettingsFragmentDugDetectionSearchDetailBinding
import com.sosmartlabs.momotabletpadres.glide.loadAppIcon
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.UnsafeSearchViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class TabletDugSearchDetectionDetailFragment : Fragment() {

    private val viewModel: UnsafeSearchViewModel by activityViewModels()
    private lateinit var binding: SettingsFragmentDugDetectionSearchDetailBinding

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = SettingsFragmentDugDetectionSearchDetailBinding.inflate(inflater, container, false)
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
        binding.header.headerTitle.setText(R.string.dug_detail_header_search)
        binding.header.backButton.setOnClickListener { findNavController().navigateUp() }

        viewModel.currentSelectedSearch.observe(viewLifecycleOwner) { search ->
            search ?: return@observe

            // App icon
            val pkgName = search.detectedSearch.packageName
            if (pkgName != null) {
                viewModel.loadAppIconUrl(pkgName) { iconUrl ->
                    if (isAdded) {
                        binding.summaryCard.appIcon.loadAppIcon(iconUrl, search.appName)
                    }
                }
            }

            // Summary
            binding.summaryCard.appName.text = search.appName ?: ""
            binding.summaryCard.detectionDate.text = DateUtil.getFormattedDateTime(search.detectedSearch.date!!)

            // Category chip
            binding.summaryCard.chipGroup.removeAllViews()
            val (chipColor, chipLabel) = DetectionSeverityUtil.getUnsafeSearchCategoryChip(search.detectedSearch.category)
            binding.summaryCard.chipGroup.addView(createChip(chipLabel, chipColor))

            // Search text
            binding.searchText.text = "\"${search.name}\""

        }
    }

    private fun createChip(labelRes: Int, colorRes: Int): Chip {
        val density = resources.displayMetrics.density
        return Chip(requireContext()).apply {
            setText(labelRes)
            setChipBackgroundColorResource(colorRes)
            setTextColor(ContextCompat.getColor(context, R.color.white))
            textSize = 11f
            typeface = ResourcesCompat.getFont(context, R.font.poppins_semibold)
            chipMinHeight = resources.getDimension(R.dimen.vertical_margin_medium)
            isCheckable = false
            isClickable = false
            chipStartPadding = 8f * density
            chipEndPadding = 8f * density
            chipCornerRadius = resources.getDimension(R.dimen.horizontal_margin_small)
        }
    }
}
