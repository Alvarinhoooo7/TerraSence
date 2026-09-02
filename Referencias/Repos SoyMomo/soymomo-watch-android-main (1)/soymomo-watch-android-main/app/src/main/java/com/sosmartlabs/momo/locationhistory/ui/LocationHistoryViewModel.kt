package com.sosmartlabs.momo.locationhistory.ui

import android.content.Context
import android.text.format.DateFormat
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.parse.ParseCloud
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class LocationHistoryViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val watchUserRepository: WatchUserRepository,
) : ViewModel() {

    /* ───────────────────────── LiveData exposed to UI ─────────────────── */

    private val _watch = MutableLiveData<Resource<Wearer, Unit>>()
    val watch: LiveData<Resource<Wearer, Unit>> get() = _watch

    private val _date = MutableLiveData(Calendar.getInstance().time)
    val date: LiveData<Date> get() = _date

    private val _pairLinesLocations =
        MutableLiveData<Resource<LocationData, Unit>>()
    val pairLinesLocations: LiveData<Resource<LocationData, Unit>>
        get() = _pairLinesLocations

    private val _currentIndex = MutableLiveData(0)
    val currentIndex: LiveData<Int> get() = _currentIndex

    private val _isAuto = MutableLiveData(false)
    val isAuto: LiveData<Boolean> get() = _isAuto

    private var lastPointIndex = 0
    private val utcDateFormatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    /* ───────────────────────── Helpers ────────────────────────────────── */

    /**
     * Update selected date.
     * Uses `value` on main-thread calls and `postValue` when invoked from a background thread.
     */
    fun updateDate(newDate: Date) {
        _date.postValue(newDate)
    }

    fun getLastPointIndex(): Int = lastPointIndex

    fun setCurrentIndex(idx: Int) {
        if (_currentIndex.value == idx) return
        _currentIndex.postValue(idx)
    }

    fun toggleAuto()            = _isAuto.postValue(_isAuto.value != true)
    fun stopAuto()              = _isAuto.postValue(false)

    /* ───────────────────────── Watch data ─────────────────────────────── */

    fun loadWatch(watchId: String) {
        _watch.value = Resource(Resource.Status.LOADING)
        viewModelScope.launch(ioContext) {
            runCatching { watchUserRepository.findWatchById(watchId) }
                .onSuccess { _watch.postValue(Resource(Resource.Status.LOAD_SUCCESS, it)) }
                .onFailure {
                    Firebase.crashlytics.recordException(it)
                    _watch.postValue(Resource(Resource.Status.LOAD_ERROR))
                }
        }
    }

    /* ───────────────────────── Clusters API ───────────────────────────── */

    fun loadLocationClusters(deviceId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                _pairLinesLocations.postValue(Resource(Resource.Status.LOADING))

                val params = mutableMapOf<String, Any>(
                    "deviceId"       to deviceId,
                    "offsetInMillis" to TimeZone.getDefault().getOffset(System.currentTimeMillis())
                )

                date.value?.let {
                    val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                    params["date"] = fmt.format(it)
                    Timber.d("LocationHistoryViewModel: Using date: ${params["date"]}")
                }

                Timber.d("LocationHistoryViewModel: Will try to get clusters with params: $params")
                ParseCloud.callFunction<Map<String, Any>>("getClusters", params)
            }.onSuccess { resp ->
                Timber.d("LocationHistoryViewModel: success loading clusters")
                processResponse(resp)
            }.onFailure {
                Firebase.crashlytics.recordException(it)
                _pairLinesLocations.postValue(Resource(Resource.Status.LOAD_ERROR))
            }
        }
    }

    private fun processResponse(response: Map<String, Any>) {
        Timber.d("LocationHistoryViewModel: Processing response $response")

        val points = response["points"] as? Map<String, Any> ?: emptyMap()
        val lines  = response["lines"]  as? Map<String, Any> ?: emptyMap()

        Timber.d("LocationHistoryViewModel: Points: $points, lines: $lines")

        if (points.isNullOrEmpty()) {
            Timber.d("LocationHistoryViewModel: No points found in response")
            _pairLinesLocations.postValue(
                Resource(Resource.Status.LOAD_SUCCESS, LocationData(emptyMap(), emptyMap(), null))
            )
            return
        }

        viewModelScope.launch(Dispatchers.Default) {
            val locDeferred  = async { parseLocations(points) }
            val lineDeferred = async { parseLines(lines) }
            val matchedPathsDeferred = async { parseMatchedPaths(response["matchedPaths"]) }

            val locations = locDeferred.await()
            val lineMap   = lineDeferred.await()
            val matchedPaths = matchedPathsDeferred.await()
            lastPointIndex = (response["lastIndex"] as? Int) ?: 0

            _pairLinesLocations.postValue(
                Resource(Resource.Status.LOAD_SUCCESS, LocationData(lineMap, locations, matchedPaths))
            )
            _currentIndex.postValue(0)    // reset slider
            Timber.d("LocationHistoryViewModel: Processed ${locations.size} locations, ${lines.size} lines, ${matchedPaths?.size ?: 0} matched paths")
        }
    }
    
    /**
     * Parse optional matchedPaths from cloud response
     * Keys match line keys (e.g., "0-1", "1-2")
     * Keys are normalized to min-max format for consistent lookup
     */
    @Suppress("UNCHECKED_CAST")
    private fun parseMatchedPaths(rawMatchedPaths: Any?): Map<String, List<MatchedPathPoint>>? {
        val pathsMap = rawMatchedPaths as? Map<String, Any> ?: return null
        if (pathsMap.isEmpty()) return null
        
        return buildMap {
            pathsMap.forEach { (segmentKey, pathList) ->
                val points = (pathList as? List<Map<String, Any>>)?.mapNotNull { point ->
                    val lat = (point["lat"] as? Number)?.toDouble()
                    val lng = (point["lng"] as? Number)?.toDouble()
                    if (lat != null && lng != null) MatchedPathPoint(lat, lng) else null
                }
                if (!points.isNullOrEmpty()) {
                    // Normalize key to min-max format for consistent lookup (backend may send "10-8" but we need "8-10")
                    val parts = segmentKey.split("-")
                    val normalizedKey = if (parts.size == 2) {
                        val c1 = parts[0].toIntOrNull()
                        val c2 = parts[1].toIntOrNull()
                        if (c1 != null && c2 != null) {
                            if (c1 < c2) "$c1-$c2" else "$c2-$c1"
                        } else segmentKey
                    } else segmentKey
                    put(normalizedKey, points)
                }
            }
        }.ifEmpty { null }
    }

    private fun parseLocations(points: Map<String, Any>): Map<Int, Point> =
        buildMap(points.size) {
            points.forEach { (idx, rawPoint) ->
                val point = rawPoint as? Map<*, *> ?: return@forEach
                val loc   = point["location"] as? Map<*, *> ?: return@forEach
                val lat   = (loc["latitude"]  as? Double)?.toFloat() ?: return@forEach
                val lon   = (loc["longitude"] as? Double)?.toFloat() ?: return@forEach
                val mean  = MeanLocation(lat, lon)

                val clusters = (point["clusters"] as? List<Map<String, Any>>)?.mapNotNull { cl ->
                    val clusterNum = cl["cluster"] as? Int ?: return@mapNotNull null
                    val from = cl["fromTime"] as? String ?: return@mapNotNull null
                    val to   = cl["toTime"]   as? String ?: return@mapNotNull null
                    
                    // Parse new optional fields (backward compatible)
                    val type = ClusterType.fromString(cl["type"] as? String)
                    val duration = (cl["duration"] as? Number)?.toInt()
                    val pointCount = (cl["originalPointCount"] as? Number)?.toInt()
                    val safeZoneName = cl["safeZoneName"] as? String
                    
                    runCatching {
                        ClusterInfo(
                            cluster = clusterNum,
                            fromTime = utcDateFormatter.parse(from)!!,
                            toTime = utcDateFormatter.parse(to)!!,
                            type = type,
                            duration = duration,
                            pointCount = pointCount,
                            safeZoneName = safeZoneName
                        )
                    }.getOrNull()
                }?.sorted() ?: emptyList()

                idx.toIntOrNull()?.let { put(it, Point(mean, clusters)) }
            }
        }


    private fun parseLines(lines: Map<String, Any>): Map<String, Line> =
        buildMap(lines.size) {
            lines.forEach { (_, raw) ->
                val lineData = raw as? Map<*, *> ?: return@forEach
                val cluster1 = lineData["cluster1"] as? Int ?: return@forEach
                val cluster2 = lineData["cluster2"] as? Int ?: return@forEach

                // speedToNext may arrive as List<Double>, List<Float>, or mixed – convert every entry to Float
                val speedsRaw  = lineData["speedToNext"] as? List<*> ?: emptyList<Any>()
                val speedToNext = speedsRaw.mapNotNull { (it as? Number)?.toFloat() }
                    .ifEmpty { listOf(3f) }   // default fallback

                // Normalize key to min-max format for consistent lookup (backend may send "10-8" but we need "8-10")
                val normalizedKey = if (cluster1 < cluster2) "$cluster1-$cluster2" else "$cluster2-$cluster1"
                put(normalizedKey, Line(cluster1, cluster2, speedToNext))
            }
        }
    /* --------------------------------------------------------------------- */

    data class MeanLocation(val latitude: Float, val longitude: Float)

    /**
     * Type of cluster - stop (stationary) or transit (moving)
     */
    enum class ClusterType {
        STOP, TRANSIT;
        
        companion object {
            fun fromString(value: String?): ClusterType? = when (value?.lowercase()) {
                "stop" -> STOP
                "transit" -> TRANSIT
                else -> null
            }
        }
    }

    data class ClusterInfo(
        val cluster: Int,
        val fromTime: Date,
        val toTime: Date,
        // New optional fields (nullable for backward compat with old cloud responses)
        val type: ClusterType? = null,
        val duration: Int? = null,           // Duration in seconds
        val pointCount: Int? = null,         // Number of raw GPS points consolidated
        val safeZoneName: String? = null     // Safe Zone name if within radius
    ) : Comparable<ClusterInfo> {
        override fun compareTo(other: ClusterInfo): Int = fromTime.compareTo(other.fromTime)
        
        fun getTimeString(context: Context): String {
            val is24HourFormat = DateFormat.is24HourFormat(context)
            
            val timeFormat = if (is24HourFormat) {
                SimpleDateFormat("HH:mm", Locale.getDefault())
            } else {
                SimpleDateFormat("h:mm a", Locale.getDefault())
            }
            
            val fromTimeStr = timeFormat.format(fromTime)
            val toTimeStr = timeFormat.format(toTime)
            
            return if (fromTimeStr == toTimeStr) fromTimeStr else "$fromTimeStr - $toTimeStr"
        }
        
        /**
         * Get formatted duration string (e.g., "2h 30m" or "45m")
         */
        fun getDurationString(): String? {
            val durationSeconds = duration ?: return null
            val hours = durationSeconds / 3600
            val minutes = (durationSeconds % 3600) / 60
            
            return when {
                hours > 0 && minutes > 0 -> "${hours}h ${minutes}m"
                hours > 0 -> "${hours}h"
                minutes > 0 -> "${minutes}m"
                else -> null
            }
        }
        
        /**
         * Check if this is a stop (stationary period)
         * Returns true for STOP or null (defensive: treat unknown as stop)
         */
        fun isStop(): Boolean = type != ClusterType.TRANSIT
        
        /**
         * Check if this is a transit (moving period)
         */
        fun isTransit(): Boolean = type == ClusterType.TRANSIT
    }

    data class Point(
        val location: MeanLocation,
        val clusters: List<ClusterInfo>
    ) {
        fun getTimes(context: Context): String = clusters.joinToString(System.lineSeparator()) { it.getTimeString(context) }
        
        /**
         * Get the primary cluster type for this point (first cluster's type)
         */
        fun getPrimaryType(): ClusterType? = clusters.firstOrNull()?.type
        
        /**
         * Get the Safe Zone name if this point is within a Safe Zone
         */
        fun getSafeZoneName(): String? = clusters.firstOrNull()?.safeZoneName
        
        /**
         * Get the total duration at this point
         */
        fun getTotalDuration(): Int? = clusters.firstOrNull()?.duration
        
        /**
         * Check if this point is a stop
         */
        fun isStop(): Boolean = clusters.firstOrNull()?.isStop() == true
    }

    data class Line(val cluster1: Int, val cluster2: Int, val speedToNext: List<Float>)
    
    /**
     * A point on a road-snapped route (from Valhalla route matching)
     */
    data class MatchedPathPoint(val lat: Double, val lng: Double)
    
    /**
     * Wrapper for all location data from the cloud
     * @param lines Map of segment keys to Line objects
     * @param points Map of point indices to Point objects
     * @param matchedPaths Optional map of segment keys to road-snapped paths (from Valhalla)
     */
    data class LocationData(
        val lines: Map<String, Line>,
        val points: Map<Int, Point>,
        val matchedPaths: Map<String, List<MatchedPathPoint>>? = null
    )
}

/* Info-window helper model */
data class PolylineData(val color: Int, val title: String, val message: String)