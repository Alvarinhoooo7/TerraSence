package com.sosmartlabs.momotabletpadres.core.settings.dug.explicitmusic.ui

import android.app.Application
import android.graphics.drawable.Drawable
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model.ExplicitMusicRepository
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.ui.DugBaseViewModel
import com.sosmartlabs.momotabletpadres.core.settings.dug.explicitmusic.model.DisplayedExplicitMusicDetection
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber

/**
 * Base view model for explicit music detections
 */
abstract class ExplicitMusicViewModelBase(application: Application): DugBaseViewModel(application) {
    /**
     * Repository for obtaining explicit music detections
     */
    protected abstract val explicitMusicRepository: ExplicitMusicRepository

    /**
     * Live data for sending explicit music detection list to view for been displayed.
     * Private field, mus be accessed from outside using the [explicitMusicDetections] property
     */
    protected val _explicitMusicDetections = MutableLiveData<List<DisplayedExplicitMusicDetection>>()

    /**
     * Live data for sending explicit music detection list to view for been displayed.
     */
    val explicitMusicDetections: LiveData<List<DisplayedExplicitMusicDetection>> get() = _explicitMusicDetections

    private val _selectedDetection = MutableLiveData<DisplayedExplicitMusicDetection>()
    val selectedDetection: LiveData<DisplayedExplicitMusicDetection> get() = _selectedDetection

    /**
     * Obtains the explicit music detections for the given tablet and interval
     * @param tablet Tablet for finding explicit music detections
     * @param interval time interval from starting showing data. Must be one of the values defined on [DateUtil]
     */
    fun getExplicitMusicDetectionsWithTimeFilter(tablet: Tablet, interval: Int) {
        viewModelScope.launch(Dispatchers.IO) {
            setLoading()

            runCatching {
                explicitMusicRepository.getDetectedExplicitMusic(tablet,
                    if (interval == DateUtil.EVERYTHING) null else DateUtil.findStartDateByInterval(interval))
            }.onSuccess { musicDetections ->
                val appPackageNames = musicDetections.map { it.packageName }.distinct()
                val appIcons: Map<String, Drawable> = getAppIcons(appPackageNames)
                val appNames: Map<String, String> = getAppNames(tablet, appPackageNames)
                if (musicDetections.isEmpty()) setEmptyList() else setPopulatedList()
                _explicitMusicDetections.postValue(musicDetections.map {
                    DisplayedExplicitMusicDetection(
                        objectId = it.objectId,
                        appIcon = appIcons[it.packageName],
                        appName = appNames[it.packageName],
                        packageName = it.packageName,
                        songTitle = it.songTitle,
                        songImage = it.songImage,
                        detectedArtist = it.detectedArtist,
                        explicitArtistScore = 1.0,
                        detectionDate = it.detectionDate,
                        hasFeedback = it.hasFeedback
                    )
                })
            }.onFailure {
                Timber.e("Error loading Music detections $it")
                Timber.e(it.cause)
                CrashlyticsLog.recordNonFatalError(it, "Error loading Music detections")
                setError()
            }
        }
    }

    fun setSelectedDetection(detection: DisplayedExplicitMusicDetection) {
        _selectedDetection.value = detection
    }

    fun hasDetectionFeedback() : LiveData<Boolean> {
        val result = MutableLiveData<Boolean>()
        if (_selectedDetection.value!!.hasFeedback) {
            result.postValue(true)
        } else {
            viewModelScope.launch(Dispatchers.IO) {
                runCatching {
                    explicitMusicRepository.fetchDugDetectionFeedback(_selectedDetection.value!!.objectId!!)
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
    }

    fun sendDetectionFeedback(isCorrect: Boolean, tablet: Tablet) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                explicitMusicRepository.sendDugDetectionFeedback(
                    _selectedDetection.value!!.objectId!!,
                    isCorrect,
                    "MUSIC",
                    tablet
                )
            }.onSuccess { list ->
                Timber.i("Dug feedback result: $list")
            }.onFailure {
                Timber.e("Error asking Detection Feedback")
            }
        }
    }
}