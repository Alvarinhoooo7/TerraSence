package com.sosmartlabs.momo.geofences.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentGeofencesBinding
import com.sosmartlabs.momo.geofences.model.Geofence
import com.sosmartlabs.momo.geofences.ui.adapters.GeofenceListAdapter
import com.sosmartlabs.momo.utils.collapsingtoolbar.CollapsingToolbarUtils
import com.sosmartlabs.momo.utils.extensions.hide
import com.sosmartlabs.momo.utils.extensions.show
import com.sosmartlabs.momo.utils.ui.activityindicator.ActivityIndicatorDialogFragment
import timber.log.Timber


class GeofencesFragment : Fragment() {

    private val mGeofenceViewModel: GeofenceViewModel by activityViewModels()
    lateinit var binding: FragmentGeofencesBinding
    lateinit var adapter: GeofenceListAdapter
    private val navigationDirection = R.id.action_geofencesFragment_to_geofenceViewFragment

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        binding = FragmentGeofencesBinding.inflate(
            inflater, container, false)
        setRecyclerView()
        setButtons()
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupGeofencesObserver()
        if (mGeofenceViewModel.geofences.value == null) {
            fetchGeofences()
        }
        CollapsingToolbarUtils.setupToolbar(this, binding.toolbar,
            resources.getString(R.string.title_geofences))
    }

    private fun setupGeofencesObserver() {
        Timber.d("setupGeofencesObserver: Starting to observe geofences")
        mGeofenceViewModel.geofences.observe(viewLifecycleOwner) {
            val receivedList = it ?: listOf()
            Timber.d("setupGeofencesObserver: Received ${receivedList.size} geofences")
            adapter.updateData(it ?: listOf())

            if (receivedList.isEmpty()) {
                Timber.d("setupGeofencesObserver: No geofences found, showing empty state")
                binding.noGeofences.show()
                binding.recyclerView.hide()
            } else {
                Timber.d("setupGeofencesObserver: Geofences found, showing list")
                binding.noGeofences.hide()
                binding.recyclerView.show()
            }

            Timber.d("setupGeofencesObserver: Hiding activity indicator")
            ActivityIndicatorDialogFragment.hide()
        }
    }

    private fun fetchGeofences() {
        activity?.supportFragmentManager?.let {
            Timber.d("fetchGeofences: Showing activity indicator")
            ActivityIndicatorDialogFragment.show(it)
        }
        Timber.d("fetchGeofences: Requesting geofences from view model")
        mGeofenceViewModel.getGeofences()
    }

    private fun setRecyclerView() {
        adapter = GeofenceListAdapter(listOf()) { viewGeofence(it) }
        val recyclerView: RecyclerView = binding.recyclerView
        recyclerView.adapter = adapter
        recyclerView.layoutManager = LinearLayoutManager(requireActivity())
    }

    private fun setButtons() {
        binding.buttonCreateGeofence.setOnClickListener { viewGeofence(null) }
        binding.buttonFirstSafeZone.setOnClickListener { viewGeofence(null) }
    }

    private fun viewGeofence(geofence: Geofence?) {
        mGeofenceViewModel.viewGeofence(geofence)
        findNavController().navigate(navigationDirection)
    }
}