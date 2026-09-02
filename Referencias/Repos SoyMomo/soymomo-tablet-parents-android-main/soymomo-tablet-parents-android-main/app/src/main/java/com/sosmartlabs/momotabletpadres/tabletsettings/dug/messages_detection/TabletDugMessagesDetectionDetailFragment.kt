package com.sosmartlabs.momotabletpadres.tabletsettings.dug.messages_detection

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.core.content.res.ResourcesCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.GridLayoutManager
import com.google.android.material.chip.Chip
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.SeverityLevel
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.util.DetectionSeverityUtil
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.ScreenshotsAdapter
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.helpers.ConversationDetectionItemHelper
import com.sosmartlabs.momotabletpadres.databinding.SettingsFragmentDugDetectionMessagesDetailBinding
import com.sosmartlabs.momotabletpadres.glide.loadAppIcon
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.ProfanityViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class TabletDugMessagesDetectionDetailFragment : Fragment() {

    private val viewModel: ProfanityViewModel by activityViewModels()
    private lateinit var binding: SettingsFragmentDugDetectionMessagesDetailBinding

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = SettingsFragmentDugDetectionMessagesDetailBinding.inflate(inflater, container, false)
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
        binding.header.headerTitle.setText(R.string.dug_detail_header_messages)
        binding.header.backButton.setOnClickListener { findNavController().navigateUp() }

        val adapter = ScreenshotsAdapter(requireContext())
        binding.recyclerView.layoutManager = GridLayoutManager(requireContext(), 3)
        binding.recyclerView.adapter = adapter

        viewModel.currentDetectedConversation.observe(viewLifecycleOwner) {
            // App icon
            val pkgName = it.detectedConversation.appName
            if (pkgName != null) {
                viewModel.loadAppIconUrl(pkgName) { iconUrl ->
                    if (isAdded) {
                        binding.summaryCard.appIcon.loadAppIcon(iconUrl, it.name)
                    }
                }
            }

            // Summary
            binding.summaryCard.appName.text = it.name
            binding.summaryCard.detectionDate.text = DateUtil.getFormattedDateTime(it.detectedConversation.date!!)

            // Chips
            binding.summaryCard.chipGroup.removeAllViews()

            val severity = DetectionSeverityUtil.getProfanityLevel(
                it.detectedConversation.totalProfanityScore ?: 0.0,
                it.detectedConversation.totalGroomingScore ?: 0.0
            )
            if (severity != SeverityLevel.NONE) {
                binding.summaryCard.chipGroup.addView(
                    createChip(
                        DetectionSeverityUtil.getSeverityChipStringRes(severity),
                        DetectionSeverityUtil.getSeverityChipColorRes(severity)
                    )
                )
            }

            if (ConversationDetectionItemHelper.getCyberbullyingChipVisibility(it) == View.VISIBLE) {
                binding.summaryCard.chipGroup.addView(
                    createChip(R.string.dug_cyberbullying_label, R.color.colorChipCyberbullying)
                )
            }

            if (ConversationDetectionItemHelper.getGroomingChipVisibility(it) == View.VISIBLE) {
                binding.summaryCard.chipGroup.addView(
                    createChip(R.string.dug_grooming_label, R.color.colorChipGrooming)
                )
            }

            // Message text
            val firstMessage = it.detectedConversation.logEntries.firstOrNull()?.message
            binding.messageText.text = if (!firstMessage.isNullOrBlank()) "\"$firstMessage\"" else ""

            // Captures
            val hasCaptures = it.screenshots != null
            binding.capturesTitle.visibility = if (hasCaptures) View.VISIBLE else View.GONE
            binding.recyclerView.visibility = if (hasCaptures) View.VISIBLE else View.GONE
            it.screenshots?.let { screenshots -> adapter.addData(screenshots) }
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
