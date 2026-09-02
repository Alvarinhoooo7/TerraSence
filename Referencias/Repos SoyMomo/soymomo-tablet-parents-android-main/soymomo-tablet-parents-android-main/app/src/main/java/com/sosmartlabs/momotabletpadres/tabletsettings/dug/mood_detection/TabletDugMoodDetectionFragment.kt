package com.sosmartlabs.momotabletpadres.tabletsettings.dug.mood_detection

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
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.SettingsConstants.TABLET_OBJECT_EXTRA
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.TableListState
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.MoodDetectionAdapter
import com.sosmartlabs.momotabletpadres.databinding.SettingsFragmentDugDetectionMoodBinding
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.MoodSearchesViewModel
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class TabletDugMoodDetectionFragment : Fragment() {
    private val tabletViewModel: TabletViewModel by activityViewModels()
    private val viewModel: MoodSearchesViewModel by activityViewModels()
    private lateinit var currentTablet: Tablet
    private lateinit var binding: SettingsFragmentDugDetectionMoodBinding

    private val moodDetectionAdapter = MoodDetectionAdapter {
        viewModel.setCurrentSelectedDetection(it)
        navigateToScreenshotsView()
    }

    private fun isFeatureEnabled(tablet: Tablet): Boolean = tablet.moodDetectionEnabled ?: false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        (arguments?.getParcelable(TABLET_OBJECT_EXTRA) as Tablet?)?.let {
            tabletViewModel.setCurrentTablet(it)
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View {
        binding = SettingsFragmentDugDetectionMoodBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("TabletDugMoodDetectionFragment: Starting view creation")

        setupRecyclerView()
        setupObservers()
        // Reserve the status bar for the purple hero area (top padding on the
        // colorPrimary root keeps the strip seamless) and keep the bottom description
        // clear of the navigation bar.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.root,
            bottomView = binding.variableCard.variableBottomExtraDescription,
            bottomAsMargin = true,
        )

        Timber.d("TabletDugMoodDetectionFragment: View creation completed")
    }

    private fun setupRecyclerView() {
        Timber.d("TabletDugMoodDetectionFragment: Configuring RecyclerView")
        with(binding.variableCard.recyclerView) {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = moodDetectionAdapter
        }
    }

    private fun setupObservers() {
        Timber.d("TabletDugMoodDetectionFragment: Initializing observers")
        observeViewModel()
        observeTabletViewModel()
    }

    private fun observeViewModel() {
        with(viewModel) {
            moodDetections.observe(viewLifecycleOwner) { detections ->
                Timber.d("TabletDugMoodDetectionFragment: Processing ${detections.size} mood detections")
                moodDetectionAdapter.submitList(detections)
                binding.detectionSecondLine.text = getString(R.string.dug_detection_mood, detections.size)
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
    }

    private fun observeTabletViewModel() {
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("TabletDugMoodDetectionFragment: Processing tablet update")
            currentTablet = tablet
            setupDisableMoodDetection(isFeatureEnabled(tablet))
            viewModel.getMoodDetectionsWithTimeFilter(currentTablet)
        }
    }

    private fun setTextEnabled(enabled: Boolean) {
        Timber.d("TabletDugMoodDetectionFragment: Updating status text to ${if (enabled) "enabled" else "disabled"}")
        binding.variableCard.statusDescription.setText(
            if (enabled) R.string.settings_variable_status_enabled
            else R.string.settings_variable_status_disabled
        )
    }

    private fun setupDisableMoodDetection(isEnabled: Boolean) {
        Timber.d("TabletDugMoodDetectionFragment: Configuring mood detection switch - enabled: $isEnabled")
        with(binding.variableCard.statusSwitch) {
            isChecked = isEnabled
            setTextEnabled(isEnabled)
            trackTintList = if (isEnabled) {
                ResourcesCompat.getColorStateList(resources, R.color.colorChipMoviesSeries, null)
            } else {
                ResourcesCompat.getColorStateList(resources, R.color.colorChipVerySerious, null)
            }

            setOnClickListener {
                Timber.d("TabletDugMoodDetectionFragment: Mood detection switch toggled to: $isChecked")
                setupDisableMoodDetection(isChecked)
                tabletViewModel.setMoodDetectionSystemStatus(isChecked)
            }
        }
    }

    private fun navigateToScreenshotsView() {
        Timber.d("TabletDugMoodDetectionFragment: Navigating to mood detection detail screen")
        findNavController().navigate(R.id.action_tabletFragmentDugMoodDetection_to_tabletFragmentDugMoodDetectionDetail)
    }

}