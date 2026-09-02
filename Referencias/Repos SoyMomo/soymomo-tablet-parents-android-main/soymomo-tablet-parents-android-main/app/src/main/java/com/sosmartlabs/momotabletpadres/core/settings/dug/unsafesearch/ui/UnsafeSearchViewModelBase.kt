package com.sosmartlabs.momotabletpadres.core.settings.dug.unsafesearch.ui

import android.app.Application
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.UnsafeSearchRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.DetectedUnsafeSearch
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.SearchDetectionDetail
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.adulttitle.AdultTitle
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.adulttitle.AdultTitleRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousinfluencer.DangerousInfluencer
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousinfluencer.DangerousInfluencerRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousviral.DangerousViral
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousviral.DangerousViralRepository
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.ui.DugBaseViewModel
import com.sosmartlabs.momotabletpadres.core.settings.dug.unsafesearch.model.DisplayedDetectedUnsafeSearch
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.*

abstract class UnsafeSearchViewModelBase(application: Application) : DugBaseViewModel(application) {

    protected abstract val unsafeSearchRepository: UnsafeSearchRepository

    /**
     * Repository for access adult titles data
     */
    protected abstract val adultTitlesRepository: AdultTitleRepository

    /**
     * Repository for access dangerous influencers data
     */
    protected abstract val dangerousInfluencersRepository: DangerousInfluencerRepository

    /**
     * Repository for access dangerous viral data
     */
    protected abstract val dangerousViralRepository: DangerousViralRepository

    /**
     * LiveData for showing detected searches in this tablet.
     * Private field, must be accessed through [detectedSearches] public getter
     */
    protected val _detectedSearches = MutableLiveData<List<DisplayedDetectedUnsafeSearch>>()

    /**
     * LiveData for showing detected searches in this tablet.
     */
    val detectedSearches: LiveData<List<DisplayedDetectedUnsafeSearch>> get() = _detectedSearches

    /**
     * LiveData for showing current selected search in this tablet.
     * Private field, must be accessed through [currentSelectedSearch] public getter
     */
    private val _currentSelectedSearch = MutableLiveData<DisplayedDetectedUnsafeSearch>()

    /**
     * LiveData for showing current selected search in this tablet.
     */
    val currentSelectedSearch: LiveData<DisplayedDetectedUnsafeSearch> get() = _currentSelectedSearch

    /**
     * Start loading unsafe searches detections for this tablet with the given interval
     * @param interval Interval used for the query.
     * Their possible values are in [DateUtil.LAST_HOUR], [DateUtil.TODAY], [DateUtil.THIS_WEEK],
     * [DateUtil.THIS_MONTH] and [DateUtil.EVERYTHING]
     */
    fun loadDetectedUnsafeSearchesWithFilter(tablet: Tablet, interval: Int) {
        Timber.d("Loading unsafe searches for interval $interval")
        viewModelScope.launch(Dispatchers.IO) {
            lateinit var displayUnsafeSearches: List<DisplayedDetectedUnsafeSearch>
            setLoading()
            runCatching {
                val searches = if (interval == DateUtil.EVERYTHING)
                    unsafeSearchRepository.getDetectedUnsafeSearch(tablet)
                else
                    unsafeSearchRepository.getDetectedUnsafeSearch(
                        tablet,
                        DateUtil.findStartDateByInterval(interval)
                    )

                val appsList = (searches.map { it.packageName!! }).distinct()

                val appNamesMap = getAppNames(tablet, appsList)
                val iconsMap = getAppIcons(appsList)

                val viralReferenceIds =
                    findReferenceIdsByCategory(searches, DetectedUnsafeSearch.CATEGORY_VIRAL)
                val titleReferenceIds =
                    findReferenceIdsByCategory(searches, DetectedUnsafeSearch.CATEGORY_MOVIE)
                val contentCreatorReferenceIds =
                    findReferenceIdsByCategory(
                        searches, DetectedUnsafeSearch.CATEGORY_CONTENT_CREATOR
                    )

                val viralTask = async {
                    Timber.d("Loading dangerous virals")
                    dangerousViralRepository.findDangerousViralByReferenceIds(
                        viralReferenceIds
                    )
                }
                val titleTask = async {
                    Timber.d("Loading adult titles")
                    adultTitlesRepository.findAdultTitlesByReferenceIds(
                        titleReferenceIds
                    )
                }
                val influencersTask = async {
                    Timber.d("Loading dangerous influencers")
                    dangerousInfluencersRepository.findDangerousInfluencersByReferenceIds(
                        contentCreatorReferenceIds
                    )
                }

                val virals = viralTask.await()
                val titles = titleTask.await()
                val influencers = influencersTask.await()

                displayUnsafeSearches = searches.map {
                    DisplayedDetectedUnsafeSearch(
                        appNamesMap[it.packageName] ?: it.packageName,
                        iconsMap[it.packageName],
                        when (it.category) {
                            DetectedUnsafeSearch.CATEGORY_VIRAL -> findViralName(it, virals)
                                ?: ""
                            DetectedUnsafeSearch.CATEGORY_MOVIE -> findTitleName(it, titles)
                                ?: ""
                            DetectedUnsafeSearch.CATEGORY_CONTENT_CREATOR -> findInfluencerName(
                                it,
                                influencers
                            ) ?: ""
                            else -> it.searchText!!
                        },
                        if (it.category == DetectedUnsafeSearch.CATEGORY_VIRAL)
                            findViralDescription(it, virals)
                        else null,
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

    /**
     * Obtains a list of referenceIds in a list of [DetectedUnsafeSearchModel] for a given category
     * @param searches List of [DetectedUnsafeSearchModel] for find
     * @param category Category for filter list
     */
    private fun findReferenceIdsByCategory(
        searches: List<DetectedUnsafeSearch>,
        category: String
    ) =
        searches.filter { it.referenceId != null && it.category == category }
            .map { it.referenceId!! }

    /**
     * Finds the name for showing in the view for a given [DetectedUnsafeSearchModel]
     * @param detectedSearch Detected search for finding their name for showing
     * @param searches List of [SearchDetectionDetail] in which find the name
     * @param name Lambda that obtains the name for been used from a [SearchDetectionDetail] object
     * @return Name for been used in view
     */
    private fun findLocalUnsafeSearchName(
        detectedSearch: DetectedUnsafeSearch,
        searches: List<SearchDetectionDetail>,
        name: (SearchDetectionDetail) -> String?
    ): String? {
        val searchAllLanguages = searches.filter { it.referenceId == detectedSearch.referenceId }
        if (searchAllLanguages.isEmpty()) return detectedSearch.searchText!!

        val locale = Locale.getDefault()
        val searchLocalLanguage =
            searchAllLanguages.filter { it.language.equals(locale.language, ignoreCase = true) }
        if (searchLocalLanguage.isEmpty()) return name(searchAllLanguages[0])

        val searchLocal =
            searchLocalLanguage.find { it.region.equals(locale.country, ignoreCase = true) }
        return if (searchLocal == null) {
            if (locale.language.equals("es", ignoreCase = true) && !locale.country.equals(
                    "ES",
                    ignoreCase = true
                )
            )
                name(searchLocalLanguage.find { !it.language.equals("es", true) }
                    ?: searchLocalLanguage[0])
            else name(searchLocalLanguage[0])
        } else name(searchLocalLanguage[0])
    }

    /**
     * Finds the name for showing in the view for a given detected viral
     * @param detectedSearch Detected search for finding their name for showing
     * @param virals Virals list in which search the name to use
     * @return Name for been shown with the given detected search
     */
    private fun findViralName(
        detectedSearch: DetectedUnsafeSearch,
        virals: List<DangerousViral>
    ): String? {
        return findLocalUnsafeSearchName(detectedSearch, virals) {
            (it as DangerousViral).longName ?: detectedSearch.searchText!!
        }
    }

    /**
     * Finds the name for showing in the view for a given detected title
     * @param detectedSearch Detected search for finding their name for showing
     * @param titles Titles list in which search the name to use
     * @return Name for been shown with the given detected search
     */
    private fun findTitleName(
        detectedSearch: DetectedUnsafeSearch,
        titles: List<AdultTitle>
    ): String? {
        return findLocalUnsafeSearchName(detectedSearch, titles) {
            (it as AdultTitle).longName ?: detectedSearch.searchText!!
        }
    }

    /**
     * Finds the name for showing in the view for a given detected influencer
     * @param detectedSearch Detected search for finding their name for showing
     * @param influencers Influencers list in which search the name to use
     * @return Name for been shown with the given detected search
     */
    private fun findInfluencerName(
        detectedSearch: DetectedUnsafeSearch,
        influencers: List<DangerousInfluencer>
    ): String? {
        return findLocalUnsafeSearchName(detectedSearch, influencers) {
            (it as DangerousInfluencer).userName ?: detectedSearch.searchText!!
        }
    }

    /**
     * Finds the description for a detected viral
     * @param detectedSearch Detected viral for finding description
     * @param virals Virals list in which search the description to use
     * @return Description for been used
     */
    private fun findViralDescription(
        detectedSearch: DetectedUnsafeSearch,
        virals: List<DangerousViral>
    ): String? {
        return findLocalUnsafeSearchName(detectedSearch, virals) {
            (it as DangerousViral).description
        }
    }

    /**
     * Sets the current selected search for been displayed in the details view
     * @param selected Current selected [DisplayedDetectedUnsafeSearch]
     */
    fun setCurrentSelectedSearch(selected: DisplayedDetectedUnsafeSearch) {
        _currentSelectedSearch.postValue(selected)
    }

    fun hasDetectionFeedback() : LiveData<Boolean> {
        val result = MutableLiveData<Boolean>()
        if (_currentSelectedSearch.value!!.detectedSearch.hasFeedback) {
            Timber.i("Heyyyyy: Already has feedback, local check")
            result.postValue(true)
        } else {
            viewModelScope.launch(Dispatchers.IO) {
                runCatching {
                    Timber.i("Heyyyyy: Remote check")
                    unsafeSearchRepository.fetchDugDetectionFeedback(_currentSelectedSearch.value!!.detectedSearch.objectId!!)
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
                unsafeSearchRepository.sendDugDetectionFeedback(
                    _currentSelectedSearch.value!!.detectedSearch.objectId!!,
                    isCorrect,
                    "SEARCH",
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