package com.sosmartlabs.momotabletpadres.main.ui.fragment

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.app.ActivityCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.Circle
import com.google.android.gms.maps.model.CircleOptions
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.databinding.MainFragmentBinding
import com.sosmartlabs.momotabletpadres.geofences.model.Geofence
import com.sosmartlabs.momotabletpadres.geofences.ui.GeofenceViewModel
import com.sosmartlabs.momotabletpadres.main.MainActivity
import com.sosmartlabs.momotabletpadres.main.model.MomoMarker
import com.sosmartlabs.momotabletpadres.main.ui.LocationsViewModel
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.utils.Resource
import timber.log.Timber


class MainFragment: Fragment(), OnMapReadyCallback {

    private lateinit var binding: MainFragmentBinding

    private var googleMap: GoogleMap? = null
    private lateinit var googleMapFragment: SupportMapFragment
    private var currentTabletLocation: LatLng? = null

    private val locationsViewModel: LocationsViewModel by activityViewModels()
    private val tabletViewModel: TabletViewModel by activityViewModels()
    private val geofenceViewModel: GeofenceViewModel by activityViewModels()

    private var tabletMarker: Marker? = null
    private var accuracyCircle: Circle? = null
    private val geofenceMarkers = mutableListOf<Marker>()

    // True while the no-location overlay is showing for the current device. Used
    // so a late parent-GPS update can frame the dimmed map on the parent's area
    // (instead of the empty 0,0 view) only while we have no child location.
    private var showingNoLocation = false
    // Last known PARENT (this phone's) location, used purely to give the
    // no-location map something sensible to look at under the scrim.
    private var lastParentLocation: LatLng? = null

    // False while the account has no devices (noTabletView). Guards late
    // callbacks from re-showing map UI for a just-removed device, since
    // currentTablet is not nulled when the list empties.
    private var hasTablets = true

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("MainFragment: Creating view")
        binding = MainFragmentBinding.inflate(inflater, container, false)
        setGoogleMapCard()
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("MainFragment: View created, initializing components")

        (requireContext() as MainActivity).updateCurrentFragment(this)
        setListeners()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        Timber.d("MainFragment: Resuming fragment")
        if (googleMap == null) {
            Timber.d("MainFragment: Google Map not initialized, requesting async initialization")
            googleMapFragment.getMapAsync(this)
        }
        locationsViewModel.startLocationUpdates()
    }

    override fun onStop() {
        super.onStop()
        Timber.d("MainFragment: Stopping fragment, halting location updates")
        locationsViewModel.stopLocationUpdates()
    }

    fun noTabletView() {
        Timber.d("MainFragment: Displaying no tablet view state")
        hasTablets = false
        binding.apply {
            // Hide the whole map area; the full-screen welcome overlay
            // (empty_state_view in MainActivity) is shown on top when there are
            // no devices.
            mapCard.visibility = View.GONE
            mapButtonMyLocation.visibility = View.GONE
            mapNoLocationOverlay.visibility = View.GONE
        }
    }

    fun observeViewModel() {
        Timber.d("MainFragment: Initializing ViewModel observers")

        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("MainFragment: Current tablet updated to: ${tablet?.objectId}")
            tablet?.let {
                hasTablets = true
                renderMapForTablet(it)
            }
        }

        // Parent (this phone's) GPS. We never plot it as a marker — the blue dot
        // is Google's isMyLocationEnabled — but in the no-location state we use it
        // to frame the dimmed map on the parent's area rather than 0,0.
        locationsViewModel.locations.observe(viewLifecycleOwner) { location ->
            lastParentLocation = LatLng(location.latitude, location.longitude)
            if (showingNoLocation && currentTabletLocation == null) {
                googleMap?.moveCamera(
                    CameraUpdateFactory.newLatLngZoom(lastParentLocation!!, 12f)
                )
            }
        }

        geofenceViewModel.geofences.observe(viewLifecycleOwner) { resource ->
            when (resource.status) {
                Resource.Status.LOADING -> {
                    Timber.d("MainFragment: Loading geofence data")
                }
                Resource.Status.LOAD_SUCCESS -> {
                    Timber.d("MainFragment: Successfully loaded ${resource.data?.size} geofences")
                    resource.data?.let { geofences ->
                        if (geofences.isNotEmpty()) {
                            setGeofenceMarkers(geofences)
                        } else {
                            Timber.d("MainFragment: No geofences to display")
                        }
                    }
                }
                Resource.Status.LOAD_ERROR -> {
                    Timber.e("MainFragment: Failed to load geofence data")
                }
                else -> {
                    Timber.w("MainFragment: Unexpected geofence status: ${resource.status}")
                }
            }
        }
    }

    /**
     * Single source of truth for what the central map shows. Called for EVERY
     * device model (the map is no longer phone-only) from both
     * [tabletViewModel.currentTablet] updates and [onMapReady]; it is idempotent,
     * so funnelling both entry points through it removes the old race between the
     * model check and the location check.
     *
     * - Device has a location: hide the overlay, draw the marker + accuracy
     *   circle, animate the camera, and show the recenter FAB.
     * - Device has no location: show the dimmed overlay + message, clear any
     *   stale marker/circle from a previously selected device, hide the FAB
     *   (it has nothing to recenter on), and frame the parent's area if known.
     */
    private fun renderMapForTablet(tablet: Tablet) {
        binding.mapCard.visibility = View.VISIBLE
        // Until the map is ready we can't draw anything; onMapReady re-invokes
        // this with the current tablet once it is.
        val map = googleMap ?: run {
            Timber.d("MainFragment: Map not ready yet, deferring render for ${tablet.objectId}")
            return
        }

        if (tablet.currentLocation != null) {
            Timber.d("MainFragment: Tablet ${tablet.objectId} has location, rendering marker")
            showingNoLocation = false
            binding.mapNoLocationOverlay.visibility = View.GONE
            binding.mapButtonMyLocation.visibility = View.VISIBLE
            setTabletMarker(tablet)
        } else {
            Timber.d("MainFragment: Tablet ${tablet.objectId} has no location, showing overlay")
            showingNoLocation = true
            // Drop any marker/accuracy circle left over from a previous device so
            // it doesn't linger under the scrim.
            tabletMarker?.remove()
            tabletMarker = null
            accuracyCircle?.remove()
            accuracyCircle = null
            currentTabletLocation = null
            binding.mapButtonMyLocation.visibility = View.GONE
            binding.mapNoLocationOverlay.visibility = View.VISIBLE
            // Show a dimmed real map of the parent's area instead of 0,0 ocean.
            lastParentLocation?.let {
                map.moveCamera(CameraUpdateFactory.newLatLngZoom(it, 12f))
            }
        }
    }

    private fun setListeners() {
        Timber.d("MainFragment: Setting up click listeners")

        binding.mapButtonMyLocation.setOnClickListener {
            Timber.d("MainFragment: Recenter-on-device button clicked")
            currentTabletLocation?.let { location ->
                googleMap?.animateCamera(CameraUpdateFactory.newLatLngZoom(location, 17f))
            }
        }
    }

    override fun onMapReady(p0: GoogleMap) {
        Timber.d("MainFragment: Google Map ready callback received")
        googleMap = p0
        googleMap?.apply {
            if (ActivityCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                Timber.w("MainFragment: Location permission not granted")
                // Only skip the parent blue-dot setup — still render the device
                // map/overlay below. Keep this a lambda-local return; a bare
                // return here would (apply is inline) exit onMapReady entirely.
                return@apply
            }
            isMyLocationEnabled = true
            uiSettings.isMyLocationButtonEnabled = false
            uiSettings.isMapToolbarEnabled = false
        }
        // Now that the map exists, render whatever the current device needs.
        tabletViewModel.currentTablet.value?.let { renderMapForTablet(it) }
    }

    private fun setGoogleMapCard() {
        Timber.d("MainFragment: Initializing Google Map fragment")
        // Reuse the map fragment across view/activity recreation (config change,
        // process death, "Don't keep activities"): the child FragmentManager
        // restores it into map_card, so adding a fresh one would stack/leak
        // duplicate SupportMapFragments. Only create one if none exists yet.
        val existing = childFragmentManager.findFragmentById(binding.mapCard.id) as? SupportMapFragment
        if (existing != null) {
            Timber.d("MainFragment: Reusing existing map fragment")
            googleMapFragment = existing
            return
        }
        googleMapFragment = SupportMapFragment.newInstance()
        childFragmentManager.beginTransaction()
            .replace(binding.mapCard.id, googleMapFragment)
            .commit()
    }

    private fun setTabletMarker(tablet: Tablet) {
        Timber.d("MainFragment: Setting tablet marker for tablet ${tablet.objectId} (${tablet.profileName})")
        googleMap?.let { googleMap ->
            // Remove the existing tablet marker if it exists
            tabletMarker?.remove()

            // Remove the existing accuracy circle if it exists
            accuracyCircle?.remove()
            accuracyCircle = null

            tablet.currentLocation ?: return

            val location = LatLng(tablet.currentLocation!!.latitude, tablet.currentLocation!!.longitude)
            currentTabletLocation = location
            Timber.d("MainFragment: Creating marker at location: $location")

            // Add a new marker for the tablet
            tabletMarker = googleMap.addMarker(
                MarkerOptions()
                    .title(tablet.currentLocationTime?.toString() ?: tablet.profileName)
                    .position(location)
                    .anchor(0.5f, 1f)
            )

            Timber.d("MainFragment: Creating MomoMarker with profile image")
            val momoMarker = MomoMarker(tabletMarker, requireContext(), MomoMarker.MarkerType.CHILD, tablet.profileImagePath, tablet.objectId ?: "unknown")
            momoMarker.loadMarkerImage()

            Timber.d("MainFragment: Animating camera to location with zoom level 17f")
            googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(location, 17f))

            tablet.currentLocationAccuracy?.let { accuracy ->
                Timber.d("MainFragment: Drawing accuracy circle with radius $accuracy meters")
                accuracyCircle = googleMap.addCircle(
                    CircleOptions()
                        .center(location)
                        .radius(accuracy)
                        .strokeWidth(2f)
                        .strokeColor(requireContext().getColor(R.color.colorPrimary))
                        .fillColor(requireContext().getColor(R.color.colorPrimaryTrans))
                )
            } ?: Timber.w("MainFragment: No accuracy data available for tablet ${tablet.objectId}")
        } ?: Timber.e("MainFragment: GoogleMap not initialized")
    }

    private fun setGeofenceMarkers(geofences: List<Geofence>) {
        Timber.d("MainFragment: Setting ${geofences.size} geofence markers")
        googleMap?.let { googleMap ->
            // Remove existing geofence markers
            geofenceMarkers.forEach { it.remove() }
            geofenceMarkers.clear()

            // Add new geofence markers
            for (geofence in geofences) {
                val location = LatLng(geofence.center.latitude, geofence.center.longitude)
                val radius = geofence.radius.toDouble()

                Timber.d("MainFragment: Adding geofence marker at $location with radius $radius")

                // Add circle first
                googleMap.addCircle(
                    CircleOptions()
                        .center(location)
                        .radius(radius)
                        .strokeWidth(1f)
                        .strokeColor(requireContext().getColor(R.color.colorSecondary))
                        .fillColor(requireContext().getColor(R.color.colorSecondaryTrans))
                )

                // Add marker
                val marker = googleMap.addMarker(
                    MarkerOptions()
                        .position(location)
                        .title(geofence.name)
                )

                marker?.let {
                    val geofenceMarker = MomoMarker(it, requireContext(), MomoMarker.MarkerType.GEOFENCE, null, it.id)
                    geofenceMarker.loadMarkerImage()
                    geofenceMarkers.add(it) // Add to the list of geofence markers
                }
            }
        } ?: Timber.e("MainFragment: GoogleMap not initialized")
    }
}
