package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.appicon.AppIconRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.UnsafeSearchRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.adulttitle.AdultTitleRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousinfluencer.DangerousInfluencerRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousviral.DangerousViralRepository
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.core.settings.dug.unsafesearch.model.DisplayedDetectedUnsafeSearch
import com.sosmartlabs.momotabletpadres.core.settings.dug.unsafesearch.ui.UnsafeSearchViewModelBase
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
class UnsafeSearchViewModel @Inject constructor(
    application: Application,
    override val installedAppsRepository: InstalledAppsRepository,
    override val unsafeSearchRepository: UnsafeSearchRepository,
    override val appIconRepository: AppIconRepository,
    override val appInfoRepository: AppInfoRepositoryImpl,
    override val appDataRepository: AppDataRepository,
    override val adultTitlesRepository: AdultTitleRepository,
    override val dangerousInfluencersRepository: DangerousInfluencerRepository,
    override val dangerousViralRepository: DangerousViralRepository
) : UnsafeSearchViewModelBase(application) {

    fun loadDetectedUnsafeSearchesWithDate(tablet: Tablet, from: Date) {
        viewModelScope.launch(Dispatchers.IO) {
            lateinit var displayUnsafeSearches: List<DisplayedDetectedUnsafeSearch>
            setLoading()
            runCatching {
                val searches = unsafeSearchRepository.getDetectedUnsafeSearch(
                    tablet,
                    from
                )

                val appsList = (searches.map { it.packageName!! }).distinct()
                val appNamesMap = getAppNames(tablet, appsList)
                val iconsMap = getAppIcons(appsList)

                displayUnsafeSearches = searches.map {
                    DisplayedDetectedUnsafeSearch(
                        appNamesMap[it.packageName] ?: it.packageName,
                        iconsMap[it.packageName],
                        it.searchText!!, null,
                        it
                    )
                }
            }.onSuccess {
                _detectedSearches.postValue(displayUnsafeSearches)
                if (displayUnsafeSearches.isEmpty()) setEmptyList()
                else setPopulatedList()
            }.onFailure {
                Timber.e(it, "Error on loading detected unsafe searches")
                CrashlyticsLog.recordNonFatalError(it, "Error on loading detected unsafe searches")
                setError()
            }
        }
    }
}