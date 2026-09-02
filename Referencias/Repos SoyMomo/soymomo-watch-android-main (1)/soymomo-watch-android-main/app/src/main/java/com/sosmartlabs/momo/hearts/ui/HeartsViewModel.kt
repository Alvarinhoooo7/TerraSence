package com.sosmartlabs.momo.hearts.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class HeartsViewModel @Inject constructor(private val ioContext: CoroutineContext,
                                          private val watchUserRepository: WatchUserRepository)
    : ViewModel() {
    private val _watch = MutableLiveData<Resource<Wearer, Unit>>()
    val watch: LiveData<Resource<Wearer, Unit>> get() = _watch

    fun loadWatch(watchId: String) {
        _watch.value = Resource(Resource.Status.LOADING)
        viewModelScope.launch(ioContext) {
            lateinit var watch: Wearer
            runCatching {
                watch = watchUserRepository.findWatchById(watchId)
            }.onSuccess {
                _watch.postValue(Resource(Resource.Status.LOAD_SUCCESS, watch))
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error loading watch for hearts")
                    recordException(it)
                }
                _watch.postValue(Resource(Resource.Status.LOAD_ERROR))
            }
        }
    }

    fun refreshWatch() {
        val watch = _watch.value!!.data!!
        _watch.value = Resource(Resource.Status.LOADING)
        viewModelScope.launch(ioContext) {
            runCatching {
                //TODO: let refresh stop depending on fetch modifying model on complete reward directly
                watchUserRepository.fetchWatch(watch)
            }.onSuccess {
                _watch.postValue(Resource(Resource.Status.LOAD_SUCCESS, watch))
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error refreshing watch with hearts")
                    recordException(it)
                }
                _watch.postValue(Resource(Resource.Status.LOAD_ERROR))
            }
        }
    }
}