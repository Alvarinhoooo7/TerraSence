package com.sosmartlabs.momo.myfriends.ui.itemcallbacks

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momo.myfriends.model.WatchWearer

/**
 * Base ItemCallback for WatchWearers
 */
abstract class BaseWatchWearerItemCallback: DiffUtil.ItemCallback<WatchWearer>() {
    override fun areItemsTheSame(oldItem: WatchWearer, newItem: WatchWearer): Boolean {
        return oldItem.objectId == newItem.objectId
    }
}