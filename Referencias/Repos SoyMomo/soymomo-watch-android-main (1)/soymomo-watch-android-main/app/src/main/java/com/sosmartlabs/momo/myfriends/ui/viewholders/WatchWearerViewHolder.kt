package com.sosmartlabs.momo.myfriends.ui.viewholders

import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.databinding.ItemFriendRequestBinding

/**
 * Base ViewHolder for WatchWearers
 */
class WatchWearerViewHolder(private val binding: ItemFriendRequestBinding): RecyclerView.ViewHolder(binding.root) {

    /**
     * ImageView for contact image
     */
    val contactImage get() = binding.contactImage

    /**
     * TextView for watch name
     */
    val watchName get() = binding.watchName

    /**
     * TextView for watch Id
     */
    val watchId get() = binding.watchId

    /**
     * Status for the current request
     */
    val requestStatus get() = binding.requestStatus

    /**
     * Button for accepting a friend request
     */
    val acceptButton = binding.acceptButton

    /**
     * Button for rejecting a friend request
     */
    val rejectButton = binding.rejectButton
}