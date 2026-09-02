package com.sosmartlabs.momo.myfriends.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ItemFriendRequestBinding
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.myfriends.model.WatchWearer
import com.sosmartlabs.momo.myfriends.ui.itemcallbacks.AcceptedWatchWearerItemCallback
import com.sosmartlabs.momo.myfriends.ui.viewholders.WatchWearerViewHolder

/**
 * Adapter for RecyclerView with accepted friend requests
 * @param currentWatchId Id for current selected watch
 * @param itemCallback Callback for accepted friend requests
 * @param listener Listener for actions on a RecyclerView element
 * @param isAdmin Indicates if the current user is the admin for the current watch
 */
class AcceptedWatchWearerAdapter(currentWatchId: String,
                                 itemCallback: AcceptedWatchWearerItemCallback,
                                 private val listener: AcceptedRequestsActionListener,
                                 private val isAdmin: Boolean)
    : BaseWatchWearerAdapter(currentWatchId, itemCallback) {

    /**
     * Listener for actions on a friend accepted request RecyclerView element
     */
    interface AcceptedRequestsActionListener {
        /**
         * Listener for "delete" option selected for an accepted friend request
         */
        fun onDeleteRequest(item: WatchWearer)
    }

    override fun onCreateViewHolder(
        parent: ViewGroup,
        viewType: Int
    ): WatchWearerViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        val holder = WatchWearerViewHolder(ItemFriendRequestBinding.inflate(inflater,
            parent, false))
        holder.requestStatus.setText(R.string.my_friends_status_accepted)
        holder.acceptButton.visibility = View.GONE
        if (!isAdmin) {
            holder.rejectButton.visibility = View.GONE
        }
        return holder
    }

    override fun setView(holder: WatchWearerViewHolder, item: WatchWearer,
                         otherWearer: Wearer) {
        if (isAdmin) {
            holder.rejectButton.setOnClickListener {
                listener.onDeleteRequest(item)
            }
        }
    }

}