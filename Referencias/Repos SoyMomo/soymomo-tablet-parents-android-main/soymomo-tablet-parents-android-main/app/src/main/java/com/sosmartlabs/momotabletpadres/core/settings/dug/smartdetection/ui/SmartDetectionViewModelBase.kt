package com.sosmartlabs.momotabletpadres.core.settings.dug.smartdetection.ui

import android.app.Application
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.core.common.dug.smartdetection.model.SmartDetectionRepository
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.ui.DugBaseViewModel
import com.sosmartlabs.momotabletpadres.core.settings.dug.smartdetection.model.DisplayedSmartDetection
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import kotlin.math.abs

abstract class SmartDetectionViewModelBase(application: Application) : DugBaseViewModel(application) {
    protected abstract val smartDetectionRepository: SmartDetectionRepository

    protected val _smartDetections = MutableLiveData<List<DisplayedSmartDetection>>()
    val smartDetections: LiveData<List<DisplayedSmartDetection>> get() = _smartDetections

    protected val _smartDetectionsGrouped = MutableLiveData<List<List<DisplayedSmartDetection>>>()
    val smartDetectionsGrouped: LiveData<List<List<DisplayedSmartDetection>>> get() = _smartDetectionsGrouped

    // Selected detection for detail view
    protected val _selectedDetection = MutableLiveData<DisplayedSmartDetection>()
    val selectedDetection: LiveData<DisplayedSmartDetection> get() = _selectedDetection

    fun setSelectedDetection(detection: DisplayedSmartDetection) {
        _selectedDetection.postValue(detection)
    }

    fun getSmartDetectionsWithTimeFilter(tablet: Tablet, interval: Int) {
        Timber.d("getSmartDetectionsWithTimeFilter: $interval, tablet: $tablet")
        viewModelScope.launch(Dispatchers.IO) {
            setLoading()
            runCatching {
                smartDetectionRepository.getSmartDetections(tablet,
                if (interval == DateUtil.EVERYTHING) null else DateUtil.findStartDateByInterval(interval))
            }.onSuccess {
                Timber.d("Smart detections: $it")
                val packageNames = it.map { detection -> detection.packageName!! }.distinct()
                val appIcons = getAppIcons(packageNames)
                _smartDetections.postValue(it.map { detection ->
                    DisplayedSmartDetection(
                        objectId = detection.objectId,
                        screenshot = detection.screenshot,
                        appName = detection.appName ?: detection.packageName,
                        appIcon = appIcons[detection.packageName],
                        createdAt = detection.createdAt,
                        isEncrypted = detection.isEncrypted,
                        encryptedScreenshotFile = detection.encryptedScreenshotFile,
                        encryptedMetadata = detection.encryptedMetadata
                    )
                })
                groupSmartDetectionsByTime(it.map { detection ->
                    DisplayedSmartDetection(
                        objectId = detection.objectId,
                        screenshot = detection.screenshot,
                        appName = detection.appName ?: detection.packageName,
                        appIcon = appIcons[detection.packageName],
                        createdAt = detection.createdAt,
                        isEncrypted = detection.isEncrypted,
                        encryptedScreenshotFile = detection.encryptedScreenshotFile,
                        encryptedMetadata = detection.encryptedMetadata
                    )
                })

                if (it.isNotEmpty()) setPopulatedList() else setEmptyList()
            }.onFailure {
                Timber.e("Error loading smart detections $it")
                Timber.e(it.stackTraceToString())
                CrashlyticsLog.recordNonFatalError(it, "Error loading smart detections")
                setError()
            }
        }
    }

    fun hasDetectionFeedback(smartDetection: DisplayedSmartDetection) : LiveData<Boolean> {
        val result = MutableLiveData<Boolean>()
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                smartDetectionRepository.fetchDugDetectionFeedback(
                    smartDetection.objectId!!
                )
            }.onSuccess { list ->
                Timber.i("Dug feedback result: $list")
                result.postValue(list)
            }.onFailure {
                Timber.e("Error asking Detection Feedback")
                result.postValue(true)
            }
        }
        return result
    }

    fun sendDetectionFeedback(isCorrect: Boolean, smartDetection: DisplayedSmartDetection) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                Timber.i("Sending dug feedback, ${smartDetection.objectId}, $isCorrect")
                smartDetectionRepository.sendDugDetectionFeedback(
                    smartDetection.objectId!!,
                    isCorrect,
                    "IMAGE"
                )
            }.onSuccess { list ->
                Timber.i("Dug feedback send!!")
            }.onFailure {
                Timber.e("Error asking Detection Feedback, ${it}")
            }
        }
    }

    fun groupSmartDetectionsByTime(smartDetections: List<DisplayedSmartDetection>) {
        val newList: MutableList<List<DisplayedSmartDetection>> = mutableListOf()
        for (i in smartDetections.indices) {
            val currentDetection = smartDetections[i]
            if (i == 0) {
                newList.add(listOf(currentDetection))
            } else {
                val lastDetection = smartDetections[i - 1]
                if (abs(currentDetection.createdAt.time - lastDetection.createdAt.time) < 1000 * 70 && currentDetection.appName == lastDetection.appName) {
                    newList[newList.size - 1] = newList[newList.size - 1] + currentDetection
                } else {
                    newList.add(listOf(currentDetection))
                }
            }
        }
        Timber.d("groupSmartDetectionsByTime: newList size: ${newList.map { it.size }}")

        _smartDetectionsGrouped.postValue(newList)
    }
}