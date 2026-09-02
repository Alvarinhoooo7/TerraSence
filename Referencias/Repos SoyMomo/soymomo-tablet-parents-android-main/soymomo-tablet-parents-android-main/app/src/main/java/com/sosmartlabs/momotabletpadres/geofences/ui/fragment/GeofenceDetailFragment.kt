package com.sosmartlabs.momotabletpadres.geofences.ui.fragment

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.SeekBar
import android.widget.Toast
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.Circle
import com.google.android.gms.maps.model.CircleOptions
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.model.AutocompletePrediction
import com.google.android.libraries.places.api.model.Place
import com.google.android.libraries.places.api.net.PlacesClient
import com.google.android.libraries.places.api.net.kotlin.awaitFetchPlace
import com.google.android.libraries.places.widget.PlaceAutocomplete
import com.google.android.libraries.places.widget.PlaceAutocompleteActivity
import com.google.firebase.Firebase
import com.google.firebase.crashlytics.crashlytics
import com.sosmartlabs.momotabletpadres.BuildConfig
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.GeofenceDetailsFragmentBinding
import com.sosmartlabs.momotabletpadres.geofences.ui.GeofenceViewModel
import com.sosmartlabs.momotabletpadres.geofences.utils.MeasureSystemUtils
import com.sosmartlabs.momotabletpadres.main.model.MomoMarker
import com.sosmartlabs.momotabletpadres.utils.CountryProvider
import com.sosmartlabs.momotabletpadres.utils.Resource
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import timber.log.Timber

@AndroidEntryPoint
class GeofenceDetailFragment : Fragment(), OnMapReadyCallback {

    companion object {
        private const val MIN_RADIUS_METERS = 50
        private const val MAX_RADIUS_METERS = 1500
        private const val MIN_ZOOM = 13f
        private const val MAX_ZOOM = 16f
        private const val CIRCLE_PADDING_PERCENTAGE = 0.2 // 20% padding around circle for safe zone radius
    }

    private val geofenceViewModel: GeofenceViewModel by activityViewModels()
    private lateinit var binding: GeofenceDetailsFragmentBinding
    private lateinit var startForResultPlaceAutocomplete: ActivityResultLauncher<Intent>
    private lateinit var zoneGoogleMapFragment: SupportMapFragment

    private var zoneGoogleMap: GoogleMap? = null
    private var mapCircle: Circle? = null
    private var centerMarker: Marker? = null

    private val placeName: MutableLiveData<String> = MutableLiveData()
    private val address: MutableLiveData<String> = MutableLiveData()
    private val zoneRadius: MutableLiveData<Int> = MutableLiveData(MIN_RADIUS_METERS)
    private val mapCenter: MutableLiveData<LatLng> = MutableLiveData(LatLng(0.0, 0.0))

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("GeofenceDetailFragment: Creating view")
        binding = GeofenceDetailsFragmentBinding.inflate(inflater, container, false)
        
        initializePlacesAutocomplete()
        setGoogleMapCard()
        configureSeekBar()
        setListeners()
        setupToolbar()

        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("GeofenceDetailFragment: View created")
        super.onViewCreated(view, savedInstanceState)
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.detailScrollView,
            includeImeBottom = true,
        )
        observeViewModel()
        requestLastLocation()
    }

    private fun observeViewModel() {
        Timber.d("GeofenceDetailFragment: Setting up view model observers")
        
        geofenceViewModel.selectedGeofence.observe(viewLifecycleOwner) { selectedGeofence ->
            Timber.d("GeofenceDetailFragment: Selected geofence updated: $selectedGeofence")
            val toolbarTitle = if (selectedGeofence == null) {
                getString(R.string.geofences_create_title)
            } else {
                getString(R.string.geofences_edit_title)
            }
            binding.headerTitle.text = toolbarTitle

            if (selectedGeofence == null) {
                binding.buttonCreateGeofence.visibility = View.VISIBLE
                binding.buttonEditGeofence.visibility = View.GONE
                binding.buttonDeleteGeofence.visibility = View.GONE
                // Initialize with minimum radius for new geofence
                zoneRadius.value = MIN_RADIUS_METERS
                binding.seekbarRadius.progress = 0
                updateRadiusText(MIN_RADIUS_METERS)
            } else {
                binding.buttonCreateGeofence.visibility = View.GONE
                binding.buttonEditGeofence.visibility = View.VISIBLE
                binding.buttonDeleteGeofence.visibility = View.VISIBLE
                // Use existing values for editing
                zoneRadius.value = selectedGeofence.radius
                mapCenter.value = LatLng(selectedGeofence.center.latitude, selectedGeofence.center.longitude)
                placeName.value = selectedGeofence.name
                address.value = selectedGeofence.address
                binding.editTextName.setText(selectedGeofence.name)
                binding.editTextAddress.setText(address.value)
                updateMapLocation(mapCenter.value!!)
                binding.seekbarRadius.progress = selectedGeofence.radius - MIN_RADIUS_METERS
                updateRadiusText(selectedGeofence.radius)
            }
        }

        mapCenter.observe(viewLifecycleOwner) { location ->
            Timber.d("GeofenceDetailFragment: Map center updated to: $location")
            updateMapLocation(location)
        }

        geofenceViewModel.saveGeofenceResult.observe(viewLifecycleOwner) { resource ->
            Timber.d("GeofenceDetailFragment: Save geofence result updated: ${resource.status}")
            when (resource.status) {
                Resource.Status.LOADING -> {
                    setButtonsEnabled(false)
                }
                Resource.Status.UPDATING_SUCCESS -> {
                    setButtonsEnabled(true)
                    MainScope().launch(Dispatchers.Main) {
                        if (isAdded && !requireActivity().isFinishing) {
                            geofenceViewModel.clearSaveGeofenceResult()
                            requireActivity().onBackPressed()
                        }
                    }
                }
                Resource.Status.UPDATING_ERROR -> {
                    setButtonsEnabled(true)
                    resource.data?.let { showError(it) }
                }
                else -> {
                    setButtonsEnabled(true)
                }
            }
        }
    }

    private fun setButtonsEnabled(enabled: Boolean) {
        Timber.d("GeofenceDetailFragment: Setting buttons enabled: $enabled")
        binding.buttonCreateGeofence.isEnabled = enabled
        binding.buttonEditGeofence.isEnabled = enabled 
        binding.buttonDeleteGeofence.isEnabled = enabled
    }

    private fun initializePlacesAutocomplete() {
        Timber.d("GeofenceDetailFragment: Initializing Places Autocomplete")
        // Places is initialized in Application; avoid re-initializing here.
        if (!Places.isInitialized()) {
            Places.initializeWithNewPlacesApiEnabled(
                requireContext().applicationContext,
                BuildConfig.googlePlacesApiKey
            )
        }
        startForResultPlaceAutocomplete = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
            when (it.resultCode) {
                PlaceAutocompleteActivity.RESULT_OK -> {
                    it.data?.let { data ->
                        val prediction: AutocompletePrediction? = PlaceAutocomplete.getPredictionFromIntent(data)
                        val placeId = prediction?.placeId ?: run {
                            Timber.e("GeofenceDetailFragment: Missing placeId from autocomplete result")
                            Toast.makeText(requireContext(), R.string.geofences_error_searching_address, Toast.LENGTH_LONG).show()
                            return@let
                        }

                        val placesClient: PlacesClient = Places.createClient(requireActivity())
                        viewLifecycleOwner.lifecycleScope.launch {
                            try {
                                val response = placesClient.awaitFetchPlace(
                                    placeId,
                                    listOf(Place.Field.FORMATTED_ADDRESS, Place.Field.LOCATION)
                                )
                                onPlacesAutocompleteResponse(response.place)
                            } catch (e: Exception) {
                                handlePlacesError(e)
                            }
                        }
                    }
                }
                PlaceAutocompleteActivity.RESULT_ERROR -> {
                    it.data?.let { data ->
                        val status = PlaceAutocomplete.getPredictionFromIntent(data)
                        Timber.e("GeofenceDetailFragment: Places autocomplete error: $status")
                        Toast.makeText(requireContext(), R.string.geofences_error_searching_address, Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }

    private fun onPlacesAutocompleteResponse(place: Place) {
        Timber.d("GeofenceDetailFragment: Place selected: ${place.formattedAddress}")
        place.location?.let { location ->
            address.postValue(place.formattedAddress)
            binding.editTextAddress.setText(place.formattedAddress)
            mapCenter.postValue(location)
            updateMapLocation(location)
        }
    }

    private fun updateMapLocation(location: LatLng) {
        Timber.d("GeofenceDetailFragment: Updating map location to: $location")
        zoneGoogleMap?.let { map ->
            centerMarker?.remove()
            mapCircle?.remove()

            centerMarker = map.addMarker(
                MarkerOptions()
                    .position(location)
                    .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_MAGENTA))
            )

            Timber.d("GeofenceDetailFragment: Creating MomoMarker")
            val geofenceMarker = MomoMarker(centerMarker, requireContext(), MomoMarker.MarkerType.GEOFENCE, null, centerMarker?.id?:"")
            geofenceMarker.loadMarkerImage()

            val radius = getZoneRadius()
            mapCircle = map.addCircle(
                CircleOptions()
                    .center(location)
                    .radius(radius)
                    .strokeColor(resources.getColor(R.color.colorSecondary, null))
                    .fillColor(resources.getColor(R.color.colorSecondaryTrans, null))
            )

            // Calculate bounds that include the circle plus padding
            val radiusWithPadding = radius * (1 + CIRCLE_PADDING_PERCENTAGE)
            val zoomLevel = getZoomLevelForRadius(radiusWithPadding)
            map.animateCamera(CameraUpdateFactory.newLatLngZoom(location, zoomLevel))
        }
    }

    private fun getZoomLevelForRadius(radius: Double): Float {
        // This formula converts radius in meters to required zoom level
        // The constants are tuned to provide appropriate zoom levels for our radius range
        val scale = radius / MAX_RADIUS_METERS
        return (MIN_ZOOM + ((MAX_ZOOM - MIN_ZOOM) * (1 - scale))).coerceIn(MIN_ZOOM.toDouble(),
            MAX_ZOOM.toDouble()
        ).toFloat()
    }

    private fun openPlacesAutocomplete() {
        try {
            Timber.d("GeofenceDetailFragment: Opening Places Autocomplete dialog")
            val autocompleteIntent: Intent = PlaceAutocomplete.createIntent(requireActivity()) {
                setRegionCode(CountryProvider.getCountry(requireActivity()))
            }
            startForResultPlaceAutocomplete.launch(autocompleteIntent)
        } catch (e: Exception) {
            handlePlacesError(e)
        }
    }

    private fun handlePlacesError(e: Exception) {
        Timber.e(e, "GeofenceDetailFragment: Failed to initialize Places")
        val messageResId = R.string.geofences_google_places_unavailable
        Toast.makeText(requireContext(), messageResId, Toast.LENGTH_LONG).show()
        Firebase.crashlytics.recordException(e)
    }

    private fun setupToolbar() {
        Timber.d("GeofenceDetailFragment: Setting up toolbar")
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

    private fun setListeners() {
        Timber.d("GeofenceDetailFragment: Setting up button click listeners")
        binding.buttonCreateGeofence.setOnClickListener { saveGeofence() }
        binding.buttonEditGeofence.setOnClickListener { saveGeofence() }
        binding.buttonDeleteGeofence.setOnClickListener { geofenceViewModel.deleteGeofence() }

        binding.editTextAddress.setOnFocusChangeListener { it, hasFocus ->
            if (hasFocus) {
                it.clearFocus()
                openPlacesAutocomplete()
            }
        }
    }

    private fun saveGeofence() {
        Timber.d("GeofenceDetailFragment: Attempting to save geofence")
        val name = binding.tilName.editText?.text?.toString()
        val address = binding.editTextAddress.text?.toString()
        val radius = zoneRadius.value ?: MIN_RADIUS_METERS
        val center = getMapCenter()

        geofenceViewModel.saveGeofence(name, radius, center, address)
    }

    private fun configureSeekBar() {
        Timber.d("GeofenceDetailFragment: Configuring radius seekbar")
        binding.seekbarRadius.apply {
            max = MAX_RADIUS_METERS - MIN_RADIUS_METERS
            progress = 0 // Start at minimum for new geofences
            updateRadiusText(MIN_RADIUS_METERS) // Initialize text with minimum value
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar, progress: Int, fromUser: Boolean) {
                    val radius = MIN_RADIUS_METERS + progress
                    zoneRadius.value = radius
                    updateRadiusText(radius)
                    mapCircle?.radius = radius.toDouble()
                    mapCenter.value?.let { location ->
                        val radiusWithPadding = radius * (1 + CIRCLE_PADDING_PERCENTAGE)
                        val zoomLevel = getZoomLevelForRadius(radiusWithPadding.toDouble())
                        zoneGoogleMap?.animateCamera(CameraUpdateFactory.newLatLngZoom(location, zoomLevel))
                    }
                }
                override fun onStartTrackingTouch(seekBar: SeekBar) {}
                override fun onStopTrackingTouch(seekBar: SeekBar) {}
            })
        }
    }

    @SuppressLint("StringFormatInvalid")
    private fun updateRadiusText(radius: Int) {
        val isImperial = MeasureSystemUtils.isUsingImperialSystem(requireContext())
        val radiusText = if (isImperial) {
            val yards = MeasureSystemUtils.metersToYards(radius.toDouble())
            getString(R.string.geofence_radius_in_yards, yards.toInt())
        } else {
            getString(R.string.geofence_radius_in_meters, radius)
        }
        binding.textviewGeofenceRadius.text = radiusText
    }

    private fun setGoogleMapCard() {
        Timber.d("GeofenceDetailFragment: Setting up Google Map fragment")
        zoneGoogleMapFragment = SupportMapFragment.newInstance()
        childFragmentManager.beginTransaction().replace(binding.mapCard.id, zoneGoogleMapFragment).commit()
        zoneGoogleMapFragment.getMapAsync(this)
    }

    override fun onMapReady(googleMap: GoogleMap) {
        Timber.d("GeofenceDetailFragment: Google Map is ready")
        zoneGoogleMap = googleMap.apply {
            uiSettings.apply {
                isZoomControlsEnabled = false
                isZoomGesturesEnabled = false
                isScrollGesturesEnabled = false
                isRotateGesturesEnabled = false
                isTiltGesturesEnabled = false
                isCompassEnabled = false
                isMapToolbarEnabled = false
            }
            mapCenter.value?.let { location ->
                updateMapLocation(location)
            }
        }
    }

    private fun getMapCenter(): LatLng = mapCenter.value ?: LatLng(0.0, 0.0)

    private fun getZoneRadius(): Double = zoneRadius.value?.toDouble() ?: MIN_RADIUS_METERS.toDouble()

    @SuppressLint("MissingPermission")
    private fun requestLastLocation() {
        Timber.d("GeofenceDetailFragment: Requesting last known location")
        LocationServices.getFusedLocationProviderClient(requireActivity()).lastLocation
            .addOnSuccessListener { location ->
                location?.let {
                    val newLocation = LatLng(it.latitude, it.longitude)
                    Timber.d("GeofenceDetailFragment: Last known location received: $newLocation")
                    mapCenter.postValue(newLocation)
                    updateMapLocation(newLocation)
                }
            }
    }

    private fun showError(message: String) {
        Timber.e("GeofenceDetailFragment: Error occurred: $message")
        val errorMessage = when (message) {
            "geofences_error_empty_name" -> getString(R.string.geofences_error_empty_name)
            "geofences_error_empty_address" -> getString(R.string.geofences_error_empty_address)
            "geofences_error_invalid_radius" -> getString(R.string.geofences_error_invalid_radius)
            "geofences_error_user_not_found" -> getString(R.string.geofences_error_user_not_found)
            "geofences_error_delete" -> getString(R.string.geofences_error_delete)
            "geofences_error_no_selection" -> getString(R.string.geofences_error_no_selection)
            else -> getString(R.string.geofences_error_unknown)
        }
        
        Toast.makeText(
            requireContext(),
            errorMessage,
            Toast.LENGTH_LONG
        ).show()
    }
}