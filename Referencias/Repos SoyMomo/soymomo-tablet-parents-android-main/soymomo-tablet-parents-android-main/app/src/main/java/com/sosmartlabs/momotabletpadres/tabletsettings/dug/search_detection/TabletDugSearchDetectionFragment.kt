package com.sosmartlabs.momotabletpadres.tabletsettings.dug.search_detection

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.res.ResourcesCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.TableListState
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.DetectedUnsafeSearchesAdapter
import com.sosmartlabs.momotabletpadres.databinding.SettingsFragmentDugDetectionSearchBinding
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.UnsafeSearchViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class TabletDugSearchDetectionFragment : Fragment() {
    private val viewModel: UnsafeSearchViewModel by activityViewModels()
    private val tabletViewModel: TabletViewModel by activityViewModels()
    private lateinit var currentTablet: Tablet

    private lateinit var binding: SettingsFragmentDugDetectionSearchBinding
    private lateinit var detectedUnsafeSearchesAdapter: DetectedUnsafeSearchesAdapter
    private lateinit var detectionsRecyclerView: RecyclerView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = SettingsFragmentDugDetectionSearchBinding.inflate(inflater, container, false)
        detectionsRecyclerView = binding.variableCard.recyclerView
        return binding.root
    }

    private fun isFeatureEnabled(tablet: Tablet): Boolean = tablet.unsafeSearchDetectionEnabled ?: false

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("TabletDugSearchDetectionFragment: Setting up view components")
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

        Timber.d("TabletDugSearchDetectionFragment: View setup completed")
    }

    private fun navigateToUnsafeSearchDetails() {
        Timber.d("TabletDugSearchDetectionFragment: Navigating to unsafe search details")
        findNavController().navigate(R.id.action_tabletFragmentDugSearchDetection_to_tabletFragmentDugSearchDetectionDetail)
    }


    private fun setupRecyclerView() {
        Timber.d("TabletDugSearchDetectionFragment: Configuring RecyclerView")
        with(binding.variableCard.recyclerView) {
            detectedUnsafeSearchesAdapter = DetectedUnsafeSearchesAdapter { selectedDetection ->
                Timber.d("TabletDugSearchDetectionFragment: User selected search detection item")
                viewModel.setCurrentSelectedSearch(selectedDetection)
                navigateToUnsafeSearchDetails()
            }
            adapter = detectedUnsafeSearchesAdapter
            layoutManager = LinearLayoutManager(requireContext())
        }
    }

    private fun setupObservers() {
        Timber.d("TabletDugSearchDetectionFragment: Setting up data observers")
        with(viewModel) {
            detectedSearches.observe(viewLifecycleOwner) { searches ->
                Timber.d("TabletDugSearchDetectionFragment: Updating UI with ${searches.size} detected searches")
                detectedUnsafeSearchesAdapter.submitList(searches)
                binding.detectionSecondLine.text = getString(R.string.dug_detection_search, searches.size)
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
            Timber.d("TabletDugSearchDetectionFragment: Current tablet updated")
            currentTablet = tablet
            setupDisableSearchDetection(isFeatureEnabled(tablet))
            loadDetections()
        }
    }

    private fun loadDetections() {
        Timber.d("TabletDugSmartDetectionFragment: Loading smart detections")
        viewModel.loadDetectedUnsafeSearchesWithFilter(currentTablet, DateUtil.EVERYTHING)
    }


    private fun setupDisableSearchDetection(isEnabled: Boolean) {
        Timber.d("TabletDugSearchDetectionFragment: Configuring search detection switch state: $isEnabled")
        with(binding.variableCard.statusSwitch) {
            isChecked = isEnabled
            setTextEnabled(isEnabled)
            trackTintList = if (isEnabled) {
                ResourcesCompat.getColorStateList(resources, R.color.colorChipMoviesSeries, null)
            } else {
                ResourcesCompat.getColorStateList(resources, R.color.colorChipVerySerious, null)
            }

            setOnClickListener {
                Timber.d("TabletDugSearchDetectionFragment: Search detection switch toggled to: $isChecked")
                setupDisableSearchDetection(isChecked)
                tabletViewModel.setSearchDetectionSystemStatus(isChecked)
            }
        }
    }

    private fun setTextEnabled(enabled: Boolean) {
        Timber.d("TabletDugSearchDetectionFragment: Updating status text for enabled state: $enabled")
        binding.variableCard.statusDescription.setText(
            if (enabled) R.string.settings_variable_status_enabled
            else R.string.settings_variable_status_disabled
        )
    }
}