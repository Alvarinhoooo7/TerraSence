package com.sosmartlabs.momo.videocall.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parse.ParseQuery
import com.parse.coroutines.callCloudFunction
import com.sosmartlabs.momo.main.model.UserRepository
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.videocall.model.IceServerData
import com.sosmartlabs.momo.videocall.model.VideocallFeedback
import com.sosmartlabs.momo.videocall.model.VideocallFeedbackRepository
import com.sosmartlabs.momo.videocall.repository.IceServerRepository
import com.sosmartlabs.momo.videocall.soymomowebrtc.interfaces.VideocallState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class VideocallViewModel @Inject constructor(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val videocallFeedbackRepository: VideocallFeedbackRepository,
    private val iceServerRepository: IceServerRepository,
    private val userRepository: UserRepository,
    private val watchUserRepository: WatchUserRepository
) : ViewModel() {

    // --- State and LiveData ---

    private var _currentFeedback: VideocallFeedback? = null

    private val _currentFeedbackUUID = MutableLiveData<UUID?>(null)
    val currentFeedbackUUID: LiveData<UUID?> get() = _currentFeedbackUUID

    private val _videocallStatus = MutableLiveData<VideocallState>()
    val videocallStatus: LiveData<VideocallState> get() = _videocallStatus

    private val _elapsedCallTime = MutableLiveData(0)
    val elapsedCallTime: LiveData<Int> get() = _elapsedCallTime

    private var elapsedVideocallTimeJob: Job? = null

    val callConnected = MutableLiveData(false)
    var isSpace3: Boolean = false

    private var _iceServerData = MutableLiveData<List<IceServerData>>()
    val iceServerData: LiveData<List<IceServerData>> get() = _iceServerData

    // --- Feedback Creation ---

    /**
     * Creates a new VideocallFeedback with the given data
     * @param deviceId Wearer device Id
     * @param caller Who made the call
     * @param room Room for video call
     * @return UUID associated with the videocall. Returns null if feedback is not required (for incoming calls)
     */
    fun createFeedbackIfNeeded(deviceId: String, caller: String, room: String) {
        if (caller != "user") {
            Timber.i("VideocallViewModel: Skipping feedback creation, caller is not user (caller=$caller)")
            return
        }
        val feedbackUuid = UUID.randomUUID()
        Timber.i("VideocallViewModel: Creating feedback for deviceId=$deviceId, caller=$caller, room=$room, uuid=$feedbackUuid")
        _currentFeedbackUUID.value = feedbackUuid

        externalScope.launch(ioContext) {
            try {
                Timber.d("VideocallViewModel: Fetching watch for deviceId=$deviceId")
                val watch = watchUserRepository.findWatchByDeviceId(deviceId)
                Timber.d("VideocallViewModel: Fetching current user")
                val user = userRepository.getCurrentUser()
                if (user == null) {
                    Timber.e("VideocallViewModel: User is null, cannot create feedback")
                    CrashlyticsLog.log("VideocallViewModel: User is null in createFeedbackIfNeeded")
                    return@launch
                }
                _currentFeedback = videocallFeedbackRepository.createFeedback(
                    user, watch, caller, room, feedbackUuid, false
                )
                Timber.i("VideocallViewModel: Feedback created for uuid=$feedbackUuid")
                if (isSpace3) {
                    Timber.d("VideocallViewModel: isSpace3 is true, checking call connected for room=$room")
                    checkCallConnected(room)
                }
            } catch (e: Exception) {
                Timber.e(e, "VideocallViewModel: Error creating feedback for deviceId=$deviceId, room=$room")
                CrashlyticsLog.recordNonFatalError(e, "VideocallViewModel: Error creating feedback for deviceId=$deviceId, room=$room")
            }
        }
    }

    // --- Videocall Lifecycle ---

    /**
     * Starts the current videocall
     */
    fun startVideocall() {
        Timber.i("VideocallViewModel: Starting videocall")
        if (elapsedVideocallTimeJob == null) {
            Timber.d("VideocallViewModel: Starting call time counter")
            elapsedVideocallTimeJob = countCallTime()
        } else {
            Timber.d("VideocallViewModel: Call time counter already running")
        }
        if (_currentFeedback != null) {
            Timber.d("VideocallViewModel: Marking feedback as success for uuid=${_currentFeedback?.uuid}")
            externalScope.launch(ioContext) {
                try {
                    videocallFeedbackRepository.markSuccessVideocall(_currentFeedback!!)
                    Timber.i("VideocallViewModel: Feedback marked as success for uuid=${_currentFeedback?.uuid}")
                } catch (e: Exception) {
                    Timber.e(e, "VideocallViewModel: Error marking feedback as success for uuid=${_currentFeedback?.uuid}")
                    CrashlyticsLog.recordNonFatalError(e, "VideocallViewModel: Error marking feedback as success for uuid=${_currentFeedback?.uuid}")
                }
            }
        } else {
            Timber.d("VideocallViewModel: No feedback to mark as success")
        }
        _videocallStatus.postValue(VideocallState.CONNECTED)
    }

    /**
     * Ends the current videocall, if any
     */
    fun endVideocall() {
        Timber.i("VideocallViewModel: Ending videocall")
        elapsedVideocallTimeJob?.cancel()
        elapsedVideocallTimeJob = null
        _videocallStatus.postValue(VideocallState.ENDED)
    }

    /**
     * Counts the elapsed time for a videocall
     */
    private fun countCallTime() = viewModelScope.launch {
        Timber.d("VideocallViewModel: Starting elapsed call time counter")
        var time = 0
        while (isActive) {
            runCatching {
                _elapsedCallTime.postValue(time)
                delay(TimeUnit.SECONDS.toMillis(1))
                time++
            }.onFailure {
                if (it is CancellationException) {
                    Timber.i("VideocallViewModel: Call time counter cancelled")
                    return@launch
                } else {
                    Timber.e(it, "VideocallViewModel: Error in call time counter")
                    CrashlyticsLog.recordNonFatalError(it, "VideocallViewModel: Error in call time counter")
                    throw it
                }
            }
        }
    }

    // --- Feedback Updates ---

    /**
     * Adds duration and rawStats to the VideoCall feedback
     * @param feedbackUUID UUID for the videocall to rate
     * @param duration Duration of the videocall
     */
    fun addDurationToFeedback(feedbackUUID: UUID, duration: Int) {
        Timber.i("VideocallViewModel: Adding duration to feedback uuid=$feedbackUUID, duration=$duration")
        externalScope.launch(ioContext) {
            try {
                if (_currentFeedback?.uuid != feedbackUUID.toString()) {
                    Timber.d("VideocallViewModel: Current feedback uuid does not match, fetching from repository")
                    _currentFeedback = videocallFeedbackRepository.getFeedback(feedbackUUID)
                    _currentFeedbackUUID.postValue(feedbackUUID)
                }
                if (_currentFeedback != null) {
                    videocallFeedbackRepository.addDurationToFeedback(_currentFeedback!!, duration)
                    Timber.i("VideocallViewModel: Duration added to feedback uuid=$feedbackUUID")
                } else {
                    Timber.e("VideocallViewModel: No feedback found to add duration for uuid=$feedbackUUID")
                    CrashlyticsLog.log("VideocallViewModel: No feedback found to add duration for uuid=$feedbackUUID")
                }
            } catch (e: Exception) {
                Timber.e(e, "VideocallViewModel: Error adding duration to feedback uuid=$feedbackUUID")
                CrashlyticsLog.recordNonFatalError(e, "VideocallViewModel: Error adding duration to feedback uuid=$feedbackUUID")
            }
        }
    }

    /**
     * Adds a rating to the VideoCall feedback
     * @param feedbackUUID UUID for the videocall to rate
     * @param rating Rating given to the videocall
     */
    fun addRatingToFeedback(feedbackUUID: UUID, rating: Int) {
        Timber.i("VideocallViewModel: Adding rating to feedback uuid=$feedbackUUID, rating=$rating")
        externalScope.launch(ioContext) {
            try {
                if (_currentFeedback?.uuid != feedbackUUID.toString()) {
                    Timber.d("VideocallViewModel: Current feedback uuid does not match, fetching from repository")
                    _currentFeedback = videocallFeedbackRepository.getFeedback(feedbackUUID)
                }
                if (_currentFeedback != null) {
                    videocallFeedbackRepository.addRatingToFeedback(_currentFeedback!!, rating)
                    Timber.i("VideocallViewModel: Rating added to feedback uuid=$feedbackUUID")
                } else {
                    Timber.e("VideocallViewModel: No feedback found to add rating for uuid=$feedbackUUID")
                    CrashlyticsLog.log("VideocallViewModel: No feedback found to add rating for uuid=$feedbackUUID")
                }
            } catch (e: Exception) {
                Timber.e(e, "VideocallViewModel: Error adding rating to feedback uuid=$feedbackUUID")
                CrashlyticsLog.recordNonFatalError(e, "VideocallViewModel: Error adding rating to feedback uuid=$feedbackUUID")
            } finally {
                // Once feedback is rated, must not be changed anymore
                _currentFeedback = null
                _currentFeedbackUUID.postValue(null)
            }
        }
    }

    // --- Hangup and Connection ---

    /**
     * Sends a hangup signal to the given watch
     * @param deviceId Device Id for the watch to send signal
     */
    fun sendHangupSignalToWatch(deviceId: String) {
        Timber.i("VideocallViewModel: Sending hangup signal to watch deviceId=$deviceId")
        externalScope.launch(ioContext) {
            runCatching {
                CrashlyticsLog.log("VideocallViewModel: Calling cloud function videocallHangupWatch with deviceId=$deviceId")
                val params = mapOf(
                    "deviceId" to deviceId
                )
                // No `as Wearer` here. The cloud function has no return statement, so Parse hands
                // back null and the cast threw on EVERY successful hangup — after the push to the
                // watch had already been sent. The result is not used; a genuine failure arrives as
                // a thrown ParseException instead, which runCatching still reports.
                callCloudFunction<Any?>("videocallHangupWatch", params)
                Timber.i("VideocallViewModel: Hangup signal sent to deviceId=$deviceId")
            }.onFailure {
                Timber.e(it, "VideocallViewModel: Error sending hangup signal to deviceId=$deviceId")
                CrashlyticsLog.recordNonFatalError(it, "VideocallViewModel: Error on videocallHangupWatch cloud function for deviceId=$deviceId")
            }
        }
    }

    /**
     * Checks if the call is connected for Space3 devices, with retries
     */
    private fun checkCallConnected(room: String, attempt: Int = 1) {
        if (attempt == 10) {
            Timber.w("VideocallViewModel: checkCallConnected reached max attempts for room=$room")
            CrashlyticsLog.log("VideocallViewModel: checkCallConnected reached max attempts for room=$room")
            return
        }
        Timber.d("VideocallViewModel: checkCallConnected attempt $attempt for room=$room")
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val feedback = ParseQuery.getQuery<VideocallFeedback>("VideocallFeedback")
                    .whereEqualTo("room", room)
                    .orderByDescending("createdAt")
                    .first
                if (feedback.receiverConnected != true) {
                    Timber.d("VideocallViewModel: Receiver not connected yet for room=$room, retrying in 2s (attempt $attempt)")
                    delay(2_000)
                    checkCallConnected(room, attempt + 1)
                } else {
                    Timber.i("VideocallViewModel: Receiver connected for room=$room")
                    callConnected.postValue(true)
                }
            } catch (e: Exception) {
                Timber.e(e, "VideocallViewModel: Error checking call connected for room=$room (attempt $attempt)")
                CrashlyticsLog.recordNonFatalError(e, "VideocallViewModel: Error checking call connected for room=$room (attempt $attempt)")
            }
        }
    }

    // --- ICE Server ---

    fun getIceServerData(deviceId: String) {
        Timber.i("VideocallViewModel: Getting ICE server data for deviceId=$deviceId")
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                iceServerRepository.getIceServers(deviceId)
            }.onSuccess { iceServerData ->
                Timber.i("VideocallViewModel: ICE server data obtained: $iceServerData")
                _iceServerData.postValue(iceServerData)
            }.onFailure { exception ->
                Timber.e(exception, "VideocallViewModel: Error getting ICE server data for deviceId=$deviceId")
                CrashlyticsLog.recordNonFatalError(exception, "VideocallViewModel: Error getting ICE server data for deviceId=$deviceId")
            }
        }
    }

    // --- Lifecycle ---

    override fun onCleared() {
        Timber.i("VideocallViewModel: onCleared called, ending videocall")
        endVideocall()
        super.onCleared()
    }
}