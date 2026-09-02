package com.sosmartlabs.momotabletpadres.locationhistory.model

import android.content.Context
import android.text.format.DateFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

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