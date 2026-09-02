package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.appicon.AppIconRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectedConversationsRepository
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.model.DisplayedDetectedConversation
import com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.ui.DetectedConversationViewModelBase
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.repositories.AppInfoRepositoryImpl
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.AppDataRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.InstalledAppsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.Date
import javax.inject.Inject

@HiltViewModel
class ProfanityViewModel @Inject constructor(
    application: Application,
    override val appIconRepository: AppIconRepository,
    override val appInfoRepository: AppInfoRepositoryImpl,
    override val appDataRepository: AppDataRepository,
    override val detectedConversationRepository: DetectedConversationsRepository,
    override val installedAppsRepository: InstalledAppsRepository
) : DetectedConversationViewModelBase(application) {

    fun loadDetectedConversationsWithDate(tablet: Tablet, from: Date) {
        viewModelScope.launch(Dispatchers.IO) {
            lateinit var displayConversations: List<DisplayedDetectedConversation>
            setLoading()
            runCatching {
                Timber.d("Loading detected conversations")
                val conversations =
                    detectedConversationRepository.getDetectedConversationsWithoutMoodDetections(
                        tablet.objectId,
                        from
                    )

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
                CrashlyticsLog.recordNonFatalError(it, "Error on loading detected conversations")
                setError()
            }
        }
    }
}