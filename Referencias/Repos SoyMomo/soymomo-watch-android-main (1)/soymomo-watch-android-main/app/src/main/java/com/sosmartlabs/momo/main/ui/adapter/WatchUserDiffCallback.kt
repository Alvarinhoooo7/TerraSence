package com.sosmartlabs.momo.main.ui.adapter

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momo.main.model.MainCardWatchUser

/**
 * Callback for calculating the diff between two non-null MainCardWatchUser in a list.
 */
class WatchUserDiffCallback : DiffUtil.ItemCallback<MainCardWatchUser>() {
    override fun areItemsTheSame(oldItem: MainCardWatchUser, newItem: MainCardWatchUser) : Boolean {
        return oldItem.watchUser.objectId == newItem.watchUser.objectId
    }

    override fun areContentsTheSame(oldItem: MainCardWatchUser, newItem: MainCardWatchUser) : Boolean {
        return oldItem.areContentsTheSame(newItem)
    }
}