package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import android.graphics.drawable.Drawable
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.appicon.AppIconRepository
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tabletsettings.interfaces.TableListState
import com.sosmartlabs.momotabletpadres.models.AppStats
import com.sosmartlabs.momotabletpadres.repositories.AppStatsRepository
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.utils.NewNetworkStateChecker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.concurrent.atomic.AtomicLong
import javax.inject.Inject

/** One bar of the usage chart: a time slot (hour/day) and its per-app seconds. */
data class ChartBucket(val label: String, val isToday: Boolean, val perApp: Map<String, Int>) {
    val total: Int get() = perApp.values.sum()
}

/** Period-aware chart model: bars stacked by the period's top apps. */
data class ChartModel(
    val buckets: List<ChartBucket>,
    val topApps: List<String>,
    val totalSeconds: Int,
    val busiestLabel: String?,
    val averageSeconds: Int,
    val period: Int
)

@HiltViewModel
class AppStatsViewModel @Inject constructor(
    application: Application,
    private val mUsageStatsRepository: AppStatsRepository,
    private val appIconRepository: AppIconRepository

) : AndroidViewModel(application) {
    var usageStatsList = MutableLiveData<Pair<List<AppStats>, Map<String, Drawable>>>()
    val tableListState = MutableLiveData<TableListState>()
    var usageStatsListPerDay = MutableLiveData<List<List<AppStats>>>()
    var weekBefore = MutableLiveData<Int>()
    val usageChart = MutableLiveData<ChartModel>()

    private var lastSyncRequestMs = 0L
    private val syncDebounceMs = 30_000L
    private val syncReloadDelayMs = 4_000L

    // The period currently shown. The delayed refresh re-queries THIS, not a captured
    // value, so a sync that completes after the user switched chips doesn't snap them back.
    @Volatile
    private var activeInterval = 2

    // Monotonic load token. Every loadPeriod() bumps it; emitPeriod() drops its result if a
    // newer load has started, so concurrent loads (chip taps, the observer/onResume refresh,
    // and the requestFreshStats reload) are last-CALLER-wins — a slower older load can't
    // overwrite the current one, and a stale Loading can't end up the final tableListState.
    private val loadSeq = AtomicLong(0)

    /**
     * Asks the tablet to upload current usage, then re-queries after a short
     * delay so the parent sees near-live data. Debounced so re-opening or
     * resuming the screen repeatedly doesn't spam the tablet — the 15-min
     * worker plus the cloud/tablet KEEP coalescing cover the steady state.
     */
    fun requestFreshStats(tablet: Tablet, interval: Int) {
        val now = System.currentTimeMillis()
        if (now - lastSyncRequestMs < syncDebounceMs) return
        lastSyncRequestMs = now
        viewModelScope.launch(Dispatchers.IO) {
            if (!NewNetworkStateChecker.isThereInternetConnection(getApplication())) return@launch
            mUsageStatsRepository.requestAppStatsSync(tablet)
            // Give the tablet a few seconds to receive the push and upload.
            delay(syncReloadDelayMs)
            // Reload the period the user is on NOW (they may have switched chips meanwhile),
            // not the one captured when the refresh was requested.
            val current = activeInterval
            loadPeriod(tablet, current)
            loadUsageStatsAllWeek(tablet)
        }
    }

    /**
     * Single per-period fetch for the selected interval (1=today, 2=week, 3=month).
     * ONE getAppStats() call feeds BOTH outputs: the aggregated app list + icons
     * (usageStatsList) and the period-aware stacked chart (usageChart) — bars are
     * time slots (hour / weekday / day-of-month) stacked by the period's top apps.
     *
     * Caching: if the repository holds a snapshot for THIS (tablet, interval) we paint it
     * immediately (transform off the main thread), then ALWAYS refresh from the network —
     * getAppStats() overwrites the snapshot, so a refresh is never shadowed by stale data.
     * A cold miss shows the Loading spinner as before; offline/error keep any painted cache
     * on screen instead of blanking. Two emits per open (cache then network) are legend-safe:
     * the built-in chart legend is disabled once in setupChartView. emitPeriod stays the SOLE
     * writer of tableListState.
     */
    fun loadPeriod(tablet: Tablet, interval: Int) {
        activeInterval = interval
        val token = loadSeq.incrementAndGet()
        // Cheap in-memory lookup (reference only); the heavy clean/aggregate/icon work runs on IO.
        val cached = mUsageStatsRepository.getCachedAppStats(tablet, interval)
        if (cached == null) tableListState.postValue(TableListState.Loading)
        viewModelScope.launch(Dispatchers.IO) {
            // 1) Instant paint from the last snapshot, if any.
            cached?.let { emitPeriod(cleanAppStats(it), interval, token) }
            // 2) Network refresh (getAppStats() refreshes the cache on success).
            if (!NewNetworkStateChecker.isThereInternetConnection(getApplication())) {
                // Cold miss offline -> Disconnected as before; if cache already painted, keep it.
                if (cached == null && token == loadSeq.get()) {
                    tableListState.postValue(TableListState.Disconnected)
                }
                return@launch
            }
            runCatching {
                cleanAppStats(mUsageStatsRepository.getAppStats(tablet, interval))
            }.onSuccess { rows ->
                emitPeriod(rows, interval, token)
            }.onFailure {
                Timber.e(it, "AppStatsViewModel: loadPeriod failed")
                if (cached == null && token == loadSeq.get()) {
                    tableListState.postValue(TableListState.Error)
                }
            }
        }
    }

    /**
     * Sole writer of usageStatsList / usageChart / tableListState. Shared by the cache paint and
     * the network result so both go through the identical clean -> aggregate / buildChartModel
     * transform. Drops its result if a newer loadPeriod has superseded this one (token guard),
     * with a re-check after the suspending icon fetch, so a stale load can never win.
     */
    private suspend fun emitPeriod(rows: List<AppStats>, interval: Int, token: Long) {
        if (token != loadSeq.get()) return
        val packageNames = rows.mapNotNull { it.packageName }
        val icons = appIconRepository.getAppIcons(packageNames)
        if (token != loadSeq.get()) return // a newer load started during the icon fetch
        tableListState.postValue(if (rows.isNotEmpty()) TableListState.Populated else TableListState.Empty)
        usageStatsList.postValue(Pair(aggregate(rows), icons))
        usageChart.postValue(buildChartModel(rows, interval))
    }

    private fun appKey(a: AppStats): String = a.appName ?: a.packageName ?: "?"

    private fun dowMonFirst(calDow: Int): Int = if (calDow == Calendar.SUNDAY) 7 else calDow - 1

    private fun deviceLocale(): java.util.Locale =
        getApplication<Application>().resources.configuration.locales[0]

    /** Localized "day month" for the current month, e.g. "June 21" / "21 de junio" / "21. Juni". */
    private fun monthDayLabel(dayOfMonth: Int): String {
        val locale = deviceLocale()
        val cal = Calendar.getInstance().apply { set(Calendar.DAY_OF_MONTH, dayOfMonth) }
        val pattern = android.text.format.DateFormat.getBestDateTimePattern(locale, "dMMMM")
        return SimpleDateFormat(pattern, locale).format(cal.time)
    }

    /** Localized short weekday name for this week's Monday-based index (0=Mon..6=Sun). */
    private fun weekdayLabel(monIndex: Int): String {
        val locale = deviceLocale()
        val cal = Calendar.getInstance()
        val daysFromMon = (cal.get(Calendar.DAY_OF_WEEK) - Calendar.MONDAY + 7) % 7
        cal.add(Calendar.DAY_OF_YEAR, -daysFromMon + monIndex)
        return SimpleDateFormat("EEE", locale).format(cal.time).replaceFirstChar { it.uppercase() }
    }

    private fun buildChartModel(rows: List<AppStats>, interval: Int): ChartModel {
        val topApps = rows.groupBy { appKey(it) }
            .mapValues { e -> e.value.sumOf { it.foregroundUsage } }
            .entries.sortedByDescending { it.value }.take(3).map { it.key }

        val now = Calendar.getInstance()
        val buckets = ArrayList<ChartBucket>()
        when (interval) {
            1 -> { // Today → 24 hourly slots
                val per = Array(24) { HashMap<String, Int>() }
                rows.forEach { a ->
                    val d = a.lastTimeUsed ?: return@forEach
                    val h = Calendar.getInstance().apply { time = d }.get(Calendar.HOUR_OF_DAY)
                    per[h][appKey(a)] = (per[h][appKey(a)] ?: 0) + a.foregroundUsage
                }
                for (h in 0..23) buckets.add(ChartBucket(h.toString(), false, per[h]))
            }
            3 -> { // Month → one slot per day-of-month
                val dim = now.getActualMaximum(Calendar.DAY_OF_MONTH)
                val todayDom = now.get(Calendar.DAY_OF_MONTH)
                val per = Array(dim + 1) { HashMap<String, Int>() }
                rows.forEach { a ->
                    val d = a.lastTimeUsed ?: return@forEach
                    val dom = Calendar.getInstance().apply { time = d }.get(Calendar.DAY_OF_MONTH)
                    if (dom in 1..dim) per[dom][appKey(a)] = (per[dom][appKey(a)] ?: 0) + a.foregroundUsage
                }
                for (dom in 1..dim) buckets.add(ChartBucket(dom.toString(), dom == todayDom, per[dom]))
            }
            else -> { // Week → Mon..Sun
                val todayPos = dowMonFirst(now.get(Calendar.DAY_OF_WEEK))
                val per = Array(7) { HashMap<String, Int>() }
                rows.forEach { a ->
                    val d = a.lastTimeUsed ?: return@forEach
                    val pos = dowMonFirst(Calendar.getInstance().apply { time = d }.get(Calendar.DAY_OF_WEEK))
                    per[pos - 1][appKey(a)] = (per[pos - 1][appKey(a)] ?: 0) + a.foregroundUsage
                }
                // Localized weekday initials (es: L M M J V S D, en: M T W T F S S, de: M D M D F S S).
                val labels = (0..6).map { weekdayLabel(it).take(1) }
                for (i in 0..6) buckets.add(ChartBucket(labels[i], (i + 1) == todayPos, per[i]))
            }
        }

        val total = rows.sumOf { it.foregroundUsage }
        val busiestIdx = buckets.indices.filter { buckets[it].total > 0 }.maxByOrNull { buckets[it].total }
        val busiestLabel = busiestIdx?.let { idx ->
            when (interval) {
                1 -> "${buckets[idx].label}h"
                3 -> monthDayLabel(buckets[idx].label.toInt())
                else -> weekdayLabel(idx)
            }
        }
        val divisor = when (interval) {
            1 -> 1
            3 -> now.get(Calendar.DAY_OF_MONTH)
            else -> dowMonFirst(now.get(Calendar.DAY_OF_WEEK))
        }.coerceAtLeast(1)
        return ChartModel(buckets, topApps, total, busiestLabel, total / divisor, interval)
    }

    fun aggregateAppStats(apps: List<AppStats>): List<AppStats> =
        aggregate(cleanAppStats(apps)) // clean first: Parse can hold duplicate AppStats rows

    /**
     * Merges duplicate-package rows (sum usage, keep latest lastTimeUsed), sorted usage desc.
     * Input must be pre-cleaned. O(n) via a LinkedHashMap keyed on packageName; the linked map
     * preserves first-insertion order so the final sort's tie ordering matches the previous
     * nested-loop version exactly.
     */
    private fun aggregate(cleanedAppsStats: List<AppStats>): List<AppStats> {
        val byPackage = LinkedHashMap<String?, AppStats>()
        for (app in cleanedAppsStats) {
            val existing = byPackage[app.packageName]
            if (existing == null) {
                val appStats = AppStats()
                appStats.foregroundUsage = app.foregroundUsage
                appStats.appName = app.appName
                appStats.name = app.name
                appStats.lastTimeUsed = app.lastTimeUsed
                appStats.packageName = app.packageName
                byPackage[app.packageName] = appStats
            } else {
                existing.foregroundUsage += app.foregroundUsage
                // "Last used" must be the MOST RECENT session across the aggregated rows:
                // prefer any non-null over null, and among non-nulls keep the strictly later one.
                val appLast = app.lastTimeUsed
                if (appLast != null && (existing.lastTimeUsed == null || appLast.after(existing.lastTimeUsed))) {
                    existing.lastTimeUsed = appLast
                }
            }
        }
        // EXACT original ordering: stable ascending by usage, then the whole list reversed.
        // Do NOT replace with sortedByDescending — it resolves equal-usage ties differently.
        return byPackage.values.toList().sortedBy { it.foregroundUsage }.reversed()
    }

    /**
     * Removes duplicate rows (Parse can hold dupes) on the exact (packageName, foregroundUsage,
     * lastTimeUsed) triple the previous nested loop used. O(n) via a HashSet vs the old O(n^2).
     * Keeps the first occurrence in input order and returns the original references (filters,
     * never mutates), so cached rows stay safe to share.
     */
    private fun cleanAppStats(apps: List<AppStats>): List<AppStats> {
        val seen = HashSet<Triple<String?, Int, Date?>>(apps.size * 2)
        val out = ArrayList<AppStats>(apps.size)
        for (app in apps) {
            if (seen.add(Triple(app.packageName, app.foregroundUsage, app.lastTimeUsed))) {
                out.add(app)
            }
        }
        return out
    }

    fun getAppUsageToday(packageName : String): Long {
        usageStatsList.value?.first?.forEach {
            if (it.packageName == packageName) {
                return it.foregroundUsage.toLong()
            }
        }
        return 0
    }

    /**
     * Loads last week's same-elapsed-days total for the "vs last week" header.
     * Header-only — does NOT touch tableListState (see loadUsageStatsAllWeek).
     */
    fun getDataWeekBefore(tablet: Tablet, elapsedDays: Int) {
        viewModelScope.launch(Dispatchers.IO) {
            if (!NewNetworkStateChecker.isThereInternetConnection(getApplication())) return@launch
            runCatching {
                mUsageStatsRepository.getAppTimeWeekBefore(tablet, elapsedDays)
            }.onSuccess { rows ->
                weekBefore.postValue(rows.sumOf { it.foregroundUsage })
            }.onFailure {
                Timber.e(it, "AppStatsViewModel: getDataWeekBefore failed")
            }
        }
    }

    /**
     * Loads the whole current week (per-day buckets) for the "vs last week" header.
     * Deliberately does NOT touch tableListState: the chart spinner is driven solely
     * by loadPeriod(), so this secondary header load can't make the screen flicker.
     */
    fun loadUsageStatsAllWeek(tablet: Tablet) {
        usageStatsListPerDay.postValue(ArrayList())
        viewModelScope.launch(Dispatchers.IO) {
            if (!NewNetworkStateChecker.isThereInternetConnection(getApplication())) return@launch
            // One query for the whole week, bucketed into 7 days client-side.
            // Was 7 parallel Parse finds — a fan-out that saturated Parse's
            // small (CPU-sized) network pool on low-end devices and hung the
            // screen until force-close.
            runCatching {
                mUsageStatsRepository.getAppStatsWeek(tablet)
            }.onSuccess { weekStats ->
                usageStatsListPerDay.postValue(bucketByDay(weekStats))
            }.onFailure {
                Timber.e(it, "AppStatsViewModel: loadUsageStatsAllWeek failed")
            }
        }
    }

    /**
     * Buckets week rows into [today, -1d, -2d, ... -6d]. Day boundaries are
     * midnight-aligned and strictly descending, so a row's day is the first
     * lower-bound it reaches (lastTimeUsed >= bound) — mirroring the windows the
     * old per-interval day queries used. Each bucket is then aggregated per app.
     */
    private fun bucketByDay(weekStats: List<AppStats>): List<List<AppStats>> {
        val bounds = listOf(
            DateUtil.getStartOfDay(),   // today
            DateUtil.getTwoDaysAgo(),   // -1
            DateUtil.getThreeDaysAgo(), // -2
            DateUtil.getFourDaysAgo(),  // -3
            DateUtil.getFiveDaysAgo(),  // -4
            DateUtil.getSixDaysAgo(),   // -5
            DateUtil.getSevenDaysAgo()  // -6
        )
        val buckets = MutableList(7) { mutableListOf<AppStats>() }
        for (stat in weekStats) {
            val used = stat.lastTimeUsed ?: continue
            val idx = bounds.indexOfFirst { !used.before(it) } // used >= bound
            if (idx >= 0) buckets[idx].add(stat)
        }
        return buckets.map { aggregateAppStats(it) }
    }
}