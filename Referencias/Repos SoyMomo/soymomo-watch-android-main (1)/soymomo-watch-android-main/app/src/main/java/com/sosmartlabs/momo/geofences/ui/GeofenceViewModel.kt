package com.sosmartlabs.momo.geofences.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.google.android.gms.maps.model.LatLng
import com.parse.ParseGeoPoint
import com.parse.ParseUser
import com.sosmartlabs.momo.geofences.model.Geofence
import com.sosmartlabs.momo.main.model.UserRepository
import com.sosmartlabs.momo.sharedprefs.SharedPrefs
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.MomoError
import dagger.hilt.android.lifecycle.HiltViewModel
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class GeofenceViewModel @Inject constructor(private val userRepository: UserRepository,
                                            private val sp: SharedPrefs): ViewModel() {
    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> get() = _isLoading

    private val _geofences = MutableLiveData<List<Geofence>>()
    val geofences: LiveData<List<Geofence>> get() = _geofences

    private val _error = MutableLiveData<MomoError>()
    val error: LiveData<MomoError> get() = _error

    private val _selectedGeofence = MutableLiveData<Geofence?>()
    val selectedGeofence: LiveData<Geofence?> get() = _selectedGeofence

    private val _isImperialMeasureSystem = MutableLiveData<Boolean>()
    val isImperialMeasureSystem: LiveData<Boolean> get() = _isImperialMeasureSystem

    fun getGeofences() {
        val user = userRepository.getCurrentUser()
        if (user == null) {
            Timber.d("getGeofences: User is null")
            _error.value = MomoError.READ
            return
        }
        Timber.d("getGeofences: Fetching geofences for user ${user.objectId}")
        _isLoading.value = true
        user.getRelation<Geofence>("geoFences")
                .query
                .findInBackground { results, e ->
                    _isLoading.postValue(false)
                    _isImperialMeasureSystem.postValue(sp.isImperialSystem)
                    if (e != null) {
                        Timber.d("getGeofences: Error fetching geofences: ${e.message}")
                        _error.postValue(MomoError.READ)
                        CrashlyticsLog.recordNonFatalError(e, "Error getting geofences")
                    } else {
                        Timber.d("getGeofences: Successfully fetched ${results.size} geofences")
                        _geofences.postValue(ArrayList(results))
                    }
                }
    }

    fun deleteGeofence(){
        _isLoading.value = true
        if (selectedGeofence.value == null) return
        val geofence = selectedGeofence.value
        geofence?.deleteInBackground {
            _isLoading.postValue(false)
            if(it != null){
                _error.postValue(MomoError.DELETE)
                CrashlyticsLog.recordNonFatalError(it, "Error deleting a geofence")
            } else {
                val newList = _geofences.value?.toMutableList()
                newList?.remove(geofence)
                _geofences.postValue(newList?.toList())
            }
        }
    }

    fun viewGeofence(geofence: Geofence?){
        _selectedGeofence.value = geofence
    }

    fun saveGeofence(name: String, radius: Int, center: LatLng, address: String){
        val geofence = _selectedGeofence.value ?: Geofence()
        geofence.apply {
            this.name = name
            this.radius = radius
            this.center = ParseGeoPoint(center.latitude, center.longitude)
            this.enabled = true
            this.address = address
        }
       _isLoading.value = true
        val saveTask = geofence.saveInBackground()
        if(geofence.objectId == null){
            saveTask.onSuccessTask {
                val user = ParseUser.getCurrentUser()
                val relation = user.getRelation<Geofence>("geoFences")
                relation.add(geofence)
                user.saveInBackground().continueWith {
                    if (it.isFaulted) {
                        CrashlyticsLog.recordNonFatalError(it.error, "Error on saving user after saving geofence")
                    }
                }
            }.continueWith {
                _isLoading.postValue(false)
                if(it.isFaulted){
                    _error.postValue(MomoError.WRITE)
                    CrashlyticsLog.recordNonFatalError(it.error, "Error on saving geofence")
                } else {
                    val currentList = _geofences.value?.toMutableList() ?: mutableListOf()
                    currentList.add(geofence)
                    _geofences.postValue(currentList)
                    _selectedGeofence.postValue(null)
                }
            }
        } else {
            saveTask.continueWith {
                _isLoading.postValue(false)
                if(it.isFaulted){
                    _error.postValue(MomoError.WRITE)
                    CrashlyticsLog.recordNonFatalError(it.error, "Error on saving geofence")
                } else {
                    _geofences.postValue(_geofences.value)
                    _selectedGeofence.postValue(null)
                }
            }
        }
    }

    fun isEditMode(): Boolean {
        return selectedGeofence.value != null
    }
}