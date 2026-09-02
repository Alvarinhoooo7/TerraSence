package com.sosmartlabs.momotabletpadres.geofences.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.maps.model.LatLng
import com.parse.ParseGeoPoint
import com.sosmartlabs.momotabletpadres.geofences.model.Geofence
import com.sosmartlabs.momotabletpadres.geofences.repository.GeofenceRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class GeofenceViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val geofenceRepository: GeofenceRepository
) : ViewModel() {

    private val _geofences = MutableLiveData<Resource<List<Geofence>, Unit>>()
    val geofences: LiveData<Resource<List<Geofence>, Unit>> get() = _geofences

    private val _selectedGeofence = MutableLiveData<Geofence?>()
    val selectedGeofence: LiveData<Geofence?> get() = _selectedGeofence

    private val _saveGeofenceResult = MutableLiveData<Resource<String, Unit>>()
    val saveGeofenceResult: LiveData<Resource<String, Unit>> get() = _saveGeofenceResult

    init {
        Timber.d("GeofenceViewModel: Initializing and fetching initial geofences")
        getGeofences()
    }

    private fun getGeofences() {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                Timber.d("GeofenceViewModel: Starting geofence fetch operation")
                _geofences.postValue(Resource(status = Resource.Status.LOADING))

                val user = userRepository.getCurrentParseUser()
                if (user == null) {
                    Timber.e("GeofenceViewModel: Geofence fetch failed - User not authenticated")
                    throw Exception("Current user is null")
                }

                Timber.d("GeofenceViewModel: Fetching geofences for user: ${user.objectId}")
                geofenceRepository.getGeofenceByUser(user)
            }.onSuccess { geofences ->
                Timber.d("GeofenceViewModel: Successfully retrieved ${geofences.size} geofences")
                _geofences.postValue(
                    Resource(
                        status = Resource.Status.LOAD_SUCCESS,
                        data = geofences
                    )
                )
            }.onFailure { error ->
                Timber.e(error, "GeofenceViewModel: Failed to retrieve geofences")
                _geofences.postValue(Resource(status = Resource.Status.LOAD_ERROR))
            }
        }
    }

    fun clearSaveGeofenceResult() {
        Timber.d("GeofenceViewModel: Clearing save geofence result")
        _saveGeofenceResult.postValue(Resource(status = Resource.Status.DEFAULT))
    }

    fun clearSelectedGeofence() {
        Timber.d("GeofenceViewModel: Clearing selected geofence")
        _selectedGeofence.postValue(null)
    }

    fun setSelectedGeofence(geofence: Geofence) {
        Timber.d("GeofenceViewModel: Setting selected geofence - ID: ${geofence.objectId}, Name: ${geofence.name}")
        _selectedGeofence.postValue(geofence)
    }

    fun saveGeofence(name: String?, radius: Int, center: LatLng, address: String?) {
        Timber.d("GeofenceViewModel: Attempting to save geofence - Name: $name, Radius: $radius, Location: $center")

        if (name.isNullOrBlank()) {
            Timber.w("GeofenceViewModel: Save failed - Name is empty or blank")
            _saveGeofenceResult.postValue(Resource(
                status = Resource.Status.UPDATING_ERROR,
                data = "geofences_error_empty_name"
            ))
            return
        }

        if (address.isNullOrBlank()) {
            Timber.w("GeofenceViewModel: Save failed - Address is empty or blank")
            _saveGeofenceResult.postValue(Resource(
                status = Resource.Status.UPDATING_ERROR,
                data = "geofences_error_empty_address"
            ))
            return
        }

        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                Timber.d("GeofenceViewModel: Starting save operation for geofence: $name")
                _saveGeofenceResult.postValue(Resource(status = Resource.Status.LOADING))
                
                val user = userRepository.getCurrentParseUser()
                    ?: throw Exception("geofences_error_user_not_found")

                val geofence = _selectedGeofence.value ?: Geofence()

                geofence.apply {
                    this.user = user
                    this.name = name
                    this.radius = radius
                    this.center = ParseGeoPoint(center.latitude, center.longitude)
                    this.address = address
                    this.enabled = true
                }

                Timber.d("GeofenceViewModel: Persisting geofence to database")
                geofence.save()

                getGeofences()
                clearSelectedGeofence()

                Timber.d("GeofenceViewModel: Successfully saved geofence - ID: ${geofence.objectId}")
                _saveGeofenceResult.postValue(Resource(
                    status = Resource.Status.UPDATING_SUCCESS
                ))
            }.onFailure { error ->
                Timber.e(error, "GeofenceViewModel: Failed to save geofence - Error: ${error.message}")
                _saveGeofenceResult.postValue(Resource(
                    status = Resource.Status.UPDATING_ERROR,
                    data = error.message ?: "geofences_error_unknown"
                ))
            }
        }
    }

    fun deleteGeofence() {
        val geofence = _selectedGeofence.value
        if (geofence != null) {
            Timber.d("GeofenceViewModel: Starting delete operation for geofence - ID: ${geofence.objectId}, Name: ${geofence.name}")
            viewModelScope.launch(Dispatchers.IO) {
                runCatching {
                    _saveGeofenceResult.postValue(Resource(status = Resource.Status.LOADING))
                    
                    geofence.delete()
                    Timber.d("GeofenceViewModel: Successfully deleted geofence - ID: ${geofence.objectId}")

                    getGeofences()
                    clearSelectedGeofence()
                    
                    _saveGeofenceResult.postValue(Resource(status = Resource.Status.UPDATING_SUCCESS))
                }.onFailure { error ->
                    Timber.e(error, "GeofenceViewModel: Failed to delete geofence - ID: ${geofence.objectId}")
                    _saveGeofenceResult.postValue(Resource(
                        status = Resource.Status.UPDATING_ERROR,
                        data = "geofences_error_delete"
                    ))
                }
            }
        } else {
            Timber.w("GeofenceViewModel: Delete operation failed - No geofence selected")
            _saveGeofenceResult.postValue(Resource(
                status = Resource.Status.UPDATING_ERROR,
                data = "geofences_error_no_selection"
            ))
        }
    }
}