package com.sosmartlabs.momotabletpadres.contacts.ui.adapter

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momotabletpadres.contacts.model.ContactDetail
import timber.log.Timber

/**
 * Callback for calculating the diff between two non-null ContactDetail items in a list.
 */
class ContactDiffCallback : DiffUtil.ItemCallback<ContactDetail>() {
    override fun areItemsTheSame(oldItem: ContactDetail, newItem: ContactDetail): Boolean {
        val areItemsSame = oldItem.phoneContactObjectId == newItem.phoneContactObjectId &&
                          oldItem.phone == newItem.phone
        Timber.v("ContactDiffCallback: Comparing items - old ID: ${oldItem.phoneContactObjectId}, new ID: ${newItem.phoneContactObjectId}, same: $areItemsSame")
        return areItemsSame
    }

    override fun areContentsTheSame(oldItem: ContactDetail, newItem: ContactDetail): Boolean {
        val areContentsSame = oldItem.phoneContactObjectId == newItem.phoneContactObjectId &&
                             oldItem.phone == newItem.phone &&
                             oldItem.fullName == newItem.fullName &&
                             oldItem.isAllowed == newItem.isAllowed
        Timber.v("ContactDiffCallback: Comparing contents - old: $oldItem, new: $newItem, same: $areContentsSame")
        return areContentsSame
    }
}