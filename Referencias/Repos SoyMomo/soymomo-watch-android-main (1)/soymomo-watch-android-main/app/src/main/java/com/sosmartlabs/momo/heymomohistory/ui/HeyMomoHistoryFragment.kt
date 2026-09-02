package com.sosmartlabs.momo.heymomohistory.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentHeyMomoHistoryBinding
import com.sosmartlabs.momo.heymomohistory.ui.adapters.HeyMomoHistoryResponsesAdapter
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.collapsingtoolbar.CollapsingToolbarUtils
import com.sosmartlabs.momo.utils.ui.setupFragmentEdgeToEdge
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class HeyMomoHistoryFragment : Fragment() {

    private var _binding: FragmentHeyMomoHistoryBinding? = null
    private val binding get() = _binding!!
    
    private val heyMomoHistoryViewModel: HeyMomoHistoryViewModel by activityViewModels()
    
    private lateinit var adapter: HeyMomoHistoryResponsesAdapter
    private lateinit var deviceId: String
    private lateinit var wearerId: String

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHeyMomoHistoryBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Get arguments
        deviceId = arguments?.getString("deviceId") ?: ""
        wearerId = arguments?.getString("wearerId") ?: ""

        Timber.d("HeyMomoHistoryFragment: Arguments received - deviceId: $deviceId, wearerId: $wearerId")

        if (deviceId.isEmpty()) {
            Timber.e("HeyMomoHistoryFragment: deviceId is empty!")
            return
        }

        setupToolbar()
        setupFragmentEdgeToEdge(binding.contentAppBar)
        setupRecyclerView()
        setupSwipeRefreshLayout()
        observeViewModel()
        loadData()
    }

    private fun setupToolbar() {
        CollapsingToolbarUtils.setupToolbar(
            this,
            binding.toolbar,
            resources.getString(R.string.title_heymomo_history)
        )
    }

    private fun setupRecyclerView() {
        adapter = HeyMomoHistoryResponsesAdapter()
        val linearLayoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.apply {
            adapter = this@HeyMomoHistoryFragment.adapter
            layoutManager = linearLayoutManager
            // Load older pages as the user nears the bottom (no-op once history is exhausted).
            addOnScrollListener(object : RecyclerView.OnScrollListener() {
                override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                    if (dy <= 0) return
                    val totalItemCount = linearLayoutManager.itemCount
                    val lastVisibleItem = linearLayoutManager.findLastVisibleItemPosition()
                    if (totalItemCount > 0 && lastVisibleItem >= totalItemCount - LOAD_MORE_THRESHOLD) {
                        heyMomoHistoryViewModel.loadMoreHeyMomoHistory(deviceId)
                    }
                }
            })
        }
    }

    private fun setupSwipeRefreshLayout() {
        binding.swipeRefreshLayout.setOnRefreshListener {
            loadData()
        }
    }

    private fun observeViewModel() {
        heyMomoHistoryViewModel.heyMomoHistory.observe(viewLifecycleOwner) { resource ->
            when (resource.status) {
                Resource.Status.LOADING -> {
                    Timber.d("Loading data")
                    binding.mainViewFlipper.displayedChild = 0
                }
                Resource.Status.LOAD_SUCCESS -> {
                    Timber.d("Data loaded successfully")
                    if (resource.data.isNullOrEmpty()) {
                        binding.mainViewFlipper.displayedChild = 3
                        binding.swipeRefreshLayout.isRefreshing = false
                        return@observe
                    }
                    adapter.submitList(resource.data)
                    binding.mainViewFlipper.displayedChild = 1
                    binding.swipeRefreshLayout.isRefreshing = false
                }
                Resource.Status.LOAD_ERROR -> {
                    Timber.e("Error loading data")
                    binding.mainViewFlipper.displayedChild = 2
                    binding.swipeRefreshLayout.isRefreshing = false
                }
                else -> {
                    // NO-OP
                }
            }
        }
    }

    private fun loadData() {
        Timber.d("Loading data for deviceId: $deviceId")
        heyMomoHistoryViewModel.getHeyMomoHistory(deviceId)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        // Trigger the next page when this many rows from the bottom.
        private const val LOAD_MORE_THRESHOLD = 5
    }
}