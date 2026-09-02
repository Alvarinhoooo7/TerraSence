package com.sosmartlabs.momo.myfriends.ui.adapters

import androidx.recyclerview.widget.ListAdapter
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.bitmap.RoundedCorners
import com.bumptech.glide.request.RequestOptions
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.myfriends.model.WatchWearer
import com.sosmartlabs.momo.myfriends.ui.itemcallbacks.BaseWatchWearerItemCallback
import com.sosmartlabs.momo.myfriends.ui.viewholders.WatchWearerViewHolder

/**
 * Base adapter for pending and accepted friend request RecyclerViews
 * @param itemCallback itemCallback for WatchWearers
 */
abstract class BaseWatchWearerAdapter(private val currentWatchId: String,
                                                                    itemCallback: BaseWatchWearerItemCallback
)
    : ListAdapter<WatchWearer, WatchWearerViewHolder>(itemCallback) {

    override fun onBindViewHolder(holder: WatchWearerViewHolder, position: Int) {
        val watchWearer = getItem(position)
        //if (watchWearer.watch1 == null || watchWearer.watch2 == null) {
          //  return
        //}
        val otherWatch = if (watchWearer.watch1.objectId != currentWatchId)
            watchWearer.watch1
        else
            watchWearer.watch2
        holder.watchName.text = otherWatch.name()
        holder.watchId.text = otherWatch.deviceId

        if (otherWatch.image?.url != null) {
            Glide.with(holder.contactImage.context)
                .load(otherWatch.image?.url)
                .apply(RequestOptions.bitmapTransform( RoundedCorners(8)))
                .into(holder.contactImage)
        }

        else {
            holder.contactImage.setImageResource(R.drawable.ic_default_avatar)
        }

        setView(holder, watchWearer, otherWatch)
    }

    /**
     * Sets the view details for the given watch wearer.
     * Must be implemented for the derived classes from this class.
     * @param holder ViewHolder with the view to set
     * @param item Item to set in view
     * @param otherWearer Other wearer associated to friend request
     */
    protected abstract fun setView(holder: WatchWearerViewHolder, item: WatchWearer,
                                   otherWearer: Wearer)
}