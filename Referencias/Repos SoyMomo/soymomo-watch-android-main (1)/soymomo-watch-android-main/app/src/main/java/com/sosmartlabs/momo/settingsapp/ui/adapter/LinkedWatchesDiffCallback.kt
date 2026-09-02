package com.sosmartlabs.momo.settingsapp.ui.adapter

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momo.models.WatchUser

class LinkedWatchesDiffCallback: DiffUtil.ItemCallback<WatchUser>() {
    override fun areItemsTheSame(oldItem: WatchUser, newItem: WatchUser): Boolean {
        return oldItem == newItem
    }

    override fun areContentsTheSame(oldItem: WatchUser, newItem: WatchUser): Boolean {
        return oldItem == newItem
    }
}