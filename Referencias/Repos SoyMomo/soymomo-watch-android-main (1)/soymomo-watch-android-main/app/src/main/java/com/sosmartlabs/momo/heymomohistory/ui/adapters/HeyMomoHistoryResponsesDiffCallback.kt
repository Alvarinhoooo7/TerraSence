package com.sosmartlabs.momo.heymomohistory.ui.adapters

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momo.heymomohistory.data.model.HeyMomoHistoryItem

// DiffUtil callback to efficiently detect changes
class HeyMomoHistoryResponsesDiffCallback : DiffUtil.ItemCallback<HeyMomoHistoryItem>() {
    override fun areItemsTheSame(oldItem: HeyMomoHistoryItem, newItem: HeyMomoHistoryItem): Boolean {
        return when {
            oldItem is HeyMomoHistoryItem.DateHeader && newItem is HeyMomoHistoryItem.DateHeader -> {
                oldItem.date == newItem.date
            }
            oldItem is HeyMomoHistoryItem.HeyMomoResponseItem && newItem is HeyMomoHistoryItem.HeyMomoResponseItem -> {
                oldItem.deviceId == newItem.deviceId &&
                        oldItem.createdAt == newItem.createdAt &&
                        oldItem.question == newItem.question &&
                        oldItem.response == newItem.response
            }
            else -> false
        }
    }

    override fun areContentsTheSame(oldItem: HeyMomoHistoryItem, newItem: HeyMomoHistoryItem): Boolean {
        return oldItem == newItem
    }
}