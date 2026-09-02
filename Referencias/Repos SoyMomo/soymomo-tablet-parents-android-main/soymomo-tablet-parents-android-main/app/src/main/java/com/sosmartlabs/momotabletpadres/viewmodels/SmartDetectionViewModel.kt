package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.appicon.AppIconRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.smartdetection.model.SmartDetectionRepository
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.core.settings.dug.smartdetection.model.DisplayedSmartDetection
import com.sosmartlabs.momotabletpadres.core.settings.dug.smartdetection.ui.SmartDetectionViewModelBase
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
class SmartDetectionViewModel @Inject constructor(
    application: Application,
    override val installedAppsRepository: InstalledAppsRepository,
    override val appIconRepository: AppIconRepository,
    override val appInfoRepository: AppInfoRepositoryImpl,
    override val appDataRepository: AppDataRepository,
    override val smartDetectionRepository: SmartDetectionRepository
) : SmartDetectionViewModelBase(application) {

    fun getSmartDetectionsWithTimeDate(tablet: Tablet, from: Date) {
        viewModelScope.launch(Dispatchers.IO) {
            setLoading()
            runCatching {
                smartDetectionRepository.getSmartDetections(tablet, from)
            }.onSuccess {
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
                CrashlyticsLog.recordNonFatalError(it, "Error loading smart detections")
                setError()
            }
        }
    }
}