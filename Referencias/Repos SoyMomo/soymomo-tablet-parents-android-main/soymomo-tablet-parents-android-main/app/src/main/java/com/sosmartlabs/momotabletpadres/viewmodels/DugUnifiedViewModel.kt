package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.appicon.AppIconRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectedConversationsRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model.ExplicitMusicRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.smartdetection.model.SmartDetectionRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.UnsafeSearchRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.adulttitle.AdultTitleRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousinfluencer.DangerousInfluencerRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousviral.DangerousViralRepository
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.DetectionFilter
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.DugFeature
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.DugFeatureType
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.DugFeaturesRepository
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.DugListItem
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.UnifiedDetectionItem
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.ui.DugBaseViewModel
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.util.DetectionSeverityUtil
import com.sosmartlabs.momotabletpadres.core.settings.dug.explicitmusic.model.DisplayedExplicitMusicDetection
import com.sosmartlabs.momotabletpadres.core.settings.dug.smartdetection.model.DisplayedSmartDetection
import com.sosmartlabs.momotabletpadres.core.settings.dug.unsafesearch.model.DisplayedDetectedUnsafeSearch
import com.sosmartlabs.momotabletpadres.repositories.AppInfoRepositoryImpl
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.AppDataRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.remote.getIconUrl
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.InstalledAppsRepository
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import javax.inject.Inject

@HiltViewModel
class DugUnifiedViewModel @Inject constructor(
    application: Application,
    override val appInfoRepository: AppInfoRepositoryImpl,
    override val appIconRepository: AppIconRepository,
    override val installedAppsRepository: InstalledAppsRepository,
    override val appDataRepository: AppDataRepository,
    private val smartDetectionRepository: SmartDetectionRepository,
    private val detectedConversationsRepository: DetectedConversationsRepository,
    private val unsafeSearchRepository: UnsafeSearchRepository,
    private val explicitMusicRepository: ExplicitMusicRepository,
    private val adultTitlesRepository: AdultTitleRepository,
    private val dangerousInfluencersRepository: DangerousInfluencerRepository,
    private val dangerousViralRepository: DangerousViralRepository,
    private val dugFeaturesRepository: DugFeaturesRepository,
    private val tabletRepository: TabletRepository
) : DugBaseViewModel(application) {

    private lateinit var tablet: Tablet

    companion object {
        const val PAGE_SIZE = 8
    }

    // Selected image detection for detail view
    private val _selectedImageDetection = MutableLiveData<UnifiedDetectionItem.ImageDetection>()
    val selectedImageDetection: LiveData<UnifiedDetectionItem.ImageDetection> get() = _selectedImageDetection

    fun setSelectedImageDetection(detection: UnifiedDetectionItem.ImageDetection) {
        _selectedImageDetection.value = detection
    }

    // Per-source detection lists (raw, thread-safe via synchronized access)
    private val sourceResults = mutableMapOf<DugFeatureType, MutableList<UnifiedDetectionItem>>()
    private val perSourceSkip = mutableMapOf<DugFeatureType, Int>()
    private val perSourceExhausted = mutableMapOf<DugFeatureType, Boolean>()

    private val _filteredDetections = MutableLiveData<List<DugListItem>>()
    val filteredDetections: LiveData<List<DugListItem>> get() = _filteredDetections

    private val _activeFilter = MutableLiveData(DetectionFilter.ALL)
    val activeFilter: LiveData<DetectionFilter> get() = _activeFilter

    private val _categoryCounts = MutableLiveData<Map<DugFeatureType, Int>>()
    val categoryCounts: LiveData<Map<DugFeatureType, Int>> get() = _categoryCounts

    private val _totalCount = MutableLiveData(0)
    val totalCount: LiveData<Int> get() = _totalCount

    private val _togglesExpanded = MutableLiveData(false)
    val togglesExpanded: LiveData<Boolean> get() = _togglesExpanded

    private val _featureStates = MutableLiveData<List<DugFeature>>()
    val featureStates: LiveData<List<DugFeature>> get() = _featureStates

    private val _featureUpdateStatus = MutableLiveData<DugFeatureUpdateStatus>()
    val featureUpdateStatus: LiveData<DugFeatureUpdateStatus> get() = _featureUpdateStatus

    private val _isLoadingMore = MutableLiveData(false)
    val isLoadingMore: LiveData<Boolean> get() = _isLoadingMore

    val allSourcesExhausted: Boolean
        get() = perSourceExhausted.values.all { it }

    private var sourcesLoaded = 0
    private var sourcesWithData = 0
    private var hasLoadedData = false
    private var initialLoadInProgress = false

    @Synchronized
    private fun postSourceResults(type: DugFeatureType, items: List<UnifiedDetectionItem>, append: Boolean = false) {
        if (append) {
            sourceResults.getOrPut(type) { mutableListOf() }.addAll(items)
        } else {
            sourceResults[type] = items.toMutableList()
        }
        // During initial parallel load, only merge once all 5 sources have posted
        // to avoid 5 rapid redraws. For load-more (append), merge immediately.
        if (append || !initialLoadInProgress || sourcesLoaded >= 5) {
            mergeAndFilter()
        }
    }

    private fun mergeAndFilter() {
        val all = synchronized(sourceResults) {
            sourceResults.values.flatten().sortedByDescending { it.timestamp }
        }

        Timber.d("DugUnifiedViewModel: mergeAndFilter - ${all.size} loaded detections from ${sourceResults.size} sources")

        // Don't overwrite _totalCount here — it's set by loadTotalCounts() with real counts
        _categoryCounts.postValue(
            all.groupBy { it.category }.mapValues { it.value.size }
        )

        val filter = _activeFilter.value ?: DetectionFilter.ALL
        val filtered = applyFilter(all, filter)
        _filteredDetections.postValue(insertDateHeaders(filtered))

        if (filtered.isNotEmpty()) setPopulatedList()
        else if (all.isNotEmpty() || sourcesLoaded >= 5) setEmptyList()
    }

    private fun insertDateHeaders(items: List<UnifiedDetectionItem>): List<DugListItem> {
        if (items.isEmpty()) return emptyList()

        val result = mutableListOf<DugListItem>()
        val dateFormat = SimpleDateFormat("MMMM d", Locale.getDefault())
        val todayCal = Calendar.getInstance()
        val itemCal = Calendar.getInstance()

        var lastDateKey = ""
        for (item in items) {
            itemCal.time = item.timestamp
            val dateKey = "${itemCal.get(Calendar.YEAR)}-${itemCal.get(Calendar.DAY_OF_YEAR)}"
            if (dateKey != lastDateKey) {
                val label = when {
                    isSameDay(todayCal, itemCal) ->
                        getApplication<Application>().getString(R.string.dug_date_today)
                    isYesterday(todayCal, itemCal) ->
                        getApplication<Application>().getString(R.string.dug_date_yesterday)
                    else -> dateFormat.format(item.timestamp)
                }
                result.add(DugListItem.DateHeader(label))
                lastDateKey = dateKey
            }
            result.add(DugListItem.Detection(item))
        }
        return result
    }

    private fun isSameDay(a: Calendar, b: Calendar): Boolean =
        a.get(Calendar.YEAR) == b.get(Calendar.YEAR) && a.get(Calendar.DAY_OF_YEAR) == b.get(Calendar.DAY_OF_YEAR)

    private fun isYesterday(today: Calendar, other: Calendar): Boolean {
        val yesterday = today.clone() as Calendar
        yesterday.add(Calendar.DAY_OF_YEAR, -1)
        return isSameDay(yesterday, other)
    }

    private fun applyFilter(items: List<UnifiedDetectionItem>, filter: DetectionFilter): List<UnifiedDetectionItem> =
        when (filter) {
            DetectionFilter.ALL -> items
            DetectionFilter.IMAGES -> items.filterIsInstance<UnifiedDetectionItem.ImageDetection>()
            DetectionFilter.MESSAGES -> items.filterIsInstance<UnifiedDetectionItem.MessageDetection>()
            DetectionFilter.SEARCHES -> items.filterIsInstance<UnifiedDetectionItem.SearchDetection>()
            DetectionFilter.MOOD -> items.filterIsInstance<UnifiedDetectionItem.MoodItem>()
            DetectionFilter.MUSIC -> items.filterIsInstance<UnifiedDetectionItem.MusicItem>()
        }

    fun setFilter(filter: DetectionFilter) {
        _activeFilter.value = filter
        mergeAndFilter()
    }

    fun setTogglesExpanded(expanded: Boolean) {
        _togglesExpanded.value = expanded
    }

    // -- Loading --

    fun loadAllDetections(tablet: Tablet) {
        // Skip reload if data already loaded for this tablet (e.g., back navigation)
        if (hasLoadedData && ::tablet.isInitialized && this.tablet.objectId == tablet.objectId) return

        this.tablet = tablet
        hasLoadedData = true
        initialLoadInProgress = true
        sourcesLoaded = 0
        sourcesWithData = 0
        sourceResults.clear()
        perSourceSkip.clear()
        perSourceExhausted.clear()
        DugFeatureType.entries.forEach {
            perSourceSkip[it] = 0
            perSourceExhausted[it] = false
        }
        setLoading()

        _featureStates.value = dugFeaturesRepository.getDugFeaturesByTabletModel(tablet)

        loadPage(append = false)
        loadTotalCounts(tablet)
    }

    private fun loadTotalCounts(tablet: Tablet) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                val startOfWeek = Calendar.getInstance().apply {
                    set(Calendar.DAY_OF_WEEK, firstDayOfWeek)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }.time

                val images = async { smartDetectionRepository.countDetections(tablet, startOfWeek) }
                val messages = async { detectedConversationsRepository.countConversationsWithoutMood(tablet.objectId, startOfWeek) }
                val searches = async { unsafeSearchRepository.countDetections(tablet, startOfWeek) }
                val mood = async { detectedConversationsRepository.countMoodConversations(tablet.objectId, startOfWeek) }
                val music = async { explicitMusicRepository.countDetections(tablet, startOfWeek) }
                images.await() + messages.await() + searches.await() + mood.await() + music.await()
            }.onSuccess { total ->
                _totalCount.postValue(total)
            }.onFailure { e ->
                Timber.e(e, "Error loading total counts")
            }
        }
    }

    fun loadMore() {
        if (_isLoadingMore.value == true || allSourcesExhausted) return
        _isLoadingMore.value = true
        loadPage(append = true)
    }

    private fun loadPage(append: Boolean) {
        viewModelScope.launch(Dispatchers.IO) {
            val imagesDeferred = async { loadImages(tablet, append) }
            val messagesDeferred = async { loadMessages(tablet, append) }
            val searchesDeferred = async { loadSearches(tablet, append) }
            val moodDeferred = async { loadMood(tablet, append) }
            val musicDeferred = async { loadMusic(tablet, append) }

            imagesDeferred.await()
            messagesDeferred.await()
            searchesDeferred.await()
            moodDeferred.await()
            musicDeferred.await()

            if (initialLoadInProgress) {
                initialLoadInProgress = false
                mergeAndFilter() // single merge after all initial sources complete
            }
            _isLoadingMore.postValue(false)
        }
    }

    /**
     * Get app icon URLs from AppDataRepository (same source as App Protection feature).
     * Returns a map of packageName → iconUrl.
     */
    private suspend fun getAppIconUrls(packageNames: List<String>): Map<String, String?> {
        return runCatching {
            val appDataList = appDataRepository.getAppData(packageNames)
            val result = mutableMapOf<String, String?>()
            for (appData in appDataList) {
                val pkg = appData.packageName ?: continue
                result[pkg] = appData.getIconUrl()
            }
            result
        }.getOrDefault(emptyMap())
    }

    private suspend fun loadImages(tablet: Tablet, append: Boolean = false) {
        val type = DugFeatureType.SMART_DETECTOR
        if (perSourceExhausted[type] == true) return
        val skip = perSourceSkip[type] ?: 0
        runCatching {
            val detections = smartDetectionRepository.getSmartDetections(tablet, limit = PAGE_SIZE, skip = skip)
            val packageNames = detections.mapNotNull { it.packageName }.distinct()
            val iconUrls = getAppIconUrls(packageNames)
            val appNames = getAppNames(tablet, packageNames)
            val objIdToPkg = detections.associate { (it.objectId ?: "") to (it.packageName ?: "") }

            val displayed = detections.map { detection ->
                DisplayedSmartDetection(
                    objectId = detection.objectId,
                    screenshot = detection.screenshot,
                    appName = appNames[detection.packageName] ?: detection.appName ?: detection.packageName,
                    appIcon = null,
                    createdAt = detection.createdAt,
                    isEncrypted = detection.isEncrypted,
                    encryptedScreenshotFile = detection.encryptedScreenshotFile,
                    encryptedMetadata = detection.encryptedMetadata
                )
            }

            // Group by time window (70s) and same app, matching SmartDetectionViewModelBase
            val grouped = groupSmartDetectionsByTime(displayed)
            grouped.map { group ->
                val first = group.first()
                UnifiedDetectionItem.ImageDetection(
                    id = first.objectId ?: "",
                    appIconUrl = iconUrls[objIdToPkg[first.objectId]],
                    appName = first.appName,
                    contentPreview = getApplication<Application>().getString(
                        com.sosmartlabs.momotabletpadres.R.string.dug_detection_images_title
                    ),
                    timestamp = first.createdAt,
                    detections = group,
                    groupCount = group.size
                )
            }
        }.onSuccess { items ->
            if (items.size < PAGE_SIZE) perSourceExhausted[type] = true
            perSourceSkip[type] = skip + PAGE_SIZE
            postSourceResults(type, items, append)
            if (!append) onSourceLoaded(items.isNotEmpty())
        }.onFailure { e ->
            Timber.e(e, "Error loading smart detections")
            CrashlyticsLog.recordNonFatalError(e, "DugUnifiedViewModel: Error loading smart detections")
            perSourceExhausted[type] = true
            if (!append) { postSourceResults(type, emptyList()); onSourceLoaded(false) }
        }
    }

    private fun groupSmartDetectionsByTime(
        detections: List<DisplayedSmartDetection>
    ): List<List<DisplayedSmartDetection>> {
        if (detections.isEmpty()) return emptyList()
        val groups = mutableListOf<MutableList<DisplayedSmartDetection>>()
        var currentGroup = mutableListOf(detections.first())

        for (i in 1 until detections.size) {
            val prev = detections[i - 1]
            val curr = detections[i]
            val timeDiff = kotlin.math.abs(prev.createdAt.time - curr.createdAt.time)
            if (timeDiff <= 70_000 && prev.appName == curr.appName) {
                currentGroup.add(curr)
            } else {
                groups.add(currentGroup)
                currentGroup = mutableListOf(curr)
            }
        }
        groups.add(currentGroup)
        return groups
    }

    private suspend fun loadMessages(tablet: Tablet, append: Boolean = false) {
        val type = DugFeatureType.PROFANITY_DETECTOR
        if (perSourceExhausted[type] == true) return
        val skip = perSourceSkip[type] ?: 0
        runCatching {
            val conversations = detectedConversationsRepository
                .getDetectedConversationsWithoutMoodDetections(tablet.objectId, limit = PAGE_SIZE, skip = skip)
            val packageNames = conversations.mapNotNull { it.appName }.distinct()
            val iconUrls = getAppIconUrls(packageNames)
            val appNames = getAppNames(tablet, packageNames)

            conversations.map { conv ->
                val profanityScore = conv.totalProfanityScore ?: 0.0
                val groomingScore = conv.totalGroomingScore ?: 0.0
                val preview = if (conv.logEntries.isNotEmpty()) {
                    "\"${conv.logEntries[0].message}\""
                } else ""
                val friendlyName = appNames[conv.appName] ?: conv.appName

                UnifiedDetectionItem.MessageDetection(
                    id = conv.objectId!!,
                    appIconUrl = iconUrls[conv.appName],
                    appName = friendlyName,
                    contentPreview = preview,
                    severity = DetectionSeverityUtil.getProfanityLevel(profanityScore, groomingScore),
                    timestamp = conv.date!!,
                    conversation = com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.model.DisplayedDetectedConversation(
                        name = conv.senderName ?: friendlyName,
                        icon = null, // Detail fragment loads its own icon
                        detectedConversation = conv
                    ),
                    hasCyberbullying = DetectionSeverityUtil.hasCyberbullying(profanityScore),
                    hasGrooming = DetectionSeverityUtil.hasGrooming(groomingScore)
                )
            }
        }.onSuccess { items ->
            if (items.size < PAGE_SIZE) perSourceExhausted[type] = true
            perSourceSkip[type] = skip + PAGE_SIZE
            postSourceResults(type, items, append)
            if (!append) onSourceLoaded(items.isNotEmpty())
        }.onFailure { e ->
            Timber.e(e, "Error loading message detections")
            CrashlyticsLog.recordNonFatalError(e, "DugUnifiedViewModel: Error loading message detections")
            perSourceExhausted[type] = true
            if (!append) { postSourceResults(type, emptyList()); onSourceLoaded(false) }
        }
    }

    private suspend fun loadSearches(tablet: Tablet, append: Boolean = false) {
        val type = DugFeatureType.UNSAFE_SEARCH_DETECTOR
        if (perSourceExhausted[type] == true) return
        val skip = perSourceSkip[type] ?: 0
        runCatching {
            val searches = unsafeSearchRepository.getDetectedUnsafeSearch(tablet, limit = PAGE_SIZE, skip = skip)
            val packageNames = searches.mapNotNull { it.packageName }.distinct()
            val iconUrls = getAppIconUrls(packageNames)
            val appNames = getAppNames(tablet, packageNames)

            searches.map { search ->
                val displayName = appNames[search.packageName] ?: search.packageName
                UnifiedDetectionItem.SearchDetection(
                    id = search.objectId!!,
                    appIconUrl = iconUrls[search.packageName],
                    appName = displayName,
                    contentPreview = search.searchText ?: "",
                    timestamp = search.date!!,
                    search = DisplayedDetectedUnsafeSearch(
                        appName = displayName,
                        icon = null,
                        name = search.searchText ?: "",
                        description = null,
                        detectedSearch = search
                    ),
                    searchCategory = search.category
                )
            }
        }.onSuccess { items ->
            if (items.size < PAGE_SIZE) perSourceExhausted[type] = true
            perSourceSkip[type] = skip + PAGE_SIZE
            postSourceResults(type, items, append)
            if (!append) onSourceLoaded(items.isNotEmpty())
        }.onFailure { e ->
            Timber.e(e, "Error loading search detections")
            CrashlyticsLog.recordNonFatalError(e, "DugUnifiedViewModel: Error loading search detections")
            perSourceExhausted[type] = true
            if (!append) { postSourceResults(type, emptyList()); onSourceLoaded(false) }
        }
    }

    private suspend fun loadMood(tablet: Tablet, append: Boolean = false) {
        val type = DugFeatureType.MOOD_DETECTOR
        if (perSourceExhausted[type] == true) return
        val skip = perSourceSkip[type] ?: 0
        runCatching {
            val conversations = detectedConversationsRepository
                .getMoodDetectedConversations(tablet.objectId, limit = PAGE_SIZE, skip = skip)
            val packageNames = conversations.mapNotNull { it.appName }.distinct()
            val iconUrls = getAppIconUrls(packageNames)
            val appNames = getAppNames(tablet, packageNames)

            conversations.map { conv ->
                val riskFactors = conv.riskFactor?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() }
                    ?: emptyList()
                val friendlyName = appNames[conv.appName] ?: conv.appName ?: ""
                val moodDetection = com.sosmartlabs.momotabletpadres.core.settings.dug.mooddetection.model.MoodDetection(
                    objectId = conv.objectId!!,
                    appName = friendlyName,
                    packageName = conv.appName,
                    appIcon = null,
                    date = conv.date!!,
                    text = if (conv.logEntries.isNotEmpty()) conv.logEntries[0].message else "",
                    totalMoodScore = conv.totalMoodScore,
                    riskFactors = riskFactors,
                    hasFeedback = conv.hasFeedback
                )

                UnifiedDetectionItem.MoodItem(
                    id = conv.objectId!!,
                    appIconUrl = iconUrls[conv.appName],
                    appName = friendlyName,
                    contentPreview = moodDetection.text,
                    timestamp = conv.date!!,
                    riskChips = riskFactors,
                    moodDetection = moodDetection
                )
            }
        }.onSuccess { items ->
            if (items.size < PAGE_SIZE) perSourceExhausted[type] = true
            perSourceSkip[type] = skip + PAGE_SIZE
            postSourceResults(type, items, append)
            if (!append) onSourceLoaded(items.isNotEmpty())
        }.onFailure { e ->
            Timber.e(e, "Error loading mood detections")
            CrashlyticsLog.recordNonFatalError(e, "DugUnifiedViewModel: Error loading mood detections")
            perSourceExhausted[type] = true
            if (!append) { postSourceResults(type, emptyList()); onSourceLoaded(false) }
        }
    }

    private suspend fun loadMusic(tablet: Tablet, append: Boolean = false) {
        val type = DugFeatureType.EXPLICIT_MUSIC_DETECTOR
        if (perSourceExhausted[type] == true) return
        val skip = perSourceSkip[type] ?: 0
        runCatching {
            val detections = explicitMusicRepository.getDetectedExplicitMusic(tablet, limit = PAGE_SIZE, skip = skip)
            val packageNames = detections.mapNotNull { it.packageName }.distinct()
            val iconUrls = getAppIconUrls(packageNames)
            val appNames = getAppNames(tablet, packageNames)

            detections.map { detection ->
                val displayName = appNames[detection.packageName] ?: detection.packageName
                val displayed = DisplayedExplicitMusicDetection(
                    objectId = detection.objectId,
                    appIcon = null,
                    appName = displayName,
                    packageName = detection.packageName!!,
                    songTitle = detection.songTitle!!,
                    songImage = detection.songImage ?: "",
                    detectedArtist = detection.detectedArtist ?: "",
                    explicitArtistScore = detection.artist?.explicitScore ?: 0.0,
                    detectionDate = detection.detectionDate!!,
                    hasFeedback = detection.hasFeedback ?: false
                )
                UnifiedDetectionItem.MusicItem(
                    id = detection.objectId ?: "",
                    appIconUrl = iconUrls[detection.packageName],
                    appName = displayName,
                    contentPreview = "${detection.songTitle} — ${detection.detectedArtist ?: ""}",
                    timestamp = detection.detectionDate!!,
                    musicDetection = displayed
                )
            }
        }.onSuccess { items ->
            if (items.size < PAGE_SIZE) perSourceExhausted[type] = true
            perSourceSkip[type] = skip + PAGE_SIZE
            postSourceResults(type, items, append)
            if (!append) onSourceLoaded(items.isNotEmpty())
        }.onFailure { e ->
            Timber.e(e, "Error loading music detections")
            CrashlyticsLog.recordNonFatalError(e, "DugUnifiedViewModel: Error loading music detections")
            perSourceExhausted[type] = true
            if (!append) { postSourceResults(type, emptyList()); onSourceLoaded(false) }
        }
    }

    @Synchronized
    private fun onSourceLoaded(hasData: Boolean) {
        sourcesLoaded++
        if (hasData) sourcesWithData++
        if (sourcesLoaded >= 5 && sourcesWithData == 0) {
            setEmptyList()
        }
    }

    // -- Toggle feature --

    fun toggleFeature(feature: DugFeature, enabled: Boolean) {
        _featureUpdateStatus.value = DugFeatureUpdateStatus.UPDATING
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                when (feature.featureType) {
                    DugFeatureType.SMART_DETECTOR -> tablet.smartDetectionEnabled = enabled
                    DugFeatureType.PROFANITY_DETECTOR -> tablet.profanityDetectionEnabled = enabled
                    DugFeatureType.UNSAFE_SEARCH_DETECTOR -> tablet.unsafeSearchDetectionEnabled = enabled
                    DugFeatureType.MOOD_DETECTOR -> tablet.moodDetectionEnabled = enabled
                    DugFeatureType.EXPLICIT_MUSIC_DETECTOR -> tablet.explicitMusicDetectionEnabled = enabled
                }
                tabletRepository.update(tablet)
            }.onSuccess {
                feature.enabled = enabled
                // Repost the list so observers (badge, monitoring-status switches) refresh.
                // MutableLiveData doesn't detect in-place mutation of contained items.
                _featureStates.postValue(_featureStates.value?.toList())
                _featureUpdateStatus.postValue(DugFeatureUpdateStatus.UPDATE_SUCCESS)
            }.onFailure {
                Timber.e(it)
                _featureUpdateStatus.postValue(DugFeatureUpdateStatus.UPDATE_FAILED)
            }
        }
    }
}
