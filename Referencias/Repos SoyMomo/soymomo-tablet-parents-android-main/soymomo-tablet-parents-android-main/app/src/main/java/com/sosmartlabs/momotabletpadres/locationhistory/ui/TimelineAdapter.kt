package com.sosmartlabs.momotabletpadres.locationhistory.ui

import android.content.Context
import android.text.format.DateFormat
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.locationhistory.model.ClusterType
import com.sosmartlabs.momotabletpadres.locationhistory.model.Point
import java.text.SimpleDateFormat
import java.util.Locale

/**
 * Adapter for the timeline RecyclerView in Location History.
 * Displays stops and transit segments with different layouts.
 */
class TimelineAdapter(
    private val context: Context,
    private val onItemClick: (TimelineItem, Int) -> Unit
) : ListAdapter<TimelineItem, RecyclerView.ViewHolder>(TimelineDiffCallback()) {

    companion object {
        private const val VIEW_TYPE_STOP = 0
        private const val VIEW_TYPE_TRANSIT = 1
    }

    private val timeFormat = if (DateFormat.is24HourFormat(context)) {
        SimpleDateFormat("HH:mm", Locale.getDefault())
    } else {
        SimpleDateFormat("h:mm a", Locale.getDefault())
    }

    private var selectedPosition = -1

    override fun getItemViewType(position: Int): Int {
        return when (getItem(position).type) {
            ClusterType.STOP -> VIEW_TYPE_STOP
            ClusterType.TRANSIT -> VIEW_TYPE_TRANSIT
            else -> VIEW_TYPE_STOP // Default to stop for unknown types
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return when (viewType) {
            VIEW_TYPE_TRANSIT -> {
                val view = inflater.inflate(R.layout.item_timeline_transit, parent, false)
                TransitViewHolder(view)
            }
            else -> {
                val view = inflater.inflate(R.layout.item_timeline_stop, parent, false)
                StopViewHolder(view)
            }
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val item = getItem(position)
        val isFirst = position == 0
        val isLast = position == itemCount - 1
        val isSelected = position == selectedPosition

        when (holder) {
            is StopViewHolder -> holder.bind(item, isFirst, isLast, isSelected)
            is TransitViewHolder -> holder.bind(item, isFirst, isLast, isSelected)
        }

        holder.itemView.setOnClickListener {
            val previousSelected = selectedPosition
            selectedPosition = holder.adapterPosition
            if (previousSelected != -1) {
                notifyItemChanged(previousSelected)
            }
            notifyItemChanged(selectedPosition)
            onItemClick(item, holder.adapterPosition)
        }
    }

    fun setSelectedPosition(position: Int) {
        val previousSelected = selectedPosition
        selectedPosition = position
        if (previousSelected != -1 && previousSelected != position) {
            notifyItemChanged(previousSelected)
        }
        if (position != -1) {
            notifyItemChanged(position)
        }
    }

    fun getSelectedPosition(): Int = selectedPosition

    // ViewHolder for stop items
    inner class StopViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvTime: TextView = itemView.findViewById(R.id.tv_time)
        private val ivIcon: ImageView = itemView.findViewById(R.id.iv_icon)
        private val tvLocationName: TextView = itemView.findViewById(R.id.tv_location_name)
        private val tvDuration: TextView = itemView.findViewById(R.id.tv_duration)
        private val tvTimeRange: TextView = itemView.findViewById(R.id.tv_time_range)
        private val lineTop: View = itemView.findViewById(R.id.timeline_line_top)
        private val lineBottom: View = itemView.findViewById(R.id.timeline_line_bottom)

        fun bind(item: TimelineItem, isFirst: Boolean, isLast: Boolean, isSelected: Boolean) {
            tvTime.text = timeFormat.format(item.fromTime)
            
            // Set location name (Safe Zone name, geocoded address, or "Stop")
            tvLocationName.text = item.displayName ?: context.getString(R.string.location_history_stop)
            
            // Set duration
            val durationText = item.getDurationString()
            if (durationText != null) {
                tvDuration.text = context.getString(R.string.location_history_duration, durationText)
                tvDuration.visibility = View.VISIBLE
            } else {
                tvDuration.visibility = View.GONE
            }
            
            // Show time range if arrival/departure differ
            if (item.fromTime != item.toTime) {
                val fromStr = timeFormat.format(item.fromTime)
                val toStr = timeFormat.format(item.toTime)
                if (fromStr != toStr) {
                    tvTimeRange.text = "$fromStr - $toStr"
                    tvTimeRange.visibility = View.VISIBLE
                } else {
                    tvTimeRange.visibility = View.GONE
                }
            } else {
                tvTimeRange.visibility = View.GONE
            }
            
            // Set icon based on whether it's a Safe Zone or regular stop
            ivIcon.setImageResource(
                if (item.safeZoneName != null) R.drawable.ic_timeline_safezone
                else R.drawable.ic_timeline_stop
            )
            
            // Handle timeline lines (hide top line for first item, bottom for last)
            lineTop.visibility = if (isFirst) View.INVISIBLE else View.VISIBLE
            lineBottom.visibility = if (isLast) View.INVISIBLE else View.VISIBLE
            
            // Selection state
            itemView.isSelected = isSelected
            if (isSelected) {
                itemView.setBackgroundColor(context.getColor(R.color.location_history_stop_light))
            } else {
                itemView.setBackgroundColor(android.graphics.Color.TRANSPARENT)
            }
        }
    }

    // ViewHolder for transit items
    inner class TransitViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvTime: TextView = itemView.findViewById(R.id.tv_time)
        private val tvMoving: TextView = itemView.findViewById(R.id.tv_moving)
        private val lineTop: View = itemView.findViewById(R.id.timeline_line_top)
        private val lineBottom: View = itemView.findViewById(R.id.timeline_line_bottom)

        fun bind(item: TimelineItem, isFirst: Boolean, isLast: Boolean, isSelected: Boolean) {
            tvTime.text = timeFormat.format(item.fromTime)
            tvMoving.text = context.getString(R.string.location_history_moving)
            
            // Handle timeline lines
            lineTop.visibility = if (isFirst) View.INVISIBLE else View.VISIBLE
            lineBottom.visibility = if (isLast) View.INVISIBLE else View.VISIBLE
            
            // Selection state
            itemView.isSelected = isSelected
            if (isSelected) {
                itemView.setBackgroundColor(context.getColor(R.color.location_history_transit_light))
            } else {
                itemView.setBackgroundColor(android.graphics.Color.TRANSPARENT)
            }
        }
    }
}

/**
 * Data class representing a single item in the timeline
 */
data class TimelineItem(
    val pointIndex: Int,               // Index in the points map (for map sync)
    val clusterIndex: Int,             // Cluster number for unique identification
    val type: ClusterType?,            // stop or transit
    val fromTime: java.util.Date,      // Start time
    val toTime: java.util.Date,        // End time
    val duration: Int?,                // Duration in seconds
    val latitude: Double,              // Location latitude
    val longitude: Double,             // Location longitude
    val safeZoneName: String? = null,  // Safe Zone name (from cloud)
    val geocodedAddress: String? = null // Geocoded address (from Android Geocoder)
) {
    /**
     * Get the display name for this timeline item.
     * Priority: Safe Zone name > Geocoded address > null (will show "Stop")
     */
    val displayName: String?
        get() = safeZoneName ?: geocodedAddress
    
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
}

/**
 * DiffUtil callback for efficient RecyclerView updates
 */
class TimelineDiffCallback : DiffUtil.ItemCallback<TimelineItem>() {
    override fun areItemsTheSame(oldItem: TimelineItem, newItem: TimelineItem): Boolean {
        // Use both pointIndex and clusterIndex since same point can have multiple visits
        return oldItem.pointIndex == newItem.pointIndex && 
               oldItem.clusterIndex == newItem.clusterIndex
    }

    override fun areContentsTheSame(oldItem: TimelineItem, newItem: TimelineItem): Boolean {
        return oldItem == newItem
    }
}

/**
 * Helper to convert Points map to TimelineItems list.
 * Creates one TimelineItem for EACH cluster visit, not just one per point.
 * This handles cases where the same location is visited multiple times.
 */
fun Map<Int, Point>.toTimelineItems(): List<TimelineItem> {
    return this.entries
        .flatMap { (index, point) ->
            // Create a timeline item for EACH cluster in this point
            point.clusters.map { cluster ->
                TimelineItem(
                    pointIndex = index,
                    clusterIndex = cluster.cluster,
                    type = cluster.type,
                    fromTime = cluster.fromTime,
                    toTime = cluster.toTime,
                    duration = cluster.duration,
                    latitude = point.location.latitude.toDouble(),
                    longitude = point.location.longitude.toDouble(),
                    safeZoneName = cluster.safeZoneName,
                    geocodedAddress = null // Will be filled by the activity after geocoding
                )
            }
        }
        .sortedBy { it.fromTime } // Sort all items chronologically
}
