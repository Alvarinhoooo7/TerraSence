package com.sosmartlabs.momo.reminders.ui

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momo.reminders.model.WatchApplication

class WatchApplicationDiffCallback : DiffUtil.ItemCallback<WatchApplication>() {
    override fun areItemsTheSame(oldItem: WatchApplication, newItem: WatchApplication): Boolean {
        return oldItem.packageName == newItem.packageName
    }
    override fun areContentsTheSame(oldItem: WatchApplication, newItem: WatchApplication): Boolean {
        return oldItem.icon == newItem.icon &&
                oldItem.packageName == newItem.packageName &&
                oldItem.name == newItem.name
    }
}