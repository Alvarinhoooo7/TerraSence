package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import android.graphics.drawable.Drawable
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.appicon.AppIconRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectedConversationsRepository
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.core.settings.dug.mooddetection.model.MoodDetection
import com.sosmartlabs.momotabletpadres.core.settings.dug.mooddetection.ui.MoodSearchesViewModelBase
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.repositories.AppInfoRepositoryImpl
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.AppDataRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.InstalledAppsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.Date
import javax.inject.Inject

@HiltViewModel
class MoodSearchesViewModel @Inject constructor(
    application: Application,
    override val detectedConversationsRepository: DetectedConversationsRepository,
    override val appInfoRepository: AppInfoRepositoryImpl,
    override val appDataRepository: AppDataRepository,
    override val installedAppsRepository: InstalledAppsRepository,
    override val appIconRepository: AppIconRepository
) : MoodSearchesViewModelBase(application) {

    fun getMoodDetectionsWithTimeDate(tablet: Tablet, from: Date) {
        viewModelScope.launch(Dispatchers.IO) {
            setLoading()
            runCatching {
                detectedConversationsRepository.getMoodDetectedConversations(
                    tablet.objectId,
                    from
                )
            }.onSuccess { detectedConversations ->
                val appPackageNames = detectedConversations.map { detectedConversation -> 
                    detectedConversation.appName!! 
                }.distinct()

                val installedAppNamesMap = getAppNames(tablet, appPackageNames)
                val appIcons: Map<String, Drawable> = getAppIcons(appPackageNames)

                val detections = detectedConversations.map {
                    MoodDetection(
                        objectId = it.objectId,
                        appName = installedAppNamesMap[it.appName!!] ?: it.appName!!,
                        packageName = it.appName,
                        appIcon = appIcons[it.appName!!],
                        date = it.date!!,
                        text = it.logEntries.maxByOrNull { logEntry -> logEntry.moodScore }!!.message,
                        totalMoodScore = it.totalMoodScore!!,
                        riskFactors = it.riskFactor!!.split(','),
                        hasFeedback = it.hasFeedback,
                    )
                }
                if (detections.isEmpty()) setEmptyList() else setPopulatedList()
                _moodDetections.postValue(detections)
            }.onFailure {
                CrashlyticsLog.recordNonFatalError(it, "Error loading Mood detections")
                setError()
            }
        }
    }
}