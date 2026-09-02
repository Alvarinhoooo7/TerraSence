package com.sosmartlabs.momotabletpadres.locationhistory.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parse.ParseCloud
import com.sosmartlabs.momotabletpadres.locationhistory.model.ClusterInfo
import com.sosmartlabs.momotabletpadres.locationhistory.model.ClusterType
import com.sosmartlabs.momotabletpadres.locationhistory.model.Line
import com.sosmartlabs.momotabletpadres.locationhistory.model.MeanLocation
import com.sosmartlabs.momotabletpadres.locationhistory.model.Point
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.Resource
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

@HiltViewModel
class LocationHistoryViewModel @Inject constructor(
    private val tabletRepository: TabletRepository,
) : ViewModel() {

    /* ───────────────────────── LiveData exposed to UI ─────────────────── */

    private val _tablet = MutableLiveData<Resource<Tablet, Unit>>()
    val tablet: LiveData<Resource<Tablet, Unit>> get() = _tablet

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
    // ThreadLocal because SimpleDateFormat is not thread-safe and parseLocations runs
    // concurrently with parseLines / parseMatchedPaths via async on Dispatchers.Default.
    private val utcDateFormatter = object : ThreadLocal<SimpleDateFormat>() {
        override fun initialValue(): SimpleDateFormat =
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
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

    fun toggleAuto() = _isAuto.postValue(_isAuto.value != true)
    fun stopAuto() = _isAuto.postValue(false)

    fun loadTablet(tabletId: String) {
        Timber.d("LocationHistoryViewModel: Loading tablet with ID: $tabletId")
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                _tablet.postValue(Resource(Resource.Status.LOADING))
                tabletRepository.getTabletByObjectId(tabletId)
            }.onSuccess { tablet ->
                _tablet.postValue(Resource(Resource.Status.LOAD_SUCCESS, tablet))
                Timber.d("LocationHistoryViewModel: Successfully loaded tablet: ${tablet.objectId}")
            }.onFailure { e ->
                Timber.e(e, "LocationHistoryViewModel: Error loading tablet with ID: $tabletId")
                _tablet.postValue(Resource(Resource.Status.LOAD_ERROR))
            }
        }
    }

    /* ───────────────────────── Clusters API ───────────────────────────── */

    fun loadLocationClusters(tabletId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                _pairLinesLocations.postValue(Resource(Resource.Status.LOADING))

                val params = mutableMapOf<String, Any>(
                    "tabletId" to tabletId,
                    "offsetInMillis" to TimeZone.getDefault().getOffset(System.currentTimeMillis()),
                    "stdbscanEps1" to 50,
                    "stdbscanEps2" to 300,
                    "stdbscanMinPts" to 5
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
                Timber.e(it, "Error loading location clusters")
                _pairLinesLocations.postValue(Resource(Resource.Status.LOAD_ERROR))
            }
        }
    }

    private fun processResponse(response: Map<String, Any>) {
        Timber.d("LocationHistoryViewModel: Processing response $response")

        val points = response["points"] as? Map<String, Any> ?: emptyMap()
        val lines = response["lines"] as? Map<String, Any> ?: emptyMap()

        Timber.d("LocationHistoryViewModel: Points: $points, lines: $lines")

        if (points.isNullOrEmpty()) {
            Timber.d("LocationHistoryViewModel: No points found in response")
            _pairLinesLocations.postValue(
                Resource(Resource.Status.LOAD_SUCCESS, LocationData(emptyMap(), emptyMap(), null))
            )
            return
        }

        viewModelScope.launch(Dispatchers.Default) {
            val locDeferred = async { parseLocations(points) }
            val lineDeferred = async { parseLines(lines) }
            val matchedPathsDeferred = async { parseMatchedPaths(response["matchedPaths"]) }

            val locations = locDeferred.await()
            val lineMap = lineDeferred.await()
            val matchedPaths = matchedPathsDeferred.await()
            lastPointIndex = (response["lastIndex"] as? Int) ?: 0

            _pairLinesLocations.postValue(
                Resource(Resource.Status.LOAD_SUCCESS, LocationData(lineMap, locations, matchedPaths))
            )
            _currentIndex.postValue(0) // reset slider
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
                val lat   = (loc["latitude"]  as? Number)?.toFloat() ?: return@forEach
                val lon   = (loc["longitude"] as? Number)?.toFloat() ?: return@forEach
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
                        val formatter = utcDateFormatter.get()!!
                        ClusterInfo(
                            cluster = clusterNum,
                            fromTime = formatter.parse(from)!!,
                            toTime = formatter.parse(to)!!,
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
                val speedsRaw = lineData["speedToNext"] as? List<*> ?: emptyList<Any>()
                val speedToNext = speedsRaw.mapNotNull { (it as? Number)?.toFloat() }
                    .ifEmpty { listOf(3f) } // default fallback

                // Normalize key to min-max format for consistent lookup (backend may send "10-8" but we need "8-10")
                val normalizedKey = if (cluster1 < cluster2) "$cluster1-$cluster2" else "$cluster2-$cluster1"
                put(normalizedKey, Line(cluster1, cluster2, speedToNext))
            }
        }
}