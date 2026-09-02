package com.sosmartlabs.momo.installedapp.ui.fragment

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.InstalledAppFragmentListBinding
import com.sosmartlabs.momo.installedapp.model.InstalledAppListItem
import com.sosmartlabs.momo.installedapp.ui.InstalledAppAdapter
import com.sosmartlabs.momo.installedapp.ui.InstalledAppViewModel
import com.sosmartlabs.momo.utils.Resource
import timber.log.Timber
import java.util.Locale
import kotlin.getValue

class InstalledAppListFragment : Fragment() {

    private var _binding: InstalledAppFragmentListBinding? = null
    private val binding get() = checkNotNull(_binding)

    private val installedAppViewModel: InstalledAppViewModel by activityViewModels()
    private val installedAppAdapter by lazy {
        InstalledAppAdapter(::openInstalledAppDetails)
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = InstalledAppFragmentListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupEdgeToEdge()
        setToolbar()
        setupRecyclerView()
        setupSwipeRefresh()
        observeViewModel()
        if (installedAppViewModel.installedAppList.value?.data == null) {
            installedAppViewModel.getInstalledApps(Locale.getDefault().language)
        } else {
            renderInstalledApps(installedAppViewModel.installedAppList.value!!)
        }
    }

    private fun setupEdgeToEdge() {
        Timber.d("InstalledAppListFragment: setupEdgeToEdge")

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())

            Timber.d("InstalledAppListFragment: systemBars $systemBars")
            Timber.d("InstalledAppListFragment: displayCutout $displayCutout")

            // Apply top padding to AppBarLayout to extend colorPrimary background into status bar area
            binding.contentAppBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.contentAppBar.paddingBottom
            )

            windowInsets
        }
    }

    private fun setupRecyclerView() {
        binding.installedAppListRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = installedAppAdapter
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefreshLayout.setOnRefreshListener {
            installedAppViewModel.refreshInstalledApps()
        }
    }

    private fun observeViewModel() {
        installedAppViewModel.installedAppList.observe(viewLifecycleOwner, ::renderInstalledApps)
        installedAppViewModel.currentInstalledApp.observe(viewLifecycleOwner) { resource ->
            if (resource?.status == Resource.Status.UPDATING_ERROR ||
                resource?.status == Resource.Status.UNKNOWN_ERROR
            ) {
                Toast.makeText(
                    requireContext(),
                        getString(R.string.installed_app_detail_update_error),
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    private fun renderInstalledApps(resource: Resource<List<InstalledAppListItem>, Unit>) {
        when (resource.status) {
            Resource.Status.LOADING -> {
                if (installedAppAdapter.currentList.isEmpty()) {
                    binding.mainViewFlipper.displayedChild = VIEW_LOADING
                } else {
                    binding.mainViewFlipper.displayedChild = VIEW_CONTENT
                    binding.swipeRefreshLayout.isRefreshing = true
                }
            }

            Resource.Status.LOAD_SUCCESS -> {
                binding.swipeRefreshLayout.isRefreshing = false
                val installedApps = resource.data.orEmpty()
                installedAppAdapter.submitList(installedApps)
                if (installedApps.isEmpty()) {
                    showMessageState(
                        title = getString(R.string.installed_app_list_empty_title),
                        description = getString(R.string.installed_app_list_empty_description)
                    )
                } else {
                    binding.mainViewFlipper.displayedChild = VIEW_CONTENT
                }
            }

            Resource.Status.LOAD_ERROR,
            Resource.Status.UNKNOWN_ERROR -> {
                binding.swipeRefreshLayout.isRefreshing = false
                if (installedAppAdapter.currentList.isNotEmpty()) {
                    Toast.makeText(
                        requireContext(),
                        getString(R.string.installed_app_detail_loading_error),
                        Toast.LENGTH_SHORT
                    ).show()
                } else {
                    showMessageState(
                        title = getString(R.string.installed_app_list_error_title),
                        description = getString(R.string.installed_app_list_error_description)
                    )
                }
            }

            else -> Unit
        }
    }

    private fun showMessageState(title: String, description: String) {
        binding.emptyCardTitle.text = title
        binding.emptyCardDescription.text = description
        binding.mainViewFlipper.displayedChild = VIEW_MESSAGE
    }

    private fun openInstalledAppDetails(installedApp: InstalledAppListItem) {
        installedAppViewModel.setSelectedInstalledApp(installedApp.packageName)
        findNavController().navigate(
            R.id.action_installedAppListFragment_to_installedAppDetailFragment
        )
    }

    private fun setToolbar() {
        (requireActivity() as AppCompatActivity).setSupportActionBar(binding.toolbar)
        (requireActivity() as AppCompatActivity).supportActionBar?.apply {
            setDisplayShowTitleEnabled(true)
            setDisplayHomeAsUpEnabled(true)
            setDisplayShowHomeEnabled(true)
        }

        binding.toolbar.setNavigationOnClickListener {
            if (!findNavController().navigateUp()) {
                requireActivity().finish()
            }
        }
    }

    override fun onDestroyView() {
        binding.installedAppListRecyclerView.adapter = null
        _binding = null
        super.onDestroyView()
    }

    companion object {
        private const val VIEW_LOADING = 0
        private const val VIEW_CONTENT = 1
        private const val VIEW_MESSAGE = 2
    }
}
