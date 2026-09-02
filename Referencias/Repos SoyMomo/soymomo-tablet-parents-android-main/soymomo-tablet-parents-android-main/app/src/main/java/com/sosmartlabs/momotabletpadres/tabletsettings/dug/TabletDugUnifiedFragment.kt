package com.sosmartlabs.momotabletpadres.tabletsettings.dug

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.TableListState
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.DetectionFilter
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.UnifiedDetectionItem
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.UnifiedDetectionAdapter
import com.sosmartlabs.momotabletpadres.databinding.TabletFragmentDugUnifiedBinding
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.DugUnifiedViewModel
import com.sosmartlabs.momotabletpadres.viewmodels.ExplicitMusicViewModel
import com.sosmartlabs.momotabletpadres.viewmodels.MoodSearchesViewModel
import com.sosmartlabs.momotabletpadres.viewmodels.ProfanityViewModel
import com.sosmartlabs.momotabletpadres.viewmodels.UnsafeSearchViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class TabletDugUnifiedFragment : Fragment() {

    private lateinit var binding: TabletFragmentDugUnifiedBinding
    private lateinit var adapter: UnifiedDetectionAdapter

    private val dugUnifiedViewModel: DugUnifiedViewModel by activityViewModels()
    private val tabletViewModel: TabletViewModel by activityViewModels()

    // Activity-scoped ViewModels for detail fragment data sharing
    private val profanityViewModel: ProfanityViewModel by activityViewModels()
    private val moodViewModel: MoodSearchesViewModel by activityViewModels()
    private val searchViewModel: UnsafeSearchViewModel by activityViewModels()
    private val musicViewModel: ExplicitMusicViewModel by activityViewModels()

    private var pendingScrollToTop = false

    companion object {
        private const val VIEW_POPULATED = 0
        private const val VIEW_EMPTY = 1
        private const val VIEW_LOADING = 2
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = TabletFragmentDugUnifiedBinding.inflate(inflater, container, false)
        setupRecyclerView()
        setupFilterChips()
        setupBackButton()
        setupMonitoringBadge()
        setupObservers()
        return binding.root
    }

    override fun onResume() {
        super.onResume()
        activity?.findViewById<View>(android.R.id.content)?.rootView
            ?.setBackgroundColor(ContextCompat.getColor(requireContext(), R.color.colorPrimary))
    }

    override fun onPause() {
        super.onPause()
        activity?.findViewById<View>(android.R.id.content)?.rootView
            ?.setBackgroundColor(ContextCompat.getColor(requireContext(), R.color.white))
    }

    private fun setupRecyclerView() {
        adapter = UnifiedDetectionAdapter { item -> onDetectionClicked(item) }
        val layoutManager = LinearLayoutManager(requireContext())
        binding.unifiedRecyclerView.layoutManager = layoutManager
        binding.unifiedRecyclerView.adapter = adapter
        // Push the fixed-height purple hero header below the status bar (as MARGIN so
        // its 80dp content isn't compressed; the root is colorPrimary, so the
        // status-bar strip stays purple) and pad the list clear of the navigation bar.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.header,
            topAsMargin = true,
            bottomView = binding.unifiedRecyclerView,
            extraTopPx = resources.getDimensionPixelSize(R.dimen.horizontal_margin_small),
        )

        binding.unifiedRecyclerView.addOnScrollListener(object : androidx.recyclerview.widget.RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: androidx.recyclerview.widget.RecyclerView, dx: Int, dy: Int) {
                if (dy <= 0) return
                val lastVisible = layoutManager.findLastVisibleItemPosition()
                val totalItems = layoutManager.itemCount
                if (lastVisible >= totalItems - 5
                    && dugUnifiedViewModel.isLoadingMore.value != true
                    && !dugUnifiedViewModel.allSourcesExhausted
                ) {
                    dugUnifiedViewModel.loadMore()
                }
            }
        })
    }

    private fun setupFilterChips() {
        val currentFilter = dugUnifiedViewModel.activeFilter.value ?: DetectionFilter.ALL
        binding.filterChipGroup.check(filterToChipId(currentFilter))

        binding.filterChipGroup.setOnCheckedStateChangeListener { _, checkedIds ->
            val filter = when {
                checkedIds.contains(R.id.chip_all) -> DetectionFilter.ALL
                checkedIds.contains(R.id.chip_images) -> DetectionFilter.IMAGES
                checkedIds.contains(R.id.chip_messages) -> DetectionFilter.MESSAGES
                checkedIds.contains(R.id.chip_searches) -> DetectionFilter.SEARCHES
                checkedIds.contains(R.id.chip_mood) -> DetectionFilter.MOOD
                checkedIds.contains(R.id.chip_music) -> DetectionFilter.MUSIC
                else -> DetectionFilter.ALL
            }
            pendingScrollToTop = true
            dugUnifiedViewModel.setFilter(filter)
        }
    }

    private fun filterToChipId(filter: DetectionFilter): Int = when (filter) {
        DetectionFilter.ALL -> R.id.chip_all
        DetectionFilter.IMAGES -> R.id.chip_images
        DetectionFilter.MESSAGES -> R.id.chip_messages
        DetectionFilter.SEARCHES -> R.id.chip_searches
        DetectionFilter.MOOD -> R.id.chip_mood
        DetectionFilter.MUSIC -> R.id.chip_music
    }

    private fun setupBackButton() {
        binding.backButton.setOnClickListener {
            findNavController().navigateUp()
        }
    }

    private fun setupMonitoringBadge() {
        binding.monitoringBadge.setOnClickListener {
            MonitoringStatusBottomSheet()
                .show(childFragmentManager, MonitoringStatusBottomSheet.TAG)
        }
    }

    private fun setupObservers() {
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            tablet?.let {
                Timber.d("TabletDugUnifiedFragment: Tablet loaded, starting detection load")
                dugUnifiedViewModel.loadAllDetections(it)
            }
        }

        dugUnifiedViewModel.filteredDetections.observe(viewLifecycleOwner) { detections ->
            adapter.submitList(detections) {
                if (pendingScrollToTop) {
                    binding.unifiedRecyclerView.scrollToPosition(0)
                    pendingScrollToTop = false
                }
            }
        }

        dugUnifiedViewModel.tableListState.observe(viewLifecycleOwner) { state ->
            binding.viewFlipper.displayedChild = when (state) {
                TableListState.Populated -> VIEW_POPULATED
                TableListState.Empty -> {
                    updateEmptyState()
                    VIEW_EMPTY
                }
                TableListState.Loading -> VIEW_LOADING
                TableListState.Error -> VIEW_EMPTY
                else -> VIEW_LOADING
            }
        }

        dugUnifiedViewModel.totalCount.observe(viewLifecycleOwner) { count ->
            binding.heroCount.text = getString(R.string.dug_unified_detections_count, count)
        }

        dugUnifiedViewModel.featureStates.observe(viewLifecycleOwner) { features ->
            val activeCount = features.count { it.enabled }
            binding.monitoringBadge.text = getString(
                R.string.dug_monitoring_badge, activeCount, features.size
            )
        }
    }

    private fun onDetectionClicked(item: UnifiedDetectionItem) {
        try {
            when (item) {
                is UnifiedDetectionItem.MessageDetection -> {
                    profanityViewModel.setCurrentConversationDirect(item.conversation)
                    profanityViewModel.loadCurrentDetectedConversation(item.conversation)
                    findNavController().navigate(R.id.action_tabletFragmentDugUnified_to_tabletFragmentDugMessagesDetectionDetail)
                }
                is UnifiedDetectionItem.MoodItem -> {
                    moodViewModel.setCurrentSelectedDetection(item.moodDetection)
                    findNavController().navigate(R.id.action_tabletFragmentDugUnified_to_tabletFragmentDugMoodDetectionDetail)
                }
                is UnifiedDetectionItem.SearchDetection -> {
                    searchViewModel.setCurrentSelectedSearch(item.search)
                    findNavController().navigate(R.id.action_tabletFragmentDugUnified_to_tabletFragmentDugSearchDetectionDetail)
                }
                is UnifiedDetectionItem.MusicItem -> {
                    musicViewModel.setSelectedDetection(item.musicDetection)
                    findNavController().navigate(R.id.action_tabletFragmentDugUnified_to_tabletFragmentDugMusicDetectionDetail)
                }
                is UnifiedDetectionItem.ImageDetection -> {
                    dugUnifiedViewModel.setSelectedImageDetection(item)
                    findNavController().navigate(R.id.action_tabletFragmentDugUnified_to_tabletFragmentDugImageDetail)
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "TabletDugUnifiedFragment: Navigation error")
        }
    }

    private fun updateEmptyState() {
        val filter = dugUnifiedViewModel.activeFilter.value ?: DetectionFilter.ALL
        val (titleRes, subtitleRes) = when (filter) {
            DetectionFilter.ALL -> R.string.dug_empty_all_title to R.string.dug_empty_all_subtitle
            DetectionFilter.IMAGES -> R.string.dug_empty_images_title to R.string.dug_empty_images_subtitle
            DetectionFilter.MESSAGES -> R.string.dug_empty_messages_title to R.string.dug_empty_messages_subtitle
            DetectionFilter.SEARCHES -> R.string.dug_empty_searches_title to R.string.dug_empty_searches_subtitle
            DetectionFilter.MOOD -> R.string.dug_empty_mood_title to R.string.dug_empty_mood_subtitle
            DetectionFilter.MUSIC -> R.string.dug_empty_music_title to R.string.dug_empty_music_subtitle
        }
        binding.viewNoDetections.emptyTitle.setText(titleRes)
        binding.viewNoDetections.emptySubtitle.setText(subtitleRes)
    }
}
