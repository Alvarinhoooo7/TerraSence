package com.sosmartlabs.momotabletpadres.tabletsettings.dug.music_detection

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.res.ResourcesCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.TableListState
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.ExplicitMusicDetectionAdapter
import com.sosmartlabs.momotabletpadres.databinding.SettingsFragmentDugDetectionMusicBinding
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.ExplicitMusicViewModel
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class TabletDugMusicDetectionFragment : Fragment() {
    private val tabletViewModel: TabletViewModel by activityViewModels()
    private val viewModel: ExplicitMusicViewModel by activityViewModels()
    private lateinit var currentTablet: Tablet

    lateinit var binding: SettingsFragmentDugDetectionMusicBinding

    private val explicitMusicDetectionAdapter = ExplicitMusicDetectionAdapter { selectedDetection ->
        viewModel.setSelectedDetection(selectedDetection)
        navigateToSongDetails()
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return SettingsFragmentDugDetectionMusicBinding.inflate(inflater, container, false).apply {
            binding = this
        }.root
    }

    private fun isFeatureEnabled(tablet: Tablet): Boolean = tablet.explicitMusicDetectionEnabled ?: false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("TabletDugMusicDetectionFragment: Setting up view components")

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

        Timber.d("TabletDugMusicDetectionFragment: View setup completed")
    }

    private fun setupRecyclerView() {
        Timber.d("TabletDugMusicDetectionFragment: Configuring RecyclerView with adapter and layout manager")
        with(binding.variableCard.recyclerView) {
            adapter = explicitMusicDetectionAdapter
            layoutManager = LinearLayoutManager(requireContext())
        }
    }

    private fun setupObservers() {
        Timber.d("TabletDugMusicDetectionFragment: Initializing view model observers")
        with(viewModel) {
            explicitMusicDetections.observe(viewLifecycleOwner) { detections ->
                Timber.d("TabletDugMusicDetectionFragment: Processing ${detections.size} music detections")
                explicitMusicDetectionAdapter.submitList(detections)
                binding.detectionSecondLine.text = getString(R.string.dug_detection_music, detections.size)
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
            Timber.d("TabletDugMusicDetectionFragment: Processing tablet update")
            currentTablet = tablet
            val featureEnabled = isFeatureEnabled(tablet)
            setupDisableMusicDetection(featureEnabled)
            viewModel.getExplicitMusicDetectionsWithTimeFilter(tablet, DateUtil.EVERYTHING)
        }
    }

    private fun navigateToSongDetails() {
        Timber.d("TabletDugMusicDetectionFragment: Navigating to song details screen")
        findNavController().navigate(R.id.action_tabletFragmentDugMusicDetection_to_tabletFragmentDugMusicDetectionDetail)
    }

    private fun setupDisableMusicDetection(isEnabled: Boolean) {
        Timber.d("TabletDugMusicDetectionFragment: Configuring music detection switch state: $isEnabled")
        with(binding.variableCard.statusSwitch) {
            isChecked = isEnabled
            setTextEnabled(isEnabled)
            trackTintList = if (isEnabled) {
                ResourcesCompat.getColorStateList(resources, R.color.colorChipMoviesSeries, null)
            } else {
                ResourcesCompat.getColorStateList(resources, R.color.colorChipVerySerious, null)
            }

            setOnClickListener {
                Timber.d("TabletDugMusicDetectionFragment: Music detection switch toggled to: $isChecked")
                setupDisableMusicDetection(isChecked)
                tabletViewModel.setMusicDetectionSystemStatus(isChecked)
            }
        }
    }

    private fun setTextEnabled(enabled: Boolean) {
        Timber.d("TabletDugMusicDetectionFragment: Updating status text for enabled state: $enabled")
        binding.variableCard.statusDescription.setText(
            if (enabled) R.string.settings_variable_status_enabled
            else R.string.settings_variable_status_disabled
        )
    }
}