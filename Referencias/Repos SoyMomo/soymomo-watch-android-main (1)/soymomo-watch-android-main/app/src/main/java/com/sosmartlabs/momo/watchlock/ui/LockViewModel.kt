package com.sosmartlabs.momo.watchlock.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.parse.ParseObject
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.watchlock.model.SilenceTimeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class LockViewModel @Inject constructor(private val ioContext: CoroutineContext,
                                        private val watchUserRepository: WatchUserRepository,
                                        private val silenceTimeRepository: SilenceTimeRepository): ViewModel() {
    private val _silenceTimeList = MutableLiveData<Resource<List<ParseObject>, Unit>>()
    val silenceTimeList: LiveData<Resource<List<ParseObject>, Unit>> get() = _silenceTimeList

    private val _watch = MutableLiveData<Wearer>()
    val watch: LiveData<Wearer> get() = _watch

    fun loadSilenceTimes(watchId: String) {
        _silenceTimeList.value = Resource(Resource.Status.LOADING)
        lateinit var watch: Wearer
        lateinit var silenceTimes: List<ParseObject>
        viewModelScope.launch(ioContext) {
            runCatching {
                watch = watchUserRepository.findWatchById(watchId)
                silenceTimes = silenceTimeRepository.getWatchSilenceTimes(watch)
            }.onSuccess {
                _watch.postValue(watch)
                _silenceTimeList.postValue(Resource(Resource.Status.LOAD_SUCCESS, silenceTimes))
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error loading silence times")
                    recordException(it)
                }
                _silenceTimeList.postValue(Resource(Resource.Status.LOAD_ERROR))
            }
        }
    }
}