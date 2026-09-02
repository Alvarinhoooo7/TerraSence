package com.sosmartlabs.momo.utils.ui.googleplaces

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import com.google.android.gms.common.GooglePlayServicesNotAvailableException
import com.google.android.gms.common.GooglePlayServicesRepairableException
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.model.AutocompleteSessionToken
import com.google.android.libraries.places.api.model.Place
import com.google.android.libraries.places.api.model.RectangularBounds
import com.google.android.libraries.places.api.net.FetchPlaceRequest
import com.google.android.libraries.places.widget.PlaceAutocomplete
import com.google.android.libraries.places.widget.PlaceAutocompleteActivity
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.BuildConfig
import com.sosmartlabs.momo.R
import timber.log.Timber

interface IPlacesAutocompleteFragment {

    var startForResultPlaceAutocomplete: ActivityResultLauncher<Intent>
    fun onPlacesAutocompleteResponse(place: Place)
    fun setPlacesAutocompleteFieldListeners()
    fun onPlacesAutocompleteFetchStarted() {}
    fun onPlacesAutocompleteFetchCompleted() {}
    fun onPlacesAutocompleteFetchFailed() {}
    fun onPlacesAutocompleteCanceled() {}

    fun onPlacesAutocompleteFragmentCreateView(fragment: Fragment) {
        PlacesAutocompleteUtils.initGooglePlaces(fragment)
        startForResultPlaceAutocomplete = PlacesAutocompleteUtils
            .getStartForResultPlaceAutocomplete(
                fragment = fragment,
                callback = {
                    onPlacesAutocompleteResponse(it)
                },
                onFetchStart = {
                    onPlacesAutocompleteFetchStarted()
                },
                onFetchSuccess = {
                    onPlacesAutocompleteFetchCompleted()
                },
                onFetchFailure = {
                    onPlacesAutocompleteFetchFailed()
                },
                onCanceled = {
                    onPlacesAutocompleteCanceled()
                }
            )
        setPlacesAutocompleteFieldListeners()
    }

    fun openPlacesAutocompleteService(context: Context, biasCenter: LatLng? = null) {
        PlacesAutocompleteUtils.openPlacesAutocomplete(
            context = context,
            country = null,
            activityForResult = startForResultPlaceAutocomplete,
            biasCenter = biasCenter
        )
    }
}

object PlacesAutocompleteUtils {
    private const val LOCATION_BIAS_DELTA = 0.3

    private val defaultFields = listOf(
        Place.Field.FORMATTED_ADDRESS,
        Place.Field.ADDRESS_COMPONENTS,
        Place.Field.LOCATION
    )

    fun openPlacesAutocomplete(
        context: Context,
        country: String?,
        activityForResult: ActivityResultLauncher<Intent>,
        biasCenter: LatLng? = null
    ) {
        try {
            val builder = PlaceAutocomplete.IntentBuilder()
            if (country != null) {
                builder.setCountries(listOf(country))
            }
            biasCenter?.let {
                builder.setLocationBias(createLocationBias(it))
            }
            val intent = builder.build(context)
            activityForResult.launch(intent)
            Timber.d("Should startForResultPlaceAutocomplete")
        } catch (e: GooglePlayServicesRepairableException) {
            Toast.makeText(context, R.string.geocoder_error_unavailable, Toast.LENGTH_LONG)
                .show()
            Timber.e(e)
            with(Firebase.crashlytics) {
                log("Error on SubscriptionFormFragment")
                recordException(e)
            }
        } catch (e: GooglePlayServicesNotAvailableException) {
            Toast.makeText(context, R.string.geocoder_error_unavailable, Toast.LENGTH_LONG)
                .show()
            Timber.e(e)
            with(Firebase.crashlytics) {
                log("Error on SubscriptionFormFragment")
                recordException(e)
            }
        }
    }

    fun getStartForResultPlaceAutocomplete(
        fragment: Fragment,
        callback: (Place) -> Unit,
        onFetchStart: (() -> Unit)? = null,
        onFetchSuccess: (() -> Unit)? = null,
        onFetchFailure: (() -> Unit)? = null,
        onCanceled: (() -> Unit)? = null
    ): ActivityResultLauncher<Intent> {

        return fragment.registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) {
            when (it.resultCode) {
                Activity.RESULT_OK -> {
                    it.data?.let { data ->
                        val prediction = PlaceAutocomplete.getPredictionFromIntent(data)
                        if (prediction == null) {
                            Timber.e("Places SDK returned null prediction")
                            showPlacesErrorToast(fragment)
                            onFetchFailure?.invoke()
                            return@let
                        }
                        val sessionToken = PlaceAutocomplete.getSessionTokenFromIntent(data)
                        onFetchStart?.invoke()
                        fetchPlace(
                            fragment = fragment,
                            placeId = prediction.placeId,
                            placeFields = defaultFields,
                            sessionToken = sessionToken,
                            callback = callback,
                            onSuccess = onFetchSuccess,
                            onFailure = onFetchFailure
                        )
                    }
                }
                PlaceAutocompleteActivity.RESULT_ERROR -> {
                    it.data?.let { data ->
                        val status = PlaceAutocomplete.getResultStatusFromIntent(data)
                        Timber.e("Places SDK Error: ${status?.statusMessage ?: "unknown status"}")
                        showPlacesErrorToast(fragment)
                    }
                    onFetchFailure?.invoke()
                }
                Activity.RESULT_CANCELED -> {
                    Timber.e("Places SDK user cancel")
                    onCanceled?.invoke()
                }
            }
        }
    }

    fun initGooglePlaces(fragment: Fragment) {
        if (!Places.isInitialized()) {
            Places.initializeWithNewPlacesApiEnabled(
                fragment.requireContext().applicationContext,
                BuildConfig.googlePlacesApiKey
            )
        }
    }

    fun fetchPlace(
        fragment: Fragment,
        placeId: String,
        placeFields: List<Place.Field>,
        sessionToken: AutocompleteSessionToken?,
        callback: (Place) -> Unit,
        onSuccess: (() -> Unit)? = null,
        onFailure: (() -> Unit)? = null
    ) {
        val context = fragment.context ?: run {
            Timber.w("Skipping Places fetchPlace for detached fragment, placeId=%s", placeId)
            onFailure?.invoke()
            return
        }
        val placesClient = Places.createClient(context.applicationContext)
        val requestBuilder = FetchPlaceRequest.builder(placeId, placeFields)
        sessionToken?.let(requestBuilder::setSessionToken)

        placesClient.fetchPlace(requestBuilder.build())
            .addOnSuccessListener { response ->
                if (!canDeliverPlacesResult(fragment)) {
                    Timber.w("Dropping Places success for inactive fragment, placeId=%s", placeId)
                    return@addOnSuccessListener
                }
                val place = response.place
                callback(place)
                onSuccess?.invoke()
                Timber.d("Places SDK OK $place")
            }
            .addOnFailureListener { exception ->
                Timber.e(exception, "Places SDK fetchPlace error for placeId=%s", placeId)
                if (!canDeliverPlacesResult(fragment)) {
                    Timber.w("Dropping Places failure for inactive fragment, placeId=%s", placeId)
                    return@addOnFailureListener
                }
                showPlacesErrorToast(fragment)
                with(Firebase.crashlytics) {
                    log("Error fetching place details")
                    recordException(exception)
                }
                onFailure?.invoke()
            }
    }

    private fun canDeliverPlacesResult(fragment: Fragment): Boolean {
        return fragment.isAdded &&
            fragment.view != null &&
            fragment.lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)
    }

    private fun showPlacesErrorToast(fragment: Fragment) {
        fragment.context?.let { context ->
            Toast.makeText(
                context,
                R.string.toast_error_searching_address,
                Toast.LENGTH_LONG
            ).show()
        } ?: Timber.w("Skipping Places error toast for detached fragment")
    }

    private fun createLocationBias(center: LatLng): RectangularBounds {
        val southwest = LatLng(
            (center.latitude - LOCATION_BIAS_DELTA).coerceIn(-90.0, 90.0),
            (center.longitude - LOCATION_BIAS_DELTA).coerceIn(-180.0, 180.0)
        )
        val northeast = LatLng(
            (center.latitude + LOCATION_BIAS_DELTA).coerceIn(-90.0, 90.0),
            (center.longitude + LOCATION_BIAS_DELTA).coerceIn(-180.0, 180.0)
        )
        return RectangularBounds.newInstance(LatLngBounds(southwest, northeast))
    }
}
