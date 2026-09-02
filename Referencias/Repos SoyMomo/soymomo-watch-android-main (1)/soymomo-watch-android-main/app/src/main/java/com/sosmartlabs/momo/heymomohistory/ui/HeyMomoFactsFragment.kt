package com.sosmartlabs.momo.heymomohistory.ui

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import kotlinx.coroutines.launch
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentHeyMomoFactsBinding
import com.sosmartlabs.momo.heymomohistory.data.model.Fact
import com.sosmartlabs.momo.heymomohistory.ui.adapters.FactsAdapter
import com.sosmartlabs.momo.heymomohistory.ui.dialogs.AddEditFactDialogFragment
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.collapsingtoolbar.CollapsingToolbarUtils
import com.sosmartlabs.momo.utils.ui.setupFragmentEdgeToEdge
import com.sosmartlabs.momo.utils.extensions.hide
import com.sosmartlabs.momo.utils.extensions.show
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class HeyMomoFactsFragment : Fragment() {

    private var _binding: FragmentHeyMomoFactsBinding? = null
    private val binding get() = _binding!!
    
    private val heyMomoHistoryViewModel: HeyMomoHistoryViewModel by activityViewModels()
    
    private lateinit var adapter: FactsAdapter
    private lateinit var deviceId: String
    private lateinit var wearerId: String

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHeyMomoFactsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Get arguments
        deviceId = arguments?.getString("deviceId") ?: ""
        wearerId = arguments?.getString("wearerId") ?: ""

        Timber.d("HeyMomoFactsFragment: Arguments received - deviceId: $deviceId, wearerId: $wearerId")

        if (deviceId.isEmpty()) {
            Timber.e("HeyMomoFactsFragment: deviceId is empty!")
            showToast("Error: Missing device information")
            return
        }

        setupToolbar()
        setupFragmentEdgeToEdge(binding.appBarLayout)
        setupRecyclerView()
        setupSwipeRefreshLayout()
        setupButtons()
        observeViewModel()
        loadData()
    }

    private fun setupToolbar() {
        CollapsingToolbarUtils.setupToolbar(
            this,
            binding.toolbar,
            resources.getString(R.string.title_facts)
        )
    }

    private fun setupRecyclerView() {
        adapter = FactsAdapter(
            onEditClick = { fact -> showEditFactDialog(fact) },
            onDeleteClick = { fact -> showDeleteConfirmation(fact) }
        )
        binding.recyclerView.apply {
            adapter = this@HeyMomoFactsFragment.adapter
            layoutManager = LinearLayoutManager(requireContext())
        }
    }

    private fun setupSwipeRefreshLayout() {
        binding.swipeRefreshLayout.setOnRefreshListener {
            loadData()
        }
    }

    private fun setupButtons() {
        binding.buttonAddFact.setOnClickListener {
            showAddFactDialog()
        }
    }

    private fun observeViewModel() {
        // Observe facts list
        heyMomoHistoryViewModel.facts.observe(viewLifecycleOwner) { resource ->
            when (resource.status) {
                Resource.Status.LOADING -> {
                    Timber.d("Loading facts")
                    binding.viewFlipperFacts.displayedChild = 0
                }
                Resource.Status.LOAD_SUCCESS -> {
                    Timber.d("Facts loaded successfully: ${resource.data?.size ?: 0} items")
                    binding.swipeRefreshLayout.isRefreshing = false
                    
                    val facts = resource.data ?: emptyList()
                    if (facts.isEmpty()) {
                        binding.viewFlipperFacts.displayedChild = 1
                    } else {
                        binding.viewFlipperFacts.displayedChild = 2
                        adapter.submitList(facts)
                    }
                }
                Resource.Status.LOAD_ERROR -> {
                    Timber.e("Error loading facts")
                    binding.swipeRefreshLayout.isRefreshing = false
                    showToast(getString(R.string.error_loading_facts))
                    binding.viewFlipperFacts.displayedChild = 1
                }
                else -> {
                    // NO-OP
                }
            }
        }

        // Collect fact operations (add/update/delete) from SharedFlow
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                heyMomoHistoryViewModel.factOperation.collect { resource ->
                    when (resource.status) {
                        Resource.Status.LOADING -> {
                            Timber.d("Processing fact operation")
                        }
                        Resource.Status.LOAD_SUCCESS -> {
                            Timber.d("Fact operation successful")
                            showToast(getString(R.string.fact_saved_successfully))
                        }
                        Resource.Status.DELETING_SUCCESS -> {
                            Timber.d("Fact deleted successfully")
                            showToast(getString(R.string.fact_deleted_successfully))
                        }
                        Resource.Status.LOAD_ERROR, Resource.Status.DELETING_ERROR -> {
                            Timber.e("Error processing fact operation")
                            showToast(getString(R.string.error_processing_fact))
                        }
                        else -> {
                            // NO-OP
                        }
                    }
                }
            }
        }
    }

    private fun loadData() {
        Timber.d("Loading facts for deviceId: $deviceId")
        heyMomoHistoryViewModel.getFacts(deviceId)
    }

    private fun showAddFactDialog() {
        AddEditFactDialogFragment.newInstance(
            deviceId = deviceId,
            fact = null
        ).show(childFragmentManager, "AddFactDialog")
    }

    private fun showEditFactDialog(fact: Fact) {
        AddEditFactDialogFragment.newInstance(
            deviceId = deviceId,
            fact = fact
        ).show(childFragmentManager, "EditFactDialog")
    }

    private fun showDeleteConfirmation(fact: Fact) {
        AlertDialog.Builder(requireContext())
            .setTitle(R.string.delete_fact_title)
            .setMessage(getString(R.string.delete_fact_message, fact.objectValue))
            .setPositiveButton(R.string.delete) { _, _ ->
                fact.id?.let { factId ->
                    heyMomoHistoryViewModel.deleteFact(factId, deviceId)
                }
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun showToast(message: String) {
        Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}