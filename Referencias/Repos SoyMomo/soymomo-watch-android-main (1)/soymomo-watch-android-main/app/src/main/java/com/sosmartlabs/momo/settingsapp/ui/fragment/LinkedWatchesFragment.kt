package com.sosmartlabs.momo.settingsapp.ui.fragment

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.SettingsAppLinkedWatchesFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.settingsapp.ui.SettingsAppViewModel
import com.sosmartlabs.momo.settingsapp.ui.adapter.LinkedWatchesAdapter
import com.sosmartlabs.momo.utils.Constants.EXTRA_WEARER_ID
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.watchsettings.WatchSettingsActivity
import timber.log.Timber

class LinkedWatchesFragment : Fragment() {

    private lateinit var binding: SettingsAppLinkedWatchesFragmentBinding
    private lateinit var linkedWatchesAdapter: LinkedWatchesAdapter
    private val settingsAppViewModel: SettingsAppViewModel by activityViewModels()

    val toolbar: Toolbar get() = binding.toolbar
    private val toolbarTitle: String get() = getString(R.string.settings_app_my_linked_soymomo_title)

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("LinkedWatchesFragment: Creating view")
        CrashlyticsLog.log("LinkedWatchesFragment: Starting view creation")
        
        binding = SettingsAppLinkedWatchesFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("LinkedWatchesFragment: View created")
        CrashlyticsLog.log("LinkedWatchesFragment: View created - setting up components")
        
        setupToolbar()
        setupRecyclerView()
        observeViewModel()
    }

    private fun setupToolbar() {
        Timber.d("LinkedWatchesFragment: Setting up toolbar")
        CrashlyticsLog.log("LinkedWatchesFragment: Configuring toolbar")
        
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            window.statusBarColor =
                ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
            toolbar.setNavigationOnClickListener { 
                Timber.d("LinkedWatchesFragment: Navigation back pressed")
                CrashlyticsLog.log("LinkedWatchesFragment: User pressed back navigation")
                onBackPressed() 
            }
        }
    }

    private fun setupRecyclerView() {
        Timber.d("LinkedWatchesFragment: Setting up recycler view")
        CrashlyticsLog.log("LinkedWatchesFragment: Initializing linked watches adapter")
        
        linkedWatchesAdapter = LinkedWatchesAdapter { watchID ->
            Timber.d("LinkedWatchesFragment: Watch selected with ID: $watchID")
            CrashlyticsLog.log("LinkedWatchesFragment: User selected watch with ID: $watchID")
            navigateOnItemSelected(watchID)
        }

        with(binding.linkedWatchesRecyclerView) {
            adapter = linkedWatchesAdapter
            layoutManager = LinearLayoutManager(requireContext())
        }
    }

    private fun navigateOnItemSelected(watchId: String) {
        Timber.d("LinkedWatchesFragment: Navigating to watch settings for watch $watchId")
        CrashlyticsLog.log("LinkedWatchesFragment: Starting navigation to watch settings")
        
        val intent = Intent(requireContext(), WatchSettingsActivity::class.java).apply {
            putExtra(EXTRA_WEARER_ID, watchId)
        }
        startActivity(intent)
    }

    private fun observeViewModel() {
        Timber.d("LinkedWatchesFragment: Observing view model")
        CrashlyticsLog.log("LinkedWatchesFragment: Starting view model observation")
        
        settingsAppViewModel.currentWatchUsers.observe(viewLifecycleOwner) { resource ->
            Timber.d("LinkedWatchesFragment: Watch users resource received: ${resource.status}")
            CrashlyticsLog.log("LinkedWatchesFragment: Received watch users data with status: ${resource.status}")
            
            when (resource.status) {
                Resource.Status.LOADING -> {
                    Timber.d("LinkedWatchesFragment: Loading watch users")
                    CrashlyticsLog.log("LinkedWatchesFragment: Watch users data loading")
                }

                Resource.Status.LOAD_SUCCESS -> {
                    resource.data?.let { watchUsers ->
                        Timber.d("LinkedWatchesFragment: Successfully loaded ${watchUsers.size} watches")
                        CrashlyticsLog.log("LinkedWatchesFragment: Loaded ${watchUsers.size} watches successfully")
                        linkedWatchesAdapter.submitList(watchUsers)
                    }
                }

                Resource.Status.LOAD_ERROR -> {
                    Timber.d("LinkedWatchesFragment: Error loading watch users")
                    CrashlyticsLog.log("LinkedWatchesFragment: Failed to load watch users")
                }

                else -> {
                    Timber.d("LinkedWatchesFragment: Unknown resource status")
                    CrashlyticsLog.log("LinkedWatchesFragment: Received unknown resource status")
                }
            }
        }
    }
}