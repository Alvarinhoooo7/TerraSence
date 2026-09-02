package com.sosmartlabs.momotabletpadres.tabletsettings.dug.smart_detection

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.res.ResourcesCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.TableListState
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.SmartDetectionAdapter
import com.sosmartlabs.momotabletpadres.glide.EncryptedParseFile
import com.sosmartlabs.momotabletpadres.core.settings.dug.smartdetection.model.DisplayedSmartDetection
import com.stfalcon.imageviewer.StfalconImageViewer
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.databinding.SettingsFragmentDugDetectionImagesBinding
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.SmartDetectionViewModel
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class TabletDugSmartDetectionFragment : Fragment() {
    private val viewModel: SmartDetectionViewModel by activityViewModels()
    private val tabletViewModel: TabletViewModel by activityViewModels()
    private lateinit var currentTablet: Tablet

    private lateinit var binding: SettingsFragmentDugDetectionImagesBinding

    private lateinit var detectionsAdapter : SmartDetectionAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View {
        return SettingsFragmentDugDetectionImagesBinding.inflate(inflater, container, false)
            .apply {
                binding = this
            }.root
    }

    private fun isFeatureEnabled(tablet: Tablet): Boolean = tablet.smartDetectionEnabled ?: false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("TabletDugSmartDetectionFragment: Setting up view components")

        setupRecyclerView()
        setupObservers()
        // Reserve the status bar for the purple hero area (top padding on the
        // colorPrimary root keeps the strip seamless) and keep the bottom description
        // clear of the navigation bar.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.root,
            bottomView = binding.variableCard.variableBottomDescription,
            bottomAsMargin = true,
        )
        Timber.d("TabletDugSmartDetectionFragment: View setup completed successfully")
    }

    private fun setupRecyclerView() {
        Timber.d("TabletDugSmartDetectionFragment: Configuring RecyclerView with SmartDetectionAdapter")
        detectionsAdapter = SmartDetectionAdapter(viewModel, viewLifecycleOwner) { selectedList ->
            Timber.i("TabletDugSmartDetectionFragment: group clicked, items=${selectedList.size}, id=${selectedList.firstOrNull()?.objectId}")
            val first = selectedList.firstOrNull()
            if (first != null) {
                showFullScreenForDetection(first)
            }
        }
        with(binding.variableCard.recyclerView) {
            adapter = detectionsAdapter
            layoutManager = LinearLayoutManager(requireContext())
        }
    }

    private fun showFullScreenForDetection(detection: DisplayedSmartDetection) {
        Timber.d("TabletDugSmartDetectionFragment: showFullScreenForDetection isEncrypted=${detection.isEncrypted}")
        if (detection.isEncrypted && detection.encryptedScreenshotFile != null && detection.encryptedMetadata != null) {
            val encryptedModel = EncryptedParseFile(
                parseFile = detection.encryptedScreenshotFile!!,
                metadata = detection.encryptedMetadata!!,
                cacheKey = "fullscreen_detection_${detection.createdAt.time}_${detection.objectId}"
            )
            StfalconImageViewer.Builder(requireContext(), listOf(encryptedModel)) { view, model ->
                Glide.with(requireContext().applicationContext)
                    .load(model)
                    .error(R.drawable.ic_action_app_hover)
                    .into(view)
            }
                .withHiddenStatusBar(true)
                .show()
        } else {
            StfalconImageViewer.Builder(requireContext(), arrayOf(detection.screenshot ?: "")) { view, url ->
                Glide.with(requireContext().applicationContext)
                    .load(url)
                    .error(R.drawable.ic_action_app_hover)
                    .into(view)
            }
                .withHiddenStatusBar(true)
                .show()
        }
    }

    private fun setupObservers() {
        Timber.d("TabletDugSmartDetectionFragment: Initializing ViewModel observers")
        with(viewModel) {
            smartDetectionsGrouped.observe(viewLifecycleOwner) { detections ->
                Timber.d("TabletDugSmartDetectionFragment: Processing ${detections.size} smart detections")
                detectionsAdapter.submitList(detections)
                binding.detectionSecondLine.text =
                    getString(R.string.dug_detection_images, detections.size)
            }
            tableListState.observe(viewLifecycleOwner) { state ->
                Timber.d("TabletDugSmartDetectionFragment: Updating view state to $state")
                when (state) {
                    TableListState.Error -> {
                        binding.variableCard.viewFlipperDetections.displayedChild = 1
                    }

                    TableListState.Empty -> {
                        binding.variableCard.viewFlipperDetections.displayedChild = 1
                    }

                    TableListState.Populated -> {
                        binding.variableCard.viewFlipperDetections.displayedChild = 0
                    }

                    TableListState.Loading -> {
                        binding.variableCard.viewFlipperDetections.displayedChild = 2
                    }
                }
            }
        }

        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("TabletDugSmartDetectionFragment: Updating tablet configuration")
            currentTablet = tablet
            setupDisableSmartDetection(isFeatureEnabled(tablet))
            loadDetections()
        }
    }

    private fun loadDetections() {
        Timber.d("TabletDugSmartDetectionFragment: Loading smart detections")
        viewModel.getSmartDetectionsWithTimeFilter(currentTablet, DateUtil.EVERYTHING)
    }

    private fun setTextEnabled(enabled: Boolean) {
        Timber.d("TabletDugSmartDetectionFragment: Updating status text to ${if (enabled) "enabled" else "disabled"}")
        binding.variableCard.statusDescription.setText(
            if (enabled) R.string.settings_variable_status_enabled
            else R.string.settings_variable_status_disabled
        )
    }

    private fun setupDisableSmartDetection(isEnabled: Boolean) {
        Timber.d("TabletDugSmartDetectionFragment: Configuring smart detection switch state: $isEnabled")
        with(binding.variableCard.statusSwitch) {
            isChecked = isEnabled
            setTextEnabled(isEnabled)
            trackTintList = if (isEnabled) {
                ResourcesCompat.getColorStateList(resources, R.color.colorChipMoviesSeries, null)
            } else {
                ResourcesCompat.getColorStateList(resources, R.color.colorChipVerySerious, null)
            }

            setOnClickListener {
                Timber.d("TabletDugSmartDetectionFragment: Smart detection state changed to: $isChecked")
                setupDisableSmartDetection(isChecked)
                tabletViewModel.setSmartDetectionSystemStatus(isChecked)
            }
        }
    }
}