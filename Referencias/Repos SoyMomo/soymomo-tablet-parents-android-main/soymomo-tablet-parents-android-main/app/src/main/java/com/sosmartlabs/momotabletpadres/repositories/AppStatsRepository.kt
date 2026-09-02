package com.sosmartlabs.momotabletpadres.repositories

import android.content.Context
import com.parse.ParseCloud
import com.parse.ParseQuery
import com.parse.ktx.whereEqualTo
import com.parse.ktx.whereGreaterThanOrEqualTo
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.models.AppStats
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.*
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppStatsRepository @Inject constructor(
    @ApplicationContext context: Context
) {
    private fun intervalInterface(interval: Int = 0): Date = when (interval) {
        0 -> DateUtil.getLastHour()
        1 -> DateUtil.getStartOfDay()
        2 -> DateUtil.getStartOfCurrentWeek()
        3 -> DateUtil.getStartOfCurrentMonth()
        4 -> DateUtil.getLastYear()
        12 -> DateUtil.getTwoDaysAgo()
        13 -> DateUtil.getThreeDaysAgo()
        14 -> DateUtil.getFourDaysAgo()
        15 -> DateUtil.getFiveDaysAgo()
        16 -> DateUtil.getSixDaysAgo()
        17 -> DateUtil.getSevenDaysAgo()
        27 -> DateUtil.getTwoWeeksAgo()
        else -> DateUtil.getLastHour()
    }

    /** Last successful getAppStats() result per (tabletId, interval), for instant paint on re-open. */
    private data class AppStatsSnapshot(val rows: List<AppStats>, val boundaryMs: Long)

    // Process-lifetime, @Singleton-scoped so it survives ViewModel/Fragment recreation and
    // backstack pops. ConcurrentHashMap: loadPeriod can run on several IO coroutines at once.
    private val appStatsCache = ConcurrentHashMap<String, AppStatsSnapshot>()

    private fun cacheKey(tabletId: String, interval: Int): String = "$tabletId|$interval"

    /**
     * Last successful snapshot for (tablet, interval), or null if absent or from a previous
     * calendar period — a day/week/month rollover changes intervalInterface()'s lower bound, so
     * a stale period can never render under the current header. Returns the SAME AppStats
     * references the network returned: callers MUST treat them as read-only (the stats read path
     * does — cleanAppStats filters, aggregate builds new objects, buildChartModel only reads).
     */
    fun getCachedAppStats(tablet: Tablet, interval: Int = 0): List<AppStats>? {
        val id = tablet.objectId ?: return null
        val snapshot = appStatsCache[cacheKey(id, interval)] ?: return null
        if (snapshot.boundaryMs != intervalInterface(interval).time) return null
        return snapshot.rows
    }

    fun getAppStats(
        tablet: Tablet,
        interval: Int = 0,
        customDate: Date? = null
    ): List<AppStats> {
        CrashlyticsLog.log("Querying to get app stats")
        val lowerBound = intervalInterface(interval)
        val rows = ParseQuery
            .getQuery<AppStats>(AppStats().className)
            .whereEqualTo(
                "tablet",
                ParseTablet.createWithoutData(tablet.objectId!!)
            )
            .whereGreaterThanOrEqualTo("lastTimeUsed", lowerBound)
            .setLimit(1000) // a busy month can exceed the default 100-row cap
            .find()
        // Cache the fresh snapshot for instant paint on the next open. An exception above never
        // reaches here, so failures are never cached; a 0-row success caches an empty list (a
        // legitimate "no usage", distinct from "never fetched"). The boundary auto-invalidates
        // it at the next day/week/month rollover (see getCachedAppStats).
        tablet.objectId?.let { id ->
            appStatsCache[cacheKey(id, interval)] = AppStatsSnapshot(rows, lowerBound.time)
        }
        return rows
    }

    /**
     * Fetches the whole last-7-days window in a SINGLE query. The caller buckets
     * the rows into per-day lists client-side. This replaces 7 parallel per-day
     * queries: on low-end devices Parse runs HTTP synchronously on a CPU-sized
     * pool (CPU_COUNT*4+1 threads), so a 7-way fan-out plus retries saturated it
     * and the screen hung until force-close. limit(1000) so the combined window
     * isn't truncated by the default 100-row cap (was up to 100 rows per day).
     */
    fun getAppStatsWeek(tablet: Tablet): List<AppStats> {
        CrashlyticsLog.log("Querying to get app stats for the week")
        return ParseQuery
            .getQuery<AppStats>(AppStats().className)
            .whereEqualTo(
                "tablet",
                ParseTablet.createWithoutData(tablet.objectId!!)
            )
            .whereGreaterThanOrEqualTo("lastTimeUsed", intervalInterface(17)) // 7 days ago, midnight
            .setLimit(1000)
            .find()
    }

    /**
     * Usage for the SAME elapsed days of last week, for a like-for-like "vs last week"
     * comparison: last week's Monday through [elapsedDays] later (e.g. on a Wednesday,
     * last Mon..Wed) — not a fixed rolling 7-day span, which biased the header toward
     * "less than" early in the week.
     */
    fun getAppTimeWeekBefore(
        tablet: Tablet,
        elapsedDays: Int
    ): List<AppStats> {
        CrashlyticsLog.log("Querying to get app stats for the same days last week")
        val start = DateUtil.getStartOfLastWeek()
        val end = Calendar.getInstance().apply {
            time = start
            add(Calendar.DAY_OF_YEAR, elapsedDays)
        }.time
        return ParseQuery
            .getQuery<AppStats>(AppStats().className)
            .whereEqualTo(
                "tablet",
                ParseTablet.createWithoutData(tablet.objectId!!)
            )
            .whereGreaterThanOrEqualTo("lastTimeUsed", start)
            .whereLessThan("lastTimeUsed", end)
            .setLimit(1000)
            .find()
    }

    fun getAppStatsForTablet(tabletId: String, interval: Int = 1): List<AppStats> {
        val tabletObject = ParseTablet.createWithoutData(tabletId)
        CrashlyticsLog.log("Querying to get app stats for tablet")
        return ParseQuery.getQuery(AppStats::class.java)
            .whereEqualTo(AppStats::tablet, tabletObject)
            .whereGreaterThanOrEqualTo(AppStats::lastTimeUsed, intervalInterface(interval))
            .find()
    }

    /**
     * Asks the tablet (via the cloud) to upload its current usage now, so the
     * parent sees near-live data instead of waiting for the tablet's 15-min
     * worker. Best-effort, fire-and-forget — the caller re-queries shortly
     * after. Debounced by the caller; the cloud + tablet also coalesce bursts.
     */
    fun requestAppStatsSync(tablet: Tablet) {
        val objectId = tablet.objectId ?: return
        val params = hashMapOf("tabletId" to objectId)
        ParseCloud.callFunctionInBackground<Map<String, Any>>(
            "requestAppStatsSync",
            params
        ) { _, error ->
            if (error != null) {
                CrashlyticsLog.log("AppStatsRepository: requestAppStatsSync failed: ${error.message}")
            }
        }
    }
}