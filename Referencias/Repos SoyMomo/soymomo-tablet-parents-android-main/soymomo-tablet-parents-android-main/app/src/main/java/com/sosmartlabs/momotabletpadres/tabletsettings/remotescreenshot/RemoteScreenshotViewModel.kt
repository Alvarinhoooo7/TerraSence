package com.sosmartlabs.momotabletpadres.tabletsettings.remotescreenshot

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.parse.ParseCloud
import com.parse.ParseException
import com.parse.ParseObject
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tabletsettings.interfaces.TableListState
import com.sosmartlabs.momotabletpadres.tabletsettings.remotescreenshot.model.RemoteScreenshot
import com.sosmartlabs.momotabletpadres.repositories.RemoteScreenshotRepository
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.concurrent.TimeUnit
import javax.inject.Inject

@HiltViewModel
class RemoteScreenshotViewModel @Inject constructor(
    application: Application,
    private val remoteScreenshotRepository: RemoteScreenshotRepository
) : AndroidViewModel(application) {

    val remoteScreenshotList = MutableLiveData<List<RemoteScreenshot>>()
    val tableListState = MutableLiveData<TableListState>()

    private var pollingJob: Job? = null
    private val POLLING_INTERVAL_MS = TimeUnit.SECONDS.toMillis(5) // 5 seconds

    // Track the last known screenshot count to detect changes
    private var lastKnownScreenshotCount = 0

    fun startPollingScreenshots(tablet: Tablet) {
        Timber.d("RemoteScreenshotViewModel: startPollingScreenshots - Called for tabletId=${tablet.objectId}")
        stopPolling()
        Timber.d("RemoteScreenshotViewModel: startPollingScreenshots - Previous polling job stopped (if any), starting new polling job for tabletId=${tablet.objectId}")
        pollingJob = viewModelScope.launch(Dispatchers.IO) {
            while (isActive) {
                Timber.v("RemoteScreenshotViewModel: startPollingScreenshots - Polling cycle started for tabletId=${tablet.objectId}")
                loadRemoteScreenshots(tablet)
                delay(POLLING_INTERVAL_MS)
            }
        }
    }

    fun stopPolling() {
        Timber.d("RemoteScreenshotViewModel: stopPolling - Called, cancelling polling job if exists")
        pollingJob?.cancel()
        pollingJob = null
        Timber.d("RemoteScreenshotViewModel: stopPolling - Polling job cancelled and set to null")
    }

    private fun loadRemoteScreenshots(tablet: Tablet) {
        Timber.d("RemoteScreenshotViewModel: loadRemoteScreenshots - Start loading screenshots for tabletId=${tablet.objectId}")
        if (remoteScreenshotList.value == null) {
            Timber.d("RemoteScreenshotViewModel: loadRemoteScreenshots - First load, setting TableListState.Loading")
            tableListState.postValue(TableListState.Loading)
        }

        viewModelScope.launch(Dispatchers.IO) {
            Timber.d("RemoteScreenshotViewModel: loadRemoteScreenshots - Launching coroutine to fetch screenshots for tabletId=${tablet.objectId}")
            runCatching {
                Timber.d("RemoteScreenshotViewModel: loadRemoteScreenshots - Fetching screenshots from repository for tabletId=${tablet.objectId}")
                remoteScreenshotRepository.getScreenshots(tablet) ?: emptyList()
            }.onSuccess { screenshots ->
                Timber.d("RemoteScreenshotViewModel: loadRemoteScreenshots - Successfully fetched ${screenshots.size} screenshots for tabletId=${tablet.objectId}")

                if (screenshots.size > lastKnownScreenshotCount && lastKnownScreenshotCount > 0) {
                    Timber.i("RemoteScreenshotViewModel: loadRemoteScreenshots - New screenshot detected! Count increased from $lastKnownScreenshotCount to ${screenshots.size} for tabletId=${tablet.objectId}")
                    CrashlyticsLog.log("RemoteScreenshotViewModel: loadRemoteScreenshots - New screenshot detected! Count increased from $lastKnownScreenshotCount to ${screenshots.size} for tabletId=${tablet.objectId}")
                }
                lastKnownScreenshotCount = screenshots.size

                if (screenshots.isNotEmpty()) {
                    Timber.d("RemoteScreenshotViewModel: loadRemoteScreenshots - Posting TableListState.Populated and updating remoteScreenshotList for tabletId=${tablet.objectId}")
                    tableListState.postValue(TableListState.Populated)
                    remoteScreenshotList.postValue(screenshots)
                } else {
                    Timber.d("RemoteScreenshotViewModel: loadRemoteScreenshots - No valid screenshots found, posting TableListState.Empty for tabletId=${tablet.objectId}")
                    tableListState.postValue(TableListState.Empty)
                    remoteScreenshotList.postValue(emptyList())
                }

                screenshots.forEach { screenshot ->
                    Timber.v("RemoteScreenshotViewModel: loadRemoteScreenshots - Screenshot: objectId=${screenshot.objectId}, url=${screenshot.screenshot?.url}, hasReachedTablet=${screenshot.hasReachedTablet}")
                }
            }.onFailure { throwable ->
                Timber.e(throwable, "RemoteScreenshotViewModel: loadRemoteScreenshots - Error loading remote screenshots for tabletId=${tablet.objectId}")
                CrashlyticsLog.log("RemoteScreenshotViewModel: loadRemoteScreenshots - Error loading remote screenshots for tabletId=${tablet.objectId}: ${throwable.message}")
                CrashlyticsLog.recordNonFatalError(throwable, "RemoteScreenshotViewModel: loadRemoteScreenshots - Exception: ${throwable.message}")
                if (remoteScreenshotList.value.isNullOrEmpty()) {
                    Timber.e("RemoteScreenshotViewModel: loadRemoteScreenshots - No data available, posting TableListState.Error for tabletId=${tablet.objectId}")
                    tableListState.postValue(TableListState.Error)
                } else {
                    Timber.w("RemoteScreenshotViewModel: loadRemoteScreenshots - Error occurred but data is present, not posting error state for tabletId=${tablet.objectId}")
                }
            }
        }
    }

    fun requestRemoteScreenshot(
        user: ParseUser,
        tablet: Tablet,
        callback: (ParseException?, success: Boolean, message: String?) -> Unit
    ) {
        Timber.d("RemoteScreenshotViewModel: requestRemoteScreenshot - Requesting screenshot for tabletId=${tablet.objectId}, userId=${user.objectId}")
        val parameters = HashMap<String, String>().apply {
            put("tabletId", tablet.objectId!!)
            put("userId", user.objectId)
        }

        // The backend returns a JSON object, not a ParseObject
        ParseCloud.callFunctionInBackground<Map<String, Any>>(
            "remoteScreenshot_v2",
            parameters
        ) { result, error ->
            var success = false
            var message: String?

            if (error != null) {
                Timber.e(error, "RemoteScreenshotViewModel: requestRemoteScreenshot - Error requesting remote screenshot for tabletId=${tablet.objectId}, userId=${user.objectId}")
                CrashlyticsLog.log("RemoteScreenshotViewModel: requestRemoteScreenshot - Error requesting remote screenshot for tabletId=${tablet.objectId}, userId=${user.objectId}: ${error.message}")
                CrashlyticsLog.recordNonFatalError(error, "RemoteScreenshotViewModel: requestRemoteScreenshot - Exception: ${error.message}")
                message = error.message
            } else if (result != null) {
                // Parse the backend response
                success = (result["success"] as? Boolean) == true
                message = result["message"] as? String ?: result["error"] as? String

                if (success) {
                    Timber.d("RemoteScreenshotViewModel: requestRemoteScreenshot - Screenshot request successful for tabletId=${tablet.objectId}, userId=${user.objectId}, result=$result")
                    // Optimistically add the new screenshot to the list
                    val newScreenshot = result["screenshot"] as? RemoteScreenshot
                    if (newScreenshot != null) {
                        Timber.d("RemoteScreenshotViewModel: requestRemoteScreenshot - Successfully parsed new screenshot with objectId=${newScreenshot.objectId}")
                        val currentList = remoteScreenshotList.value ?: emptyList()
                        val newList = mutableListOf(newScreenshot).apply { addAll(currentList) }
                        remoteScreenshotList.postValue(newList)
                        lastKnownScreenshotCount = newList.size
                        if (tableListState.value != TableListState.Populated) {
                            tableListState.postValue(TableListState.Populated)
                        }
                    } else {
                        Timber.w("RemoteScreenshotViewModel: requestRemoteScreenshot - Could not parse new screenshot from backend response, falling back to full refresh.")
                        // Fallback to a full refresh if parsing fails
                        viewModelScope.launch(Dispatchers.IO) {
                            loadRemoteScreenshots(tablet)
                        }
                    }
                } else {
                    Timber.w("RemoteScreenshotViewModel: requestRemoteScreenshot - Backend returned failure for tabletId=${tablet.objectId}, userId=${user.objectId}, message=$message")
                    CrashlyticsLog.log("RemoteScreenshotViewModel: requestRemoteScreenshot - Backend returned failure for tabletId=${tablet.objectId}, userId=${user.objectId}: $message")
                }
            } else {
                Timber.e("RemoteScreenshotViewModel: requestRemoteScreenshot - Unknown error: result and error are both null for tabletId=${tablet.objectId}, userId=${user.objectId}")
                message = "Unknown error"
            }

            callback(error, success, message)
        }
    }

    override fun onCleared() {
        Timber.d("RemoteScreenshotViewModel: onCleared - ViewModel is being cleared, stopping polling")
        stopPolling()
        super.onCleared()
        Timber.d("RemoteScreenshotViewModel: onCleared - ViewModel cleared, polling stopped")
    }
}