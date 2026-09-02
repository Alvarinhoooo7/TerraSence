package com.sosmartlabs.momotabletpadres.tabletsettings.dug.messages_detection

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
import com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.model.DisplayedDetectedConversation
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.DetectedConversationAdapter
import com.sosmartlabs.momotabletpadres.databinding.SettingsFragmentDugDetectionMessagesBinding
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.ProfanityViewModel
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class TabletDugMessagesDetectionFragment : Fragment() {
    private val viewModel: ProfanityViewModel by activityViewModels()
    private val tabletViewModel: TabletViewModel by activityViewModels()
    private lateinit var currentTablet: Tablet

    lateinit var binding: SettingsFragmentDugDetectionMessagesBinding
    private lateinit var detectedConversationAdapter: DetectedConversationAdapter
    private var shouldDisplayConversationDetails = false

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = SettingsFragmentDugDetectionMessagesBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
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
    }

    private fun setupRecyclerView() {
        Timber.d("TabletDugMessagesDetectionFragment: Initializing RecyclerView with DetectedConversationAdapter")
        detectedConversationAdapter = DetectedConversationAdapter(requireContext()) { conversation ->
            Timber.d("TabletDugMessagesDetectionFragment: Conversation clicked with ID: $conversation")
            shouldDisplayConversationDetails = true
            viewModel.loadCurrentDetectedConversation(conversation)
        }

        binding.variableCard.recyclerView.apply {
            adapter = detectedConversationAdapter
            layoutManager = LinearLayoutManager(requireContext())
        }
    }

    private fun setupObservers() {
        Timber.d("TabletDugMessagesDetectionFragment: Setting up tablet observer")
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("TabletDugMessagesDetectionFragment: Current tablet updated with ID: ${tablet.id}")
            currentTablet = tablet
            val featureEnabled = isFeatureEnabled(currentTablet)
            setupDisableProfanityDetection(featureEnabled)
            viewModel.loadDetectedConversationsWithFilter(currentTablet, DateUtil.EVERYTHING)
        }

        with(viewModel) {
            detectedConversations.observe(viewLifecycleOwner) {
                binding.detectionSecondLine.text = getString(R.string.dug_detection_messages, it.size)
                detectedConversationAdapter.submitList(it)
            }
            currentDetectedConversation.observe(viewLifecycleOwner) {
                if (shouldDisplayConversationDetails) openProfanityDetails(it)
                shouldDisplayConversationDetails = false
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

    fun isFeatureEnabled(tablet: Tablet): Boolean = tablet.profanityDetectionEnabled ?: false

    private fun setTextEnabled(enabled: Boolean) {
        Timber.d("TabletDugMessagesDetectionFragment: Updating status description - enabled: $enabled")
        binding.variableCard.statusDescription.setText(
            if (enabled) R.string.settings_variable_status_enabled
            else R.string.settings_variable_status_disabled
        )
    }

    private fun setupDisableProfanityDetection(isEnabled: Boolean) {
        Timber.d("TabletDugMessagesDetectionFragment: Configuring profanity detection switch - enabled: $isEnabled")
        with(binding.variableCard.statusSwitch) {
            isChecked = isEnabled
            setTextEnabled(isEnabled)
            trackTintList = if (isEnabled) {
                ResourcesCompat.getColorStateList(resources, R.color.colorChipMoviesSeries, null)
            } else {
                ResourcesCompat.getColorStateList(resources, R.color.colorChipVerySerious, null)
            }

            setOnClickListener {
                Timber.d("TabletDugMessagesDetectionFragment: Profanity detection switch toggled to: $isChecked")
                setupDisableProfanityDetection(isChecked)
                tabletViewModel.setProfanityDetectionSystemStatus(isChecked)
            }
        }
    }

    private fun openProfanityDetails(detectedConversation: DisplayedDetectedConversation) {
        Timber.d("TabletDugMessagesDetectionFragment: Navigating to profanity details for conversation: $detectedConversation")
        findNavController().navigate(R.id.action_tabletFragmentDugMessagesDetection_to_tabletFragmentDugMessagesDetectionDetail)
    }

}