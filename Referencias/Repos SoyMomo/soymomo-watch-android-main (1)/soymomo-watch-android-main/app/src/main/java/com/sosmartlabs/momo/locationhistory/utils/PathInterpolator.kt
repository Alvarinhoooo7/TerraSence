package com.sosmartlabs.momo.locationhistory.utils

import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.SphericalUtil

/**
 * Utility class to interpolate positions along a multi-point path.
 * 
 * Pre-computes cumulative distances along the path and provides efficient
 * interpolation for any fraction (0.0 to 1.0) along the total path length.
 * 
 * Used for animating markers along road-snapped routes from Valhalla.
 */
class PathInterpolator(private val path: List<LatLng>) {
    
    /** Total distance of the path in meters */
    val totalDistance: Double
    
    /** Cumulative distances at each point (index 0 = 0.0, index n = totalDistance) */
    private val cumulativeDistances: DoubleArray
    
    init {
        require(path.size >= 2) { "Path must have at least 2 points" }
        
        cumulativeDistances = DoubleArray(path.size)
        cumulativeDistances[0] = 0.0
        
        for (i in 1 until path.size) {
            val segmentDistance = SphericalUtil.computeDistanceBetween(path[i - 1], path[i])
            cumulativeDistances[i] = cumulativeDistances[i - 1] + segmentDistance
        }
        
        totalDistance = cumulativeDistances.last()
    }
    
    /**
     * Get the position at a given fraction along the path.
     * 
     * @param fraction Value from 0.0 (start) to 1.0 (end)
     * @return The interpolated LatLng position
     */
    fun interpolate(fraction: Double): LatLng {
        // Handle edge cases
        if (fraction <= 0.0) return path.first()
        if (fraction >= 1.0) return path.last()
        if (totalDistance == 0.0) return path.first()
        
        // Calculate target distance along the path
        val targetDistance = fraction * totalDistance
        
        // Find the segment containing this distance using binary search
        val segmentIndex = findSegmentIndex(targetDistance)
        
        // Calculate the fraction within this segment
        val segmentStart = cumulativeDistances[segmentIndex]
        val segmentEnd = cumulativeDistances[segmentIndex + 1]
        val segmentLength = segmentEnd - segmentStart
        
        // Handle zero-length segments (duplicate points)
        if (segmentLength == 0.0) return path[segmentIndex]
        
        val segmentFraction = (targetDistance - segmentStart) / segmentLength
        
        // Interpolate within the segment
        return SphericalUtil.interpolate(
            path[segmentIndex],
            path[segmentIndex + 1],
            segmentFraction
        )
    }
    
    /**
     * Find the segment index that contains the target distance.
     * Uses binary search for efficiency on long paths.
     */
    private fun findSegmentIndex(targetDistance: Double): Int {
        var low = 0
        var high = cumulativeDistances.size - 2 // Last valid segment start index
        
        while (low < high) {
            val mid = (low + high + 1) / 2
            if (cumulativeDistances[mid] <= targetDistance) {
                low = mid
            } else {
                high = mid - 1
            }
        }
        
        return low
    }
    
    companion object {
        /**
         * Create a PathInterpolator from a list of points, or return null if invalid.
         */
        fun createOrNull(path: List<LatLng>?): PathInterpolator? {
            return if (path != null && path.size >= 2) {
                PathInterpolator(path)
            } else {
                null
            }
        }
    }
}
