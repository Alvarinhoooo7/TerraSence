package com.sosmartlabs.momo.videocallhistory.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.main.model.UserRepository
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.videocall.model.VideocallFeedback
import com.sosmartlabs.momo.videocall.model.VideocallFeedbackRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.util.*
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

/**
 * ViewModel for VideoCall History
 * @param ioContext Coroutine context for IO operations
 * @param videocallFeedbackRepository Repository for Videocall database access
 * @param userRepository Repository for obtaining the current user
 * @param watchUserRepository Repository for obtaining watch information
 */
@HiltViewModel
class VideoCallHistoryViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val videocallFeedbackRepository: VideocallFeedbackRepository,
    private val userRepository: UserRepository,
    private val watchUserRepository: WatchUserRepository): ViewModel() {

    /**
     * Enum for which selection of time range was made
     */
    internal enum class VideocallsTime {
        /**
         * Must show the video calls made today
         */
        TODAY,

        /**
         * Must show the video calls made during the last week
         */
        LAST_WEEK
    }

    /**
     * Videocalls from the last week
     */
    private var lastWeekVideocalls: List<VideocallFeedback>? = null

    /**
     * Indicates if must be shown videocalls from today or from the last week
     */
    private var showVideocallsTime: VideocallsTime = VideocallsTime.TODAY

    /**
     * LiveData for checking if the user has videocalls in her/his history.
     * Must be accessed through the [hasVideocalls] public getter from Activity
     */
    private val _hasVideocalls = MutableLiveData<Boolean>()

    /**
     * LiveData for checking if the user has videocalls in her/his history.
     */
    val hasVideocalls: LiveData<Boolean> get() = _hasVideocalls

    /**
     * LiveData for updating the VideocallFeedback list.
     * Must be accessed through the [videocallsFeedback] public getter from Activity
     */
    private val _videocallsFeedback = MutableLiveData<Resource<List<VideocallFeedback>, Unit>>()

    /**
     * LiveData for updating the VideocallFeedback list.
     */
    val videocallsFeedback: LiveData<Resource<List<VideocallFeedback>, Unit>> get() = _videocallsFeedback

    /**
     * Load today's video calls
     */
    fun getTodayVideocalls() {
        showVideocallsTime = VideocallsTime.TODAY
        if (lastWeekVideocalls.isNullOrEmpty()) getVideocallHistory()
        else showTodayVideocalls()
    }

    /**
     * Load last week's video calls
     */
    fun getLastWeekVideocalls() {
        showVideocallsTime = VideocallsTime.LAST_WEEK
        if (lastWeekVideocalls.isNullOrEmpty()) getVideocallHistory()
        else showLastWeekVideocalls()
    }

    /**
     * Obtains the videocall history from the database
     */
    private fun getVideocallHistory() {
        _videocallsFeedback.value = Resource(Resource.Status.LOADING)
        viewModelScope.launch(ioContext) {
            val user = userRepository.getCurrentUser()
            val lastWeekStart = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
                add(Calendar.DAY_OF_YEAR, -7)
            }.time
            runCatching {
                lastWeekVideocalls = videocallFeedbackRepository.getUserFeedback(user!!, lastWeekStart)
            }.onSuccess {
                if(lastWeekVideocalls.isNullOrEmpty()) {
                    _hasVideocalls.postValue(false)
                    return@launch
                }
                _hasVideocalls.postValue(true)
                lastWeekVideocalls!!.forEach {
                    it.watch = watchUserRepository.findWatchById(it.watch.objectId)
                }

                when(showVideocallsTime) {
                    VideocallsTime.TODAY -> showTodayVideocalls()
                    VideocallsTime.LAST_WEEK -> showLastWeekVideocalls()
                }
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error loading videocall history")
                    recordException(it)
                }
                _videocallsFeedback.postValue(Resource(Resource.Status.LOAD_ERROR))
            }
        }
    }

    /**
     * Show today's video calls
     */
    private fun showTodayVideocalls() {
        val todayStart = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.time
        val todayVideocalls = lastWeekVideocalls!!.filter {
            it.createdAt.after(todayStart) || it.createdAt.equals(todayStart)
        }
        _videocallsFeedback.postValue(Resource(Resource.Status.LOAD_SUCCESS, todayVideocalls))
    }

    /**
     * Show last week's video calls
     */
    private fun showLastWeekVideocalls() {
        _videocallsFeedback.postValue(Resource(Resource.Status.LOAD_SUCCESS, lastWeekVideocalls))
    }
}