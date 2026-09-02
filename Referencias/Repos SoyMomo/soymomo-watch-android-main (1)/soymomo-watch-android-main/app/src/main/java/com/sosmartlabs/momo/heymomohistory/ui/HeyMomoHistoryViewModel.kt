package com.sosmartlabs.momo.heymomohistory.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.heymomohistory.data.HeyMomoHistoryRepository
import com.sosmartlabs.momo.heymomohistory.data.model.Fact
import com.sosmartlabs.momo.heymomohistory.data.model.HeyMomoHistoryItem
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class HeyMomoHistoryViewModel @Inject constructor(private val heyMomoHistoryRepository: HeyMomoHistoryRepository): ViewModel() {

    private val _heyMomoHistory = MutableLiveData<Resource<List<HeyMomoHistoryItem>, Unit>>()
    val heyMomoHistory: LiveData<Resource<List<HeyMomoHistoryItem>, Unit>>
        get() = _heyMomoHistory

    private val _facts = MutableLiveData<Resource<List<Fact>, Unit>>()
    val facts: LiveData<Resource<List<Fact>, Unit>>
        get() = _facts

    private val _factOperation = MutableSharedFlow<Resource<Fact, Unit>>(
        replay = 0,
        extraBufferCapacity = 1
    )
    val factOperation: SharedFlow<Resource<Fact, Unit>> = _factOperation.asSharedFlow()

    @Volatile
    private var isLoadingMoreHistory = false

    fun getHeyMomoHistory(deviceId: String) {
        viewModelScope.launch {
            // Stale-while-revalidate: render cached history instantly (no spinner) and refresh
            // in the background. Skip this when something is already on screen (in-activity
            // re-navigation or pull-to-refresh) so we don't flash a spinner or cut the
            // pull-to-refresh affordance short; only show the loading state on a cold start.
            val cached = heyMomoHistoryRepository.cachedHeyMomoHistory(deviceId)
            val alreadyShowingData = _heyMomoHistory.value?.status == Resource.Status.LOAD_SUCCESS
            if (!alreadyShowingData) {
                if (cached != null) {
                    _heyMomoHistory.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = cached))
                } else {
                    _heyMomoHistory.postValue(Resource(status = Resource.Status.LOADING))
                }
            }
            try {
                val response = heyMomoHistoryRepository.refreshHeyMomoHistory(deviceId)
                _heyMomoHistory.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = response))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e)
                CrashlyticsLog.recordNonFatalError(e, "HeyMomoHistory: failed to fetch history for device $deviceId")
                // Always emit a terminal state so the observer clears the (pull-to-refresh) spinner.
                // Keep showing cached data if we have it; only surface the error screen otherwise.
                if (cached != null) {
                    _heyMomoHistory.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = cached))
                } else {
                    _heyMomoHistory.postValue(Resource(status = Resource.Status.LOAD_ERROR))
                }
            }
        }
    }

    fun loadMoreHeyMomoHistory(deviceId: String) {
        if (isLoadingMoreHistory || !heyMomoHistoryRepository.hasMoreHeyMomoHistory(deviceId)) return
        isLoadingMoreHistory = true
        viewModelScope.launch {
            try {
                val response = heyMomoHistoryRepository.loadMoreHeyMomoHistory(deviceId)
                _heyMomoHistory.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = response))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e)
                CrashlyticsLog.recordNonFatalError(e, "HeyMomoHistory: failed to load more history for device $deviceId")
            } finally {
                isLoadingMoreHistory = false
            }
        }
    }

    fun getFacts(deviceId: String, deviceType: String = "watch") {
        viewModelScope.launch {
            _facts.postValue(Resource(status = Resource.Status.LOADING))
            try {
                val response = heyMomoHistoryRepository.getFactsList(deviceId, deviceType)
                _facts.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = response))
            } catch (e: Exception) {
                Timber.e(e, "Error fetching facts")
                _facts.postValue(Resource(status = Resource.Status.LOAD_ERROR))
            }
        }
    }

    fun addFact(deviceId: String, deviceType: String = "watch", fact: Fact) {
        viewModelScope.launch {
            _factOperation.emit(Resource(status = Resource.Status.LOADING))
            try {
                val response = heyMomoHistoryRepository.addFact(deviceId, deviceType, fact)
                _factOperation.emit(Resource(status = Resource.Status.LOAD_SUCCESS, data = response))
                // Refresh facts list
                getFacts(deviceId, deviceType)
            } catch (e: Exception) {
                Timber.e(e, "Error adding fact")
                _factOperation.emit(Resource(status = Resource.Status.LOAD_ERROR))
            }
        }
    }

    fun updateFact(deviceId: String, deviceType: String = "watch", fact: Fact) {
        viewModelScope.launch {
            _factOperation.emit(Resource(status = Resource.Status.LOADING))
            try {
                val response = heyMomoHistoryRepository.updateFact(deviceId, deviceType, fact)
                _factOperation.emit(Resource(status = Resource.Status.LOAD_SUCCESS, data = response))
                // Refresh facts list
                getFacts(deviceId, deviceType)
            } catch (e: Exception) {
                Timber.e(e, "Error updating fact")
                _factOperation.emit(Resource(status = Resource.Status.LOAD_ERROR))
            }
        }
    }

    fun deleteFact(factId: String, deviceId: String, deviceType: String = "watch") {
        viewModelScope.launch {
            _factOperation.emit(Resource(status = Resource.Status.LOADING))
            try {
                heyMomoHistoryRepository.deleteFact(factId, deviceId)
                _factOperation.emit(Resource(status = Resource.Status.DELETING_SUCCESS))
                // Refresh facts list
                getFacts(deviceId, deviceType)
            } catch (e: Exception) {
                Timber.e(e, "Error deleting fact")
                _factOperation.emit(Resource(status = Resource.Status.DELETING_ERROR))
            }
        }
    }
}