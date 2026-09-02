package com.sosmartlabs.momo.myfriends.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ItemFriendRequestBinding
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.myfriends.model.WatchWearer
import com.sosmartlabs.momo.myfriends.ui.itemcallbacks.PendingWatchWearerItemCallback
import com.sosmartlabs.momo.myfriends.ui.viewholders.WatchWearerViewHolder

/**
 * Adapter for RecyclerView with pending friend requests
 * @param currentWatchId Id for current selected watch
 * @param itemCallback Callback for pending friend requests
 * @param listener Listener for actions on a RecyclerView element
 */
class PendingWatchWearerAdapter(currentWatchId: String,
                                itemCallback: PendingWatchWearerItemCallback,
                                private val listener: PendingRequestsActionListener):
    BaseWatchWearerAdapter(currentWatchId, itemCallback) {

    /**
     * Listener for actions on a friend request RecyclerView element
     */
    interface PendingRequestsActionListener {
        /**
         * Listener for "Accept" option selected for a friend request
         * @param request Request accepted by user
         */
        fun onAcceptRequest(request: WatchWearer)

        /**
         * Listener for "Reject" option selected for a friend request
         * @param request Request declined by user
         */
        fun onRejectRequest(request: WatchWearer)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): WatchWearerViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return WatchWearerViewHolder(ItemFriendRequestBinding.inflate(inflater,
            parent, false))
    }

    override fun setView(holder: WatchWearerViewHolder, item: WatchWearer,
                         otherWearer: Wearer) {
        holder.rejectButton.setOnClickListener {
            listener.onRejectRequest(item)
        }

        if ((item.watch1 == otherWearer && !item.isWatch2Approved)
            || (item.watch2 == otherWearer && !item.isWatch1Approved) ) {
            holder.acceptButton.visibility = View.VISIBLE
            holder.requestStatus.setText(R.string.my_friends_status_pending)

            holder.acceptButton.setOnClickListener {
                listener.onAcceptRequest(item)
            }
        }
        else {
            holder.requestStatus.setText(R.string.my_friends_status_waiting)
            holder.acceptButton.visibility = View.GONE
            holder.acceptButton.setOnClickListener(null)
        }
    }
}