package com.sosmartlabs.momo.phonebook.ui

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momo.phonebook.model.phonecontact.PhoneContact

/**
 * Callbacks for decide whenan how to update the PhoneBook RecyclerView
 */
class PhoneContactDiffCallback: DiffUtil.ItemCallback<PhoneContact>() {

    /**
     * Determines if two objects represents the same PhoneContact
     * @param oldItem Old PhoneContact
     * @param newItem New PhoneContact
     * @return True if both object represent the same PhoneContact, false otherwise
     */
    override fun areItemsTheSame(oldItem: PhoneContact, newItem: PhoneContact): Boolean {
        return if (oldItem.objectId == null) areContentsTheSame(oldItem, newItem)
        else oldItem.objectId == newItem.objectId
    }

    /**
     * Determines if two PhoneContacts have the same visible content
     * @param oldItem Old PhoneContact
     * @param newItem New PhoneContact
     * @return True if both object have the same visible content, false otherwise
     */
    override fun areContentsTheSame(oldItem: PhoneContact, newItem: PhoneContact): Boolean {
        return oldItem.name == newItem.name
                && oldItem.phone == newItem.phone
                && oldItem.sos == newItem.sos
    }
}