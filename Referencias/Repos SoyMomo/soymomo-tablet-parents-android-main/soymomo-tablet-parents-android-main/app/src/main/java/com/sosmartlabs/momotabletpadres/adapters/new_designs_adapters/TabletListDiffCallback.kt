package com.sosmartlabs.momotabletpadres.adapters.new_designs_adapters

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import timber.log.Timber

class TabletListDiffCallback : DiffUtil.ItemCallback<Tablet>() {

    override fun areItemsTheSame(oldItem: Tablet, newItem: Tablet): Boolean {
        // Compare by objectId since it's the unique identifier for ParseObjects
        val areItemsSame = oldItem.objectId == newItem.objectId
        Timber.v("TabletListDiffCallback: Comparing items: ${oldItem.objectId} vs ${newItem.objectId} = $areItemsSame")
        return areItemsSame
    }

    override fun areContentsTheSame(oldItem: Tablet, newItem: Tablet): Boolean {
        // Compare only the fields that affect the UI
        val areContentsSame = oldItem.profileName == newItem.profileName &&
                oldItem.model == newItem.model &&
                oldItem.batteryPercentage == newItem.batteryPercentage &&
                oldItem.profilePicture?.url == newItem.profilePicture?.url &&
                oldItem.hid == newItem.hid

        Timber.v("TabletListDiffCallback: Comparing contents for ${oldItem.objectId}: $areContentsSame")
        return areContentsSame
    }
}
