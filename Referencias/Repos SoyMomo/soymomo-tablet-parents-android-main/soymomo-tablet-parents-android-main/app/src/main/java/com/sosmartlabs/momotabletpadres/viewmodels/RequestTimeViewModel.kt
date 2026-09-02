package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.appinfo.model.AppInfo
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.repositories.AppInfoRepositoryImpl
import com.sosmartlabs.momotabletpadres.repositories.RequestTimeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class RequestTimeViewModel @Inject constructor(
    application: Application,
    private val requestTimeRepository: RequestTimeRepository,
    private val appInfoRepository: AppInfoRepositoryImpl
) : AndroidViewModel(application) {

    /**
     * SnackBarEvent trigger
     */
    private var _showSnackbarEvent = MutableLiveData<Boolean>()
    val showSnackbarEvent: LiveData<Boolean>
        get() = _showSnackbarEvent

    /**
     * time Limit from TimeLimitPickerDialog
     * initial value is 0.
     */
    private var _timeLimit = MutableLiveData<Int>(0)
    val timeLimit: LiveData<Int>
        get() = _timeLimit

    /**
     * appIcon from appInfo
     */
    private var _appIcon = MutableLiveData<String>()
    val appIcon: LiveData<String>
        get() = _appIcon

    /**
     * State of the request
     */
    private var _state = MutableLiveData<String>()
    val state: LiveData<String>
        get() = _state

    /**
     * requestId from notification passed to the fragment
     */
    private lateinit var requestId: String

    fun getRequestState(category: String) {
        lateinit var state: String
        viewModelScope.launch {
            state = when (category) {
                "request_time" -> requestTimeRepository.getRequestTimeByObjectId(requestId).state
                "request_time_app" -> requestTimeRepository.getRequestTimeAppByObjectId(requestId).state
                else -> "pending"
            }
            _state.value = state
        }
    }

    fun getAppIcon(packageName: String) {
        viewModelScope.launch {
            Timber.d("getAppIcon")
            val appInfo: AppInfo? = try {
                appInfoRepository.getAppInfoIconByPackageName(packageName)
            } catch (e: NullPointerException) {
                null
            }
            Timber.d("appInfo: $appInfo")
            if (appInfo == null) {
                _appIcon.value = ""
            } else {
                Timber.d("appInfo: $appInfo")
                _appIcon.value = appInfo.icon ?: ""
            }
        }
    }

    /**
     * Sets SnackBar event to false
     */
    fun doneShowingSnackbar() {
        _showSnackbarEvent.value = false
    }

    /**
     * Sets requestId
     * @param id requestId obtained from the notification bundle
     */
    fun setRequestId(id: String) {
        requestId = id
    }

    /**
     * Sets time limit
     */
    fun setTimeLimit(limit: Int) {
        Timber.d("Time limit set: $limit")
        _timeLimit.value = limit
    }

    /**
     * Called when User Accepts the Time requested
     * user should not be able to accept if timeLimit is not set.
     * Another snackbar event could be added to let the user know.
     */
    fun onAccept(tablet: Tablet) {
        viewModelScope.launch {
            if (_timeLimit.value!! > 0) {
                requestTimeRepository.updateRequestTime(
                    requestId,
                    tablet,
                    "accepted",
                    timeToAdd = _timeLimit.value!!.toLong()
                )
                _showSnackbarEvent.value = true
                _state.value = "accepted"
            }
        }
    }

    fun onReject(tablet: Tablet) {
        viewModelScope.launch {
            requestTimeRepository.deleteRequestTime(requestId, tablet)
            _showSnackbarEvent.value = true
            _state.value = "rejected"
        }
    }

    fun onAcceptTimeForApp(tablet: Tablet) {
        viewModelScope.launch {
            if (_timeLimit.value!! > 0) {
                requestTimeRepository.updateRequestTimeApp(
                    requestId,
                    tablet,
                    timeToAdd = _timeLimit.value!!.toLong()
                )
                _showSnackbarEvent.value = true
                _state.value = "accepted"
            }
        }
    }

    fun onRejectTimeForApp(tablet: Tablet) {
        viewModelScope.launch {
            requestTimeRepository.deleteRequestTimeApp(requestId, tablet)
            _showSnackbarEvent.value = true
            _state.value = "rejected"
        }
    }
}