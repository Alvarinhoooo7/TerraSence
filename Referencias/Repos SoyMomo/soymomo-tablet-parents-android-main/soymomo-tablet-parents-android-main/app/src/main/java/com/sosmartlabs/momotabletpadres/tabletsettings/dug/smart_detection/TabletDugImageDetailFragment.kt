package com.sosmartlabs.momotabletpadres.tabletsettings.dug.smart_detection

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.TabletFragmentDugImageDetailBinding
import com.sosmartlabs.momotabletpadres.glide.loadAppIcon
import com.sosmartlabs.momotabletpadres.glide.loadEncrypted
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.DugUnifiedViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class TabletDugImageDetailFragment : Fragment() {

    private lateinit var binding: TabletFragmentDugImageDetailBinding
    private val viewModel: DugUnifiedViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = TabletFragmentDugImageDetailBinding.inflate(inflater, container, false)
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
        binding.header.headerTitle.setText(R.string.dug_detail_header_image)
        binding.header.backButton.setOnClickListener { findNavController().navigateUp() }

        // Blur overlay — tap to reveal
        binding.blurOverlay.setOnClickListener {
            binding.blurOverlay.visibility = View.GONE
        }

        viewModel.selectedImageDetection.observe(viewLifecycleOwner) { imageDetection ->
            imageDetection ?: return@observe
            val firstDetection = imageDetection.detections.firstOrNull() ?: return@observe

            // App icon
            binding.summaryCard.appIcon.loadAppIcon(imageDetection.appIconUrl, firstDetection.appName)

            // Summary
            binding.summaryCard.appName.text = firstDetection.appName ?: ""
            binding.summaryCard.detectionDate.text = DateUtil.getFormattedDateTime(firstDetection.createdAt)

            // Screenshot
            Glide.with(requireContext())
                .loadEncrypted(firstDetection)
                .error(R.drawable.ic_action_app_hover)
                .placeholder(R.drawable.ic_action_app_hover)
                .into(binding.detectionScreenshot)

            // Group count
            if (imageDetection.groupCount > 1) {
                binding.groupCount.visibility = View.VISIBLE
                binding.groupCount.text = getString(R.string.dug_image_group_count, imageDetection.groupCount)
            } else {
                binding.groupCount.visibility = View.GONE
            }
        }
    }
}
