package com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.ui

import android.app.Application
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectedConversationsRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectorConstants
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.ui.DugBaseViewModel
import com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.model.DetectionScreenshots
import com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.model.DisplayedDetectedConversation
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber

abstract class DetectedConversationViewModelBase(application: Application) :
    DugBaseViewModel(application) {
    protected abstract val detectedConversationRepository: DetectedConversationsRepository

    protected val _detectedConversations = MutableLiveData<List<DisplayedDetectedConversation>>()
    val detectedConversations: LiveData<List<DisplayedDetectedConversation>> get() = _detectedConversations

    /**
     * Currently selected detected conversation.
     * Must be accessed from outside through [currentDetectedConversation] getter
     */
    private val _currentDetectedConversation = MutableLiveData<DisplayedDetectedConversation>()

    /**
     * Currently selected detected conversation.
     */
    val currentDetectedConversation: LiveData<DisplayedDetectedConversation> get() = _currentDetectedConversation

    /**
     * Sets the current conversation synchronously (must be called from main thread).
     * Use this when navigating directly to the detail fragment without going through
     * the category list fragment, to avoid race conditions with postValue.
     */
    fun setCurrentConversationDirect(conversation: DisplayedDetectedConversation) {
        _currentDetectedConversation.value = conversation
    }

    fun loadDetectedConversationsWithFilter(tablet: Tablet, interval: Int) {
        viewModelScope.launch(Dispatchers.IO) {
            lateinit var displayConversations: List<DisplayedDetectedConversation>
            setLoading()
            runCatching {
                Timber.d("Loading detected conversations")
                val conversations =
                    detectedConversationRepository.getDetectedConversationsWithoutMoodDetections(
                        tablet.objectId,
                        if (interval == DateUtil.EVERYTHING) null else DateUtil.findStartDateByInterval(
                            interval
                        )
                    )
                Timber.d("Detected conversations: $conversations")

                val appsList = (conversations.map { it.appName!! }).distinct()

                Timber.d("Loading installed apps")
                val appNamesMap = installedAppsRepository
                    .getTabletInstalledAppNamesByPackageName(tablet.objectId, appsList)
                    .associateBy({ it.packageName }, { it.appName })

                val appIcons = getAppIcons(appsList)

                Timber.d("Mapping detected conversations")
                displayConversations = conversations.map {
                    DisplayedDetectedConversation(appNamesMap[it.appName], appIcons[it.appName], it)
                }
            }.onSuccess {
                Timber.d("Posting detected conversation values")
                _detectedConversations.postValue(displayConversations)
                if (displayConversations.isNotEmpty()) setPopulatedList()
                else setEmptyList()
            }.onFailure {
                Timber.e(it)
                CrashlyticsLog.recordNonFatalError(it, "Error on loading detected conversations")
                setError()
            }
        }
    }

    fun loadCurrentDetectedConversation(conversation: DisplayedDetectedConversation) {
        Timber.d("Loading current detected conversation")
        if (conversation.screenshots != null) {
            Timber.d("Already has screenshots")
            _currentDetectedConversation.postValue(conversation)
            return
        }

        Timber.d("Loading screenshots")
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                with(conversation.detectedConversation) {
                    detectedConversationRepository
                        .loadDetectedConversationScreenshots(this)

                    val mainScreenshotIndex = (screenshots.size - 1) / 2
                    val detectionScreenshots = conversation.detectedConversation.screenshots
                    _currentDetectedConversation.postValue(conversation.apply {
                        this.screenshots = DetectionScreenshots(
                            mainScreenshot = detectionScreenshots[mainScreenshotIndex],
                            previousScreenshot = if (mainScreenshotIndex != 0)
                                detectionScreenshots.first()
                            else null,
                            nextScreenshot = if (mainScreenshotIndex < detectionScreenshots.lastIndex)
                                detectionScreenshots.last()
                            else null
                        )
                    })
                }
            } .onFailure {
                Timber.e(it, "Error loading detected conversation screenshots")
                CrashlyticsLog.recordNonFatalError(it, "Error loading detected conversation screenshots")
            }
        }
    }

    fun hasDetectionFeedback() : LiveData<Boolean> {
        val result = MutableLiveData<Boolean>()
        if (_currentDetectedConversation.value!!.detectedConversation.hasFeedback != null) {
            if (_currentDetectedConversation.value!!.detectedConversation.hasFeedback!!) {
                Timber.i("Heyyyyy: Already has feedback, local check")
                result.postValue(true)
            } else {
                viewModelScope.launch(Dispatchers.IO) {
                    runCatching {
                        Timber.i("Heyyyyy: Remote check")
                        detectedConversationRepository.fetchDugDetectionFeedback(
                            _currentDetectedConversation.value!!.detectedConversation.objectId!!
                        )
                    }.onSuccess { list ->
                        Timber.i("Dug feedback result: $list")
                        result.postValue(list)
                        _currentDetectedConversation.value!!.detectedConversation.hasFeedback = list
                    }.onFailure {
                        Timber.e("Error asking Detection Feedback")
                        result.postValue(true)
                    }
                }
            }
        } else {
            viewModelScope.launch(Dispatchers.IO) {
                runCatching {
                    Timber.i("Heyyyyy: Remote check")
                    detectedConversationRepository.fetchDugDetectionFeedback(_currentDetectedConversation.value!!.detectedConversation.objectId!!)
                }.onSuccess { list ->
                    Timber.i("Dug feedback result: $list")
                    result.postValue(list)
                    _currentDetectedConversation.value!!.detectedConversation.hasFeedback = list
                }.onFailure {
                    Timber.e("Error asking Detection Feedback")
                    result.postValue(true)
                }
            }
        }
        return result
    }

    fun sendDetectionFeedback(isCorrect: Boolean, tablet: Tablet) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                Timber.i("Sending dug feedback, ${_currentDetectedConversation.value!!.detectedConversation.objectId}, $isCorrect, ${_currentDetectedConversation.value!!.detectedConversation.riskFactor}")

                var type: String = "MESSAGE"

                if (_currentDetectedConversation.value!!.detectedConversation.totalGroomingScore!! > DetectorConstants.GROOMING_LOW_SCORE_THRESHOLD) {
                    type = "GROOMING"
                } else if (_currentDetectedConversation.value!!.detectedConversation.totalProfanityScore!! > 0) {
                    type = "CYBERBULLYING"
                }

                detectedConversationRepository.sendDugDetectionFeedback(
                    _currentDetectedConversation.value!!.detectedConversation.objectId,
                    isCorrect,
                    type,
                    tablet
                )
            }.onSuccess { list ->
                Timber.i("Dug feedback send!!")
            }.onFailure {
                Timber.e("Error asking Detection Feedback, ${it}")
            }
        }
    }
}