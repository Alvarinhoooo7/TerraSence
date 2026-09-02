package com.sosmartlabs.momotabletpadres.core.settings.dug.mooddetection.ui

import android.app.Application
import android.graphics.drawable.Drawable
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectedConversation
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectedConversationsRepository
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.ui.DugBaseViewModel
import com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.model.DetectionScreenshots
import com.sosmartlabs.momotabletpadres.core.settings.dug.mooddetection.model.MoodDetection
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber

/**
 * Base ViewModel for mood detections
 */
abstract class MoodSearchesViewModelBase(application: Application) : DugBaseViewModel(application) {

    /**
     * LiveData for showing a list of [MoodDetection] in UI.
     * Private field, must be accesses through [moodDetections] property
     */
    protected val _moodDetections = MutableLiveData<List<MoodDetection>>()

    /**
     * LiveData for showing a list of [MoodDetection] in UI.
     */
    val moodDetections: LiveData<List<MoodDetection>> get() = _moodDetections

    /**
     * Local detectedConversation cache mapped by objectId
     */
    private lateinit var detectedConversations: Map<String, DetectedConversation>

    /**
     * LiveData for obtaining the current selected detection.
     * Private field, must be accesses through [currentDetection] property
     */
    private val _currentDetection = MutableLiveData<MoodDetection>()

    /**
     * LiveData for obtaining the current selected detection
     */
    val currentDetection: LiveData<MoodDetection> get() = _currentDetection

    /**
     * Repository for access to Detected Conversations data
     */
    protected abstract val detectedConversationsRepository: DetectedConversationsRepository

    /**
     * Loads the mood detections for the given tablet and interval
     * @param tablet Tablet to query their mood detections
     */
    fun getMoodDetectionsWithTimeFilter(tablet: Tablet) {
        viewModelScope.launch(Dispatchers.IO) {
            setLoading()
            runCatching {
                detectedConversationsRepository.getMoodDetectedConversations(tablet.objectId,null)
            }.onSuccess { detectedConversations ->
                val appPackageNames = detectedConversations.map { detectedConversation -> detectedConversation.appName!! }.distinct()
                val installedAppNamesMap = getAppNames(tablet, appPackageNames)
                val appIcons: Map<String, Drawable> = getAppIcons(appPackageNames)

                val detections = detectedConversations.map {
                    MoodDetection(
                        objectId = it.objectId,
                        appName = installedAppNamesMap[it.appName!!] ?: it.appName!!,
                        packageName = it.appName,
                        appIcon = appIcons[it.appName!!],
                        date = it.date!!,
                        text = it.logEntries.maxByOrNull{logEntry ->logEntry.moodScore}?.message ?: "",
                        totalMoodScore = it.totalMoodScore!!,
                        riskFactors = it.riskFactor?.split(',') ?: emptyList(),
                        hasFeedback = it.hasFeedback,
                    )
                }
                this@MoodSearchesViewModelBase.detectedConversations = detectedConversations.associateBy { it.objectId }
                _moodDetections.postValue(detections)
                if (detections.isEmpty()) setEmptyList() else setPopulatedList()
            }.onFailure {
                Timber.e(it)
                CrashlyticsLog.recordNonFatalError(it, "Error loading Mood detections")
                setError()
            }
        }
    }

    /**
     * Sets the current selected detection
     * @param detection Current selected detection
     */
    fun setCurrentSelectedDetection(detection: MoodDetection) {
        if (detection.screenshots != null) {
            _currentDetection.value = detection
        }
        else viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                // Use local cache if available, otherwise create a stub for the repository lookup
                val cached = if (::detectedConversations.isInitialized) {
                    detectedConversations[detection.objectId]
                } else null
                val currentDetectedConversation = cached ?: DetectedConversation(
                    objectId = detection.objectId, appName = null, date = null,
                    senderName = null, logEntries = emptyList(), screenshots = emptyList(),
                    totalProfanityScore = null, totalGroomingScore = null,
                    totalMoodScore = null, modelVersionName = null,
                    riskFactor = null, modelSize = null, hasFeedback = null
                )
                detectedConversationsRepository.loadDetectedConversationScreenshots(currentDetectedConversation)
                val screenshots = currentDetectedConversation.screenshots
                if (screenshots.isNotEmpty()) {
                    val mainScreenshotIndex = (screenshots.size - 1) / 2
                    detection.screenshots = DetectionScreenshots(
                        mainScreenshot = screenshots[mainScreenshotIndex],
                        previousScreenshot = if (mainScreenshotIndex != 0) screenshots.first() else null,
                        nextScreenshot = if (mainScreenshotIndex < screenshots.lastIndex) screenshots.last() else null
                    )
                }
            }.onFailure {
                Timber.e(it, "Error loading screenshots for mood detection ${detection.objectId}")
            }
            _currentDetection.postValue(detection)
        }
    }

    fun hasDetectionFeedback() : LiveData<Boolean> {
        val result = MutableLiveData<Boolean>()

        val hasAttribute : Boolean = MoodDetection::class.members.any { it.name == "hasFeedback" }

        if (!hasAttribute) {
            if (_currentDetection.value!!.hasFeedback != null) {
                result.postValue(true)
            } else {
                viewModelScope.launch(Dispatchers.IO) {
                    runCatching {
                        detectedConversationsRepository.fetchDugDetectionFeedback(_currentDetection.value!!.objectId!!)
                    }.onSuccess { list ->
                        Timber.i("Dug feedback result: $list")
                        result.postValue(list)
                        //_currentSelectedSearch.value!!.detectedSearch.hasFeedback = list
                    }.onFailure {
                        Timber.e("Error asking Detection Feedback")
                        result.postValue(true)
                    }
                }
            }
            return result
        } else {
            result.postValue(true)
            return result
        }
    }

    fun sendDetectionFeedback(isCorrect: Boolean, tablet: Tablet) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                detectedConversationsRepository.sendDugDetectionFeedback(
                    _currentDetection.value!!.objectId!!,
                    isCorrect,
                    "MOOD",
                    tablet
                )
            }.onSuccess { list ->
                Timber.i("Dug feedback result: $list")
                _currentDetection.value!!.hasFeedback = list
            }.onFailure {
                Timber.e("Error asking Detection Feedback")
            }
        }
    }
}