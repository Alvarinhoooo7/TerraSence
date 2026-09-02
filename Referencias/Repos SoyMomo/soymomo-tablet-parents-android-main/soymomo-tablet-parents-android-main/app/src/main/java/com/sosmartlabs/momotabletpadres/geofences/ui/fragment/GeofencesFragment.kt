package com.sosmartlabs.momotabletpadres.geofences.ui.fragment

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.GeofencesFragmentBinding
import com.sosmartlabs.momotabletpadres.geofences.model.Geofence
import com.sosmartlabs.momotabletpadres.geofences.ui.GeofenceViewModel
import com.sosmartlabs.momotabletpadres.geofences.ui.adapter.GeofenceListAdapter
import com.sosmartlabs.momotabletpadres.utils.Resource
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class GeofencesFragment : Fragment() {

    private val geofenceViewModel: GeofenceViewModel by activityViewModels()
    lateinit var binding: GeofencesFragmentBinding
    lateinit var adapter: GeofenceListAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        Timber.d("GeofencesFragment: Creating view")
        binding = GeofencesFragmentBinding.inflate(inflater, container, false)
        setupRecyclerView()
        setupButtons()
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("GeofencesFragment: View created, initializing components")
        setupToolbar()
        setupWindowInsets()
        observeGeofences()
    }

    private fun setupWindowInsets() {
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.buttonCreateGeofence,
            bottomAsMargin = true
        )
    }

    private fun setupToolbar() {
        Timber.d("GeofencesFragment: Setting up toolbar")
        (activity as AppCompatActivity).apply {
            setSupportActionBar(binding.toolbar)
            supportActionBar?.apply {
                setDisplayShowTitleEnabled(false)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
        }
        setHasOptionsMenu(true)
    }

    private fun setupRecyclerView() {
        Timber.d("GeofencesFragment: Initializing RecyclerView")
        adapter = GeofenceListAdapter(listOf()) { geofence ->
            Timber.d("GeofencesFragment: Geofence clicked: ${geofence.objectId}")
            editGeofence(geofence)
        }
        binding.recyclerView.apply {
            adapter = this@GeofencesFragment.adapter
            layoutManager = LinearLayoutManager(requireContext())
        }
    }

    private fun setupButtons() {
        Timber.d("GeofencesFragment: Setting up button click listeners")
        binding.buttonCreateGeofence.setOnClickListener {
            Timber.d("GeofencesFragment: Create geofence button clicked")
            createGeofence()
        }
    }

    private fun observeGeofences() {
        Timber.d("GeofencesFragment: Starting geofence observation")
        geofenceViewModel.geofences.observe(viewLifecycleOwner) { resource ->
            when (resource.status) {
                Resource.Status.LOADING -> {
                    Timber.d("GeofencesFragment: Loading geofences")
                    binding.viewFlipper.displayedChild = 0
                }
                Resource.Status.LOAD_SUCCESS -> {
                    Timber.d("GeofencesFragment: Successfully loaded ${resource.data?.size} geofences")
                    resource.data?.let { geofences ->
                        binding.viewFlipper.displayedChild = if (geofences.isEmpty()) 1 else 2
                        if (geofences.isNotEmpty()) {
                            adapter.updateData(geofences)
                        }
                    } ?: run {
                        binding.viewFlipper.displayedChild = 1
                    }
                }
                Resource.Status.LOAD_ERROR -> {
                    Timber.e("GeofencesFragment: Error loading geofences")
                    binding.viewFlipper.displayedChild = 1
                }
                else -> {
                    Timber.w("GeofencesFragment: Unhandled geofence status: ${resource.status}")
                }
            }
        }
    }

    private fun editGeofence(geofence: Geofence) {
        Timber.d("GeofencesFragment: Viewing geofence details: ${geofence.objectId}")
        geofenceViewModel.setSelectedGeofence(geofence)
        findNavController().navigate(R.id.action_geofencesFragment_to_geofenceDetailFragment)
    }

    private fun createGeofence() {
        Timber.d("GeofencesFragment: creating new geofence")
        geofenceViewModel.clearSelectedGeofence()
        findNavController().navigate(R.id.action_geofencesFragment_to_geofenceDetailFragment)
    }
}