package com.sosmartlabs.momo.myfriends.ui.itemcallbacks

import com.sosmartlabs.momo.myfriends.model.WatchWearer

/**
 * Item callback for Pending friend requests
 */
class PendingWatchWearerItemCallback: BaseWatchWearerItemCallback() {
    override fun areContentsTheSame(oldItem: WatchWearer, newItem: WatchWearer): Boolean {
        return oldItem.isWatch1Approved == newItem.isWatch1Approved
                && oldItem.isWatch2Approved == newItem.isWatch2Approved
    }
}