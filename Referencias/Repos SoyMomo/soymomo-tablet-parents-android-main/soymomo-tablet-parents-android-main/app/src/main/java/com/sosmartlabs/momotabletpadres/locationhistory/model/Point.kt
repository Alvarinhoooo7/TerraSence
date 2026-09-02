package com.sosmartlabs.momotabletpadres.locationhistory.model

import android.content.Context

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