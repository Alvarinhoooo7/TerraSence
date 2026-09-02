package com.sosmartlabs.momo.alarms.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.parse.ParseObject
import com.sosmartlabs.momo.alarms.model.AlarmsRepository
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class AlarmsViewModel @Inject constructor(private val ioContext: CoroutineContext,
                                          private val watchUserRepository: WatchUserRepository,
                                          private val alarmsRepository: AlarmsRepository
): ViewModel() {
    private val _alarmsList = MutableLiveData<Resource<List<ParseObject>, Unit>>()
    val alarmsList: LiveData<Resource<List<ParseObject>, Unit>> get() = _alarmsList

    private val _watch = MutableLiveData<Wearer>()
    val watch: LiveData<Wearer> get() = _watch

    fun loadAlarms(watchId: String) {
        _alarmsList.value = Resource(Resource.Status.LOADING)
        lateinit var alarms: List<ParseObject>
        lateinit var watch: Wearer
        viewModelScope.launch(ioContext) {
            runCatching {
                watch = watchUserRepository.findWatchById(watchId)
                alarms = alarmsRepository.getAlarms(watch)
            }.onSuccess {
                _watch.postValue(watch)
                _alarmsList.postValue(Resource(Resource.Status.LOAD_SUCCESS, alarms))
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error loading alarms")
                    recordException(it)
                }
                _alarmsList.postValue(Resource(Resource.Status.LOAD_ERROR))
            }
        }
    }
}