package com.sosmartlabs.momo.lingo.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.lingo.domain.LingoLanguage
import com.sosmartlabs.momo.lingo.domain.LingoLanguageCatalog
import com.sosmartlabs.momo.lingo.domain.LingoLanguageProgress
import com.sosmartlabs.momo.lingo.domain.LingoMilestone
import com.sosmartlabs.momo.lingo.domain.LingoProgressOverview
import com.sosmartlabs.momo.lingo.repository.LingoProgressRepository
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.SingleLiveEvent
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.Date
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

/**
 * Standalone ViewModel for the Lingo progress screen. It owns its own watch-load +
 * progress-fetch pipeline (rather than inheriting the shared settings base class) so
 * the success/error paths are self-contained and a watch-load failure surfaces as
 * LOAD_ERROR instead of leaving the screen stuck on LOADING.
 */
@HiltViewModel
class LingoProgressViewModel @Inject constructor(
    private val lingoProgressRepository: LingoProgressRepository,
    private val watchUserRepository: WatchUserRepository,
    private val ioContext: CoroutineContext,
) : ViewModel() {

    private val _progress = MutableLiveData<Resource<LingoProgressOverview, Unit>>()
    val progress: LiveData<Resource<LingoProgressOverview, Unit>> get() = _progress

    private val _selectedTab = MutableLiveData(0)
    val selectedTab: LiveData<Int> get() = _selectedTab

    // The language whose progress the switcher is currently showing.
    private val _viewedLanguageCode = MutableLiveData("")
    val viewedLanguageCode: LiveData<String> get() = _viewedLanguageCode

    // The wearer's active learning language (what the watch is set to).
    private val _activeLanguageCode = MutableLiveData("")
    val activeLanguageCode: LiveData<String> get() = _activeLanguageCode

    private val _isSaving = MutableLiveData(false)
    val isSaving: LiveData<Boolean> get() = _isSaving

    /** One-shot signal so the Activity can surface a "couldn't change language" message once. */
    val changeLanguageError = SingleLiveEvent<Unit>()

    private var wearer: Wearer? = null

    fun fetchInformation(watchId: String) {
        // Only show the full-screen spinner when there is nothing to show yet. fetchInformation runs
        // on every onResume, and posting LOADING unconditionally collapsed the whole list to a
        // single loading row, visibly resetting scroll position and expanded cards each time.
        if (_progress.value?.status != Resource.Status.LOAD_SUCCESS) {
            _progress.postValue(Resource(Resource.Status.LOADING))
        }
        viewModelScope.launch(ioContext) {
            runCatching {
                // findWatchById is a blocking Parse call, hence the ioContext dispatcher.
                val watch = watchUserRepository.findWatchById(watchId)
                wearer = watch
                lingoProgressRepository.fetchOverview(watch)
            }.onSuccess { overview ->
                _activeLanguageCode.postValue(overview.activeLanguage)
                // Keep the current selection across reloads whenever it is still offered. Validating
                // against every listed language (not just played ones) matters because the viewer
                // lets the parent select a supported-but-unplayed language — checking only played
                // languages discarded that choice on the next resume.
                val current = _viewedLanguageCode.value
                if (current.isNullOrEmpty() || overview.languages.none { it.code == current }) {
                    val learning = overview.languages.filter { it.lastUpdated != null }
                    val next = learning.firstOrNull { it.code == overview.activeLanguage }?.code
                        ?: learning.firstOrNull()?.code
                        ?: overview.activeLanguage
                    _viewedLanguageCode.postValue(next)
                }
                _progress.postValue(Resource(Resource.Status.LOAD_SUCCESS, overview))
            }.onFailure { error ->
                // runCatching swallows CancellationException too; leaving the screen would otherwise
                // report a Crashlytics non-fatal and paint an error state on the way out.
                if (error is CancellationException) throw error
                CrashlyticsLog.recordNonFatalError(error, "LingoProgressViewModel: Failed to load progress")
                _progress.postValue(Resource(Resource.Status.LOAD_ERROR))
            }
        }
    }

    fun setTab(tab: Int) {
        _selectedTab.value = tab
    }

    fun setViewedLanguage(code: String) {
        if (_viewedLanguageCode.value != code) _viewedLanguageCode.value = code
    }

    // MARK: - Change-language flow

    /**
     * Languages the parent can switch the wearer to: the shipped catalogue, plus any language the
     * wearer has actually played.
     *
     * Gating the write path on the hardcoded catalogue alone was a one-way door — if the cloud
     * enables a language before an app update ships, the parent can see its progress but switching
     * away from it makes it unreachable until a store release. [setActiveLanguage] just writes an
     * opaque string, so the catalogue buys ordering and discovery, not safety.
     */
    fun supportedLanguages(): List<LingoLanguage> =
        (LingoLanguageCatalog.supported() +
            allLanguages()
                .filter { it.lastUpdated != null }
                .map { LingoLanguage(it.code, LingoLanguageCatalog.localeFor(it.code)) })
            .distinctBy { it.code }

    /**
     * Every language the parent can view: those with progress plus the other supported ones.
     * Drives the switcher (union, already de-duplicated by the repository).
     */
    fun allLanguages(): List<LingoLanguageProgress> =
        _progress.value?.data?.languages ?: emptyList()

    fun viewedProgress(): LingoLanguageProgress? =
        _progress.value?.data?.languages?.firstOrNull { it.code == _viewedLanguageCode.value }

    /** Localized name of the active learning language, for the status line. */
    fun activeDisplayName(): String {
        val code = _activeLanguageCode.value.orEmpty()
        return _progress.value?.data?.languages?.firstOrNull { it.code == code }?.displayName
            ?: LingoLanguageCatalog.displayName(code)
    }

    /** Persists [code] as the wearer's active learning language (after the Activity confirmed). */
    fun changeLanguage(code: String) {
        val watch = wearer ?: return
        _isSaving.value = true
        viewModelScope.launch(ioContext) {
            runCatching {
                lingoProgressRepository.setActiveLanguage(code, watch)
            }.onSuccess {
                _activeLanguageCode.postValue(code)
                // Follow the switch: leaving the viewer pointed at the old language made a
                // successful change look like nothing had happened.
                _viewedLanguageCode.postValue(code)
                _isSaving.postValue(false)
            }.onFailure { error ->
                // See fetchInformation: runCatching catches CancellationException as well, and a
                // cancelled save is not a product failure worth a toast.
                if (error is CancellationException) throw error
                CrashlyticsLog.recordNonFatalError(error, "LingoProgressViewModel: Failed to change language")
                _isSaving.postValue(false)
                changeLanguageError.postValue(Unit)
            }
        }
    }

    fun milestonesGrouped(): List<Pair<Date, List<LingoMilestone>>> {
        val milestones = viewedProgress()?.milestones ?: return emptyList()
        return milestones
            .groupBy { startOfDay(it.date) }
            .entries
            .sortedByDescending { it.key }
            .map { it.key to it.value }
    }

    private fun startOfDay(date: Date): Date {
        val cal = Calendar.getInstance().apply {
            time = date
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        return cal.time
    }
}
