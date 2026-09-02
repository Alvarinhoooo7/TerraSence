package com.sosmartlabs.momo.geofences.ui

import android.annotation.SuppressLint
import android.content.Intent
import android.location.Location
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.SeekBar
import android.widget.Toast
import androidx.activity.result.ActivityResultLauncher
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.MutableLiveData
import androidx.navigation.fragment.findNavController
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.Circle
import com.google.android.gms.maps.model.CircleOptions
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.libraries.places.api.model.Place
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentGeofenceViewBinding
import com.sosmartlabs.momo.map.marker.MarkerType
import com.sosmartlabs.momo.map.marker.MarkerVisualSpec
import com.sosmartlabs.momo.map.marker.MomoMarker
import com.sosmartlabs.momo.utils.ConversionsUtil
import com.sosmartlabs.momo.utils.collapsingtoolbar.CollapsingToolbarUtils
import com.sosmartlabs.momo.utils.extensions.hide
import com.sosmartlabs.momo.utils.extensions.show
import com.sosmartlabs.momo.utils.ui.activityindicator.ActivityIndicatorDialogFragment
import com.sosmartlabs.momo.utils.ui.googleplaces.IPlacesAutocompleteFragment
import kotlin.math.ln

class GeofenceViewFragment : Fragment(), OnMapReadyCallback, IPlacesAutocompleteFragment {

    companion object {
        private const val MIN_RADIUS_METERS = 150
        private const val MAX_RADIUS_METERS = 1500
        private const val PLACE_LOADING_MIN_DURATION_MS = 300L
    }

    private val mGeofenceViewModel: GeofenceViewModel by activityViewModels()
    lateinit var binding: FragmentGeofenceViewBinding
    lateinit var title: String
    override lateinit var startForResultPlaceAutocomplete: ActivityResultLauncher<Intent>

    // Parameters.
    var placeName: MutableLiveData<String> = MutableLiveData()
    var address: MutableLiveData<String> = MutableLiveData()
    var zoneRadius: MutableLiveData<Int> = MutableLiveData(MIN_RADIUS_METERS)

    private lateinit var zoneGoogleMapFragment: SupportMapFragment
    private var zoneGoogleMap: GoogleMap? = null
    private var mapCircle: Circle? = null
    private var centerMarker: Marker? = null
    private var geofenceCenterMarker: MomoMarker? = null
    private var mapCenter: MutableLiveData<LatLng> = MutableLiveData(LatLng(0.0, 0.0))
    private var lastKnownLocationCenter: LatLng? = null
    private var isPlaceSelectionInProgress = false
    private var placeSelectionLoadingStartedAt = 0L
    private var pendingPlaceLoadingHide: Runnable? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        binding = FragmentGeofenceViewBinding.inflate(
            inflater, container, false)
        binding.viewModel = this
        setCurrentZoneValues()
        determineEditModeAndHeader()
        onPlacesAutocompleteFragmentCreateView(this)
        setGoogleMapCard()
        setGoogleMapTracker()
        configureSeekBar()
        setupButtons()
        setLoader()
        updatePlaceSelectionUiState()
        return binding.root
    }

    override fun onPlacesAutocompleteResponse(place: Place) {
        address.value = place.formattedAddress
        binding.editTextAddress.setText(place.formattedAddress)
        binding.tilAddress.error = null
        place.location?.let { safeLocation ->
            lastKnownLocationCenter = safeLocation
            mapCenter.value = safeLocation
        }
    }

    override fun onPlacesAutocompleteFetchStarted() {
        setPlaceSelectionInProgress(true)
    }

    override fun onPlacesAutocompleteFetchCompleted() {
        setPlaceSelectionInProgress(false)
    }

    override fun onPlacesAutocompleteFetchFailed() {
        setPlaceSelectionInProgress(false)
    }

    override fun onPlacesAutocompleteCanceled() {
        setPlaceSelectionInProgress(false)
    }

    override fun setPlacesAutocompleteFieldListeners() {
        binding.editTextAddress.apply {
            isFocusable = false
            isFocusableInTouchMode = false
            isClickable = true
            isCursorVisible = false
            setOnClickListener {
                if (isPlaceSelectionInProgress) return@setOnClickListener
                clearFocus()
                openPlacesAutocompleteService(requireContext(), getAutocompleteBiasCenter())
            }
        }
        binding.tilAddress.setEndIconOnClickListener {
            if (isPlaceSelectionInProgress) return@setEndIconOnClickListener
            binding.editTextAddress.clearFocus()
            openPlacesAutocompleteService(requireContext(), getAutocompleteBiasCenter())
        }
    }

    private fun setLoader() {
        mGeofenceViewModel.isLoading.observe(viewLifecycleOwner) {
            if (it) {
                activity?.supportFragmentManager?.let { fragmentManager ->
                    ActivityIndicatorDialogFragment.show(fragmentManager)
                }
            } else {
                // Prevents the view to navigateUp as soon as it opens.
                val awaitingQuery = ActivityIndicatorDialogFragment.isShown()
                ActivityIndicatorDialogFragment.hide()
                if (awaitingQuery) findNavController().navigateUp()
            }
        }
    }

    private fun determineEditModeAndHeader() {
        if (mGeofenceViewModel.isEditMode()) {
            title = getString(R.string.geofences_title_edit)
            binding.editButtons.show()
            binding.creationButtons.hide()
        } else {
            title = getString(R.string.geofences_title_create)
            binding.editButtons.hide()
            binding.creationButtons.show()
        }
        binding.headerTitle.text = title
        CollapsingToolbarUtils.setupToolbar(this, binding.toolbar, title)
    }

    private fun setupButtons() {
        binding.buttonCreateGeofence.setOnClickListener {
            saveGeofence()
        }

        binding.buttonEditGeofence.setOnClickListener {
            saveGeofence()
        }

        binding.buttonDeleteGeofence.setOnClickListener {
            mGeofenceViewModel.deleteGeofence()
        }
    }

    private fun saveGeofence() {
        clearValidationErrors()

        val finalName = placeName.value?.trim().orEmpty()
        val finalAddress = address.value?.trim().orEmpty()
        val finalCenter = getMapCenter()
        val finalRadius = getZoneRadius().toInt()

        var isValid = true
        if (finalName.isBlank()) {
            binding.tilName.error = getString(R.string.subscription_form_error_field_required)
            isValid = false
        }
        if (finalAddress.isBlank()) {
            binding.tilAddress.error = getString(R.string.geofences_address_required)
            isValid = false
        }

        if (isValid) {
            mGeofenceViewModel.saveGeofence(finalName, finalRadius, finalCenter, finalAddress)
        } else {
            binding.editTextAddress.clearFocus()
        }
    }

    private fun clearValidationErrors() {
        binding.tilName.error = null
        binding.tilAddress.error = null
    }

    private fun setPlaceSelectionInProgress(inProgress: Boolean) {
        if (!this::binding.isInitialized || view == null) {
            isPlaceSelectionInProgress = inProgress
            pendingPlaceLoadingHide = null
            return
        }

        pendingPlaceLoadingHide?.let { binding.mapLoadingOverlay.removeCallbacks(it) }
        pendingPlaceLoadingHide = null

        if (inProgress) {
            placeSelectionLoadingStartedAt = System.currentTimeMillis()
            isPlaceSelectionInProgress = true
            updatePlaceSelectionUiState()
            return
        }

        val elapsed = System.currentTimeMillis() - placeSelectionLoadingStartedAt
        val remaining = (PLACE_LOADING_MIN_DURATION_MS - elapsed).coerceAtLeast(0L)
        if (remaining == 0L) {
            isPlaceSelectionInProgress = false
            updatePlaceSelectionUiState()
        } else {
            val hideRunnable = Runnable {
                isPlaceSelectionInProgress = false
                updatePlaceSelectionUiState()
                pendingPlaceLoadingHide = null
            }
            pendingPlaceLoadingHide = hideRunnable
            binding.mapLoadingOverlay.postDelayed(hideRunnable, remaining)
        }
    }

    private fun updatePlaceSelectionUiState() {
        if (!this::binding.isInitialized || view == null) return

        if (isPlaceSelectionInProgress) {
            binding.placeLoadingIndicator.show()
            binding.mapLoadingOverlay.show()
            binding.mapLoadingOverlay.bringToFront()
        } else {
            binding.placeLoadingIndicator.hide()
            binding.mapLoadingOverlay.hide()
        }

        binding.buttonCreateGeofence.isEnabled = !isPlaceSelectionInProgress
        binding.buttonEditGeofence.isEnabled = !isPlaceSelectionInProgress
        binding.buttonDeleteGeofence.isEnabled = !isPlaceSelectionInProgress
        binding.tilAddress.isEnabled = !isPlaceSelectionInProgress
    }

    private fun configureSeekBar() {
        binding.seekbarRadius.apply {
            max = MAX_RADIUS_METERS - MIN_RADIUS_METERS
            binding.seekbarRadius.progress = getZoneRadius().toInt() - MIN_RADIUS_METERS
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar, i: Int, b: Boolean) {
                    val mRadiusInMeters = MIN_RADIUS_METERS + i
                    setTextInTextViewGeofenceRadius(isImperialUnits(), mRadiusInMeters.toDouble())
                    zoneRadius.postValue(mRadiusInMeters)
                }
                override fun onStartTrackingTouch(seekBar: SeekBar) { /* NO-OP */ }
                override fun onStopTrackingTouch(seekBar: SeekBar) { /* NO-OP */ }
            })
        }
    }

    private fun setGoogleMapCard() {
        zoneGoogleMapFragment = SupportMapFragment.newInstance()
        childFragmentManager.beginTransaction()
            .replace(binding.mapCard.id, zoneGoogleMapFragment)
            .commit()
    }

    override fun onMapReady(googleMap: GoogleMap) {
        zoneGoogleMap = googleMap
        zoneGoogleMap?.let {
            it.uiSettings.isZoomControlsEnabled = false
            it.uiSettings.isScrollGesturesEnabled = false
            it.uiSettings.isZoomGesturesEnabled = false
            it.uiSettings.isTiltGesturesEnabled = false
            it.uiSettings.isRotateGesturesEnabled = false
        }
        initMapMarkers()
        setUpGeofence()
        updatePlaceSelectionUiState()

        if (!mGeofenceViewModel.isEditMode()) {
            requestLastLocation()
        }
        repositionMap()
    }

    override fun onResume() {
        super.onResume()
        if (zoneGoogleMap == null) zoneGoogleMapFragment.getMapAsync(this)
    }

    override fun onDestroyView() {
        pendingPlaceLoadingHide?.let { binding.mapLoadingOverlay.removeCallbacks(it) }
        pendingPlaceLoadingHide = null
        geofenceCenterMarker?.removeMarker()
        geofenceCenterMarker = null
        centerMarker = null
        mapCircle?.remove()
        mapCircle = null
        zoneGoogleMap = null
        super.onDestroyView()
    }

    private fun setCurrentZoneValues() {
        val selected = mGeofenceViewModel.selectedGeofence.value
        selected?.let {
            zoneRadius.value = it.radius
            mapCenter.value = LatLng(it.center.latitude, it.center.longitude)
            placeName.value = it.name
            address.value = it.address
            binding.editTextAddress.setText(address.value)
        }
    }

    private fun initMapMarkers() {
        centerMarker = zoneGoogleMap?.addMarker(
            MarkerOptions()
                .position(getMapCenter())
                .anchor(.5f, .5f)
        )
        geofenceCenterMarker = centerMarker?.let {
            MomoMarker(
                googleMapMarker = it,
                appContext = requireContext(),
                markerType = MarkerType.GEOFENCE,
                markerId = "geofence_center",
                visualSpec = MarkerVisualSpec.geofenceMap()
            )
        }?.also { marker ->
            marker.loadMarkerImage(null)
        }

        mapCircle = zoneGoogleMap?.addCircle(
            CircleOptions()
                .center(getMapCenter())
                .radius(getZoneRadius())
                .strokeColor(ContextCompat.getColor(requireContext(), R.color.colorSecondary))
                .fillColor(
                    ContextCompat.getColor(
                        requireContext(),
                        R.color.colorSecondaryTrans
                    )
                )
        )

        setTextInTextViewGeofenceRadius(isImperialUnits(), getZoneRadius())
    }

    private fun setGoogleMapTracker() {
        mapCenter.observe(viewLifecycleOwner) { repositionMap() }
        zoneRadius.observe(viewLifecycleOwner) { repositionMap() }
    }

    private fun repositionMap() {
        zoneGoogleMap?.moveCamera(
            CameraUpdateFactory.newLatLngZoom(
                getMapCenter(),
                getZoomLevel(mapCircle)
            )
        )
        setUpGeofence()
    }

    private fun setUpGeofence() {
        if (zoneGoogleMap == null) return
        centerMarker?.position = getMapCenter()
        mapCircle?.center = getMapCenter()
        mapCircle?.radius = getZoneRadius()
    }

    fun setTextInTextViewGeofenceRadius(isImperial: Boolean, value: Double) {
        binding.textviewGeofenceRadius.text =
            if (!isImperial) getString(R.string.geofence_radius_in_meters, value)
            else getString(R.string.geofence_radius_in_yards, ConversionsUtil.convertMtrToYd(value))
    }

    @SuppressLint("MissingPermission")
    private fun requestLastLocation() {
        val fusedLocationClient: FusedLocationProviderClient =
            LocationServices.getFusedLocationProviderClient(requireActivity())
        fusedLocationClient.lastLocation
            .addOnSuccessListener { location: Location? ->
                if (!address.value.isNullOrBlank()) return@addOnSuccessListener
                // Use the location object to get the latitude and longitude
                val latLng = LatLng(location?.latitude ?: 0.0
                    , location?.longitude ?: 0.0)
                lastKnownLocationCenter = latLng
                mapCenter.value = latLng
            }
    }

    private fun getAutocompleteBiasCenter(): LatLng? {
        val currentCenter = mapCenter.value
        return when {
            currentCenter != null && currentCenter.latitude != 0.0 && currentCenter.longitude != 0.0 -> currentCenter
            lastKnownLocationCenter != null &&
                lastKnownLocationCenter?.latitude != 0.0 &&
                lastKnownLocationCenter?.longitude != 0.0 -> lastKnownLocationCenter
            else -> null
        }
    }

    private fun getMapCenter(): LatLng {
        return mapCenter.value ?: LatLng(0.0, 0.0)
    }

    private fun getZoneRadius(): Double {
        return zoneRadius.value?.toDouble() ?: MIN_RADIUS_METERS.toDouble()
    }

    private fun isImperialUnits(): Boolean {
        return mGeofenceViewModel.isImperialMeasureSystem.value ?: false
    }

    private fun getZoomLevel(circle: Circle?): Float {
        var zoomLevel = 11.0f
        if (circle != null) {
            val radius = circle.radius + circle.radius / 2
            val scale = radius / 175
            zoomLevel = (16 - ln(scale) / ln(2.0)).toFloat()
        }
        return zoomLevel
    }
}
