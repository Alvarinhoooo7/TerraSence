package com.sosmartlabs.momo.watchprofile.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.sharedprefs.SharedPrefs
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import java.util.*
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class WatchProfileViewModel @Inject constructor(private val externalScope: CoroutineScope,
                                                private val ioContext: CoroutineContext,
                                                private val sp: SharedPrefs,
                                                private val watchUserRepository: WatchUserRepository) : ViewModel() {

    enum class WatchUpdateType { WatchProfile, UpdateImage, DeleteImage }
    private val _watch = MutableLiveData<Resource<Wearer, WatchUpdateType>>()
    val watch: LiveData<Resource<Wearer, WatchUpdateType>> get() = _watch

    private val _isImperialMeasureSystem = MutableLiveData<Boolean>()
    val isImperialMeasureSystem: LiveData<Boolean> get() = _isImperialMeasureSystem

    fun loadProfile(watchId: String) {
        var watch = _watch.value?.data
        if (watch != null && watchId == watch.objectId) return

        _watch.value = Resource(Resource.Status.LOADING)
        viewModelScope.launch(ioContext) {
            runCatching {
                watch = watchUserRepository.findWatchById(watchId)
            }.onSuccess {
                _isImperialMeasureSystem.postValue(sp.isImperialSystem)
                _watch.postValue(Resource(Resource.Status.LOAD_SUCCESS, watch))
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error loading profile")
                    recordException(it)
                }
                _watch.postValue(Resource(Resource.Status.LOAD_ERROR))
            }
        }
    }

    fun updateWatch(firstName: String, lastName: String, birthday: Date, phone: String, weight: Int?, height: Int?) {
        val watch = _watch.value!!.data!!
        _watch.value = Resource(Resource.Status.UPDATING, watch, WatchUpdateType.WatchProfile)

        externalScope.launch(ioContext) {
            runCatching {
                with(watch) {
                    this.firstName = firstName
                    this.lastName = lastName
                    this.birthday = birthday
                    this.phone = phone
                    this.weight = weight
                    this.height = height
                }
                watchUserRepository.updateWatch(watch)
            }.onSuccess {
                _watch.postValue(Resource(Resource.Status.UPDATING_SUCCESS, watch, WatchUpdateType.WatchProfile))
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error updating watch profile")
                    recordException(it)
                }
                watchUserRepository.revertWatch(watch)
                _watch.postValue(Resource(Resource.Status.UPDATING_ERROR, watch, WatchUpdateType.WatchProfile))
            }
        }
    }

    fun updateProfileImage(uri: String) {
        val watch = _watch.value!!.data!!
        _watch.value = Resource(Resource.Status.UPDATING, watch, WatchUpdateType.UpdateImage)

        externalScope.launch(ioContext) {
            runCatching {
                watchUserRepository.setProfileImage(watch, uri)
            }.onSuccess {
                _watch.postValue(Resource(Resource.Status.UPDATING_SUCCESS, watch, WatchUpdateType.UpdateImage))
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error updating profile image")
                    recordException(it)
                }
                watchUserRepository.revertWatch(watch)
                _watch.postValue(Resource(Resource.Status.UPDATING_ERROR, watch, WatchUpdateType.UpdateImage))
            }
        }
    }

    fun deleteProfileImage() {
        val watch = _watch.value!!.data!!
        _watch.value = Resource(Resource.Status.UPDATING, watch, WatchUpdateType.DeleteImage)

        externalScope.launch(ioContext) {
            runCatching {
                watchUserRepository.removeProfileImage(watch)
            }.onSuccess {
                _watch.postValue(Resource(Resource.Status.UPDATING_SUCCESS, watch, WatchUpdateType.DeleteImage))
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error deleting profile image")
                    recordException(it)
                }
                _watch.postValue(Resource(Resource.Status.UPDATING_ERROR, watch, WatchUpdateType.DeleteImage))
            }
        }
    }
}