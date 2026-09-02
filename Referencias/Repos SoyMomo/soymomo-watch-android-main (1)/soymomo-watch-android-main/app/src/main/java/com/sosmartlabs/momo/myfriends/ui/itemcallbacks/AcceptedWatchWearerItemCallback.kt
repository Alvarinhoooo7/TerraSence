package com.sosmartlabs.momo.myfriends.ui.itemcallbacks

import com.sosmartlabs.momo.myfriends.model.WatchWearer

/**
 * Item callback for accepted friend requests
 */
class AcceptedWatchWearerItemCallback: BaseWatchWearerItemCallback()  {
    override fun areContentsTheSame(oldItem: WatchWearer, newItem: WatchWearer): Boolean {
        return true // By now, if they are the same element the view for both is always the same
    }
}