package com.sosmartlabs.momotabletpadres.contacts.ui.adapter

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.paging.PagingDataAdapter
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.contacts.model.ContactDetail
import com.sosmartlabs.momotabletpadres.contacts.ui.ContactToggleListener
import com.sosmartlabs.momotabletpadres.databinding.ItemContactBinding
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

class ContactsPagingAdapter(
    private val context: Context,
    private val listener: ContactToggleListener
) : PagingDataAdapter<ContactDetail, ContactViewHolder>(ContactDiffCallback()) {

    val updatingContacts = mutableSetOf<String>()

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ContactViewHolder {
        Timber.d("ContactsPagingAdapter: [onCreateViewHolder] Step 1: Inflating ItemContactBinding")
        val binding = ItemContactBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        Timber.d("ContactsPagingAdapter: [onCreateViewHolder] Step 2: Returning new ContactViewHolder")
        return ContactViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ContactViewHolder, position: Int) {
        Timber.d("ContactsPagingAdapter: [onBindViewHolder] Step 1: Attempting to bind ViewHolder at position $position")
        val contact = getItem(position)
        if (contact == null) {
            Timber.w("ContactsPagingAdapter: [onBindViewHolder] Warning: Contact at position $position is null")
            return
        }
        try {
            Timber.d("ContactsPagingAdapter: [onBindViewHolder] Step 2: Binding contact '${contact.fullName}' (${contact.phone}) at position $position")
            bindContact(holder, contact)
        } catch (e: Exception) {
            Timber.e(e, "ContactsPagingAdapter: [onBindViewHolder] Error binding contact at position $position: ${e.message}")
            CrashlyticsLog.recordException(e, "ContactsPagingAdapter: Exception in onBindViewHolder(position=$position, contact=${contact.phone})")
        }
    }

    override fun onBindViewHolder(holder: ContactViewHolder, position: Int, payloads: MutableList<Any>) {
        Timber.d("ContactsPagingAdapter: [onBindViewHolder-payloads] Step 1: Called with payloads (size=${payloads.size}) at position $position")
        if (payloads.isEmpty()) {
            Timber.d("ContactsPagingAdapter: [onBindViewHolder-payloads] Step 2: No payloads, delegating to super")
            super.onBindViewHolder(holder, position, payloads)
        } else {
            Timber.d("ContactsPagingAdapter: [onBindViewHolder-payloads] Step 3: Handling partial update for position $position")
            val contact = getItem(position)
            if (contact == null) {
                Timber.w("ContactsPagingAdapter: [onBindViewHolder-payloads] Warning: Contact at position $position is null")
                return
            }
            try {
                bindContact(holder, contact)
            } catch (e: Exception) {
                Timber.e(e, "ContactsPagingAdapter: [onBindViewHolder-payloads] Error binding contact at position $position: ${e.message}")
                CrashlyticsLog.recordException(e, "ContactsPagingAdapter: Exception in onBindViewHolder(position=$position, contact=${contact.phone}, payloads)")
            }
        }
    }

    private fun bindContact(holder: ContactViewHolder, contact: ContactDetail) {
        Timber.d("ContactsPagingAdapter: [bindContact] Step 1: Binding contact - Name: '${contact.fullName}', Phone: '${contact.phone}', Allowed: ${contact.isAllowed}")

        with(holder) {
            // Step 2: Reset all views to default state
            contactSwitch.setOnCheckedChangeListener(null)
            contactSwitch.isEnabled = true
            contactProgress.visibility = View.GONE
            contactSwitch.visibility = View.VISIBLE

            // Step 3: Set contact information
            contactName.text = contact.fullName.ifEmpty {
                ContextCompat.getString(context, R.string.contacts_contact_detail_unknown_name)
            }
            contactPhone.text = contact.phone.ifEmpty {
                ContextCompat.getString(context, R.string.contacts_contact_detail_unknown_phone)
            }

            // Step 4: Check if this contact is currently being updated
            val isUpdating = updatingContacts.contains(contact.phone)
            Timber.d("ContactsPagingAdapter: [bindContact] Step 4: Contact '${contact.phone}' isUpdating: $isUpdating")

            // Step 5: Set the switch state without triggering the listener
            contactSwitch.isChecked = contact.isAllowed

            // Step 6: Update UI based on updating state
            if (isUpdating) {
                Timber.d("ContactsPagingAdapter: [bindContact] Step 6a: Showing progress for '${contact.phone}'")
                contactSwitch.visibility = View.INVISIBLE
                contactProgress.visibility = View.VISIBLE
                contactSwitch.isEnabled = false
            } else {
                Timber.d("ContactsPagingAdapter: [bindContact] Step 6b: Showing switch for '${contact.phone}'")
                contactSwitch.visibility = View.VISIBLE
                contactProgress.visibility = View.GONE
                contactSwitch.isEnabled = true
            }

            // Step 7: Set the listener with the current contact data
            if (!isUpdating) {
                contactSwitch.setOnCheckedChangeListener { _, isChecked ->
                    Timber.d("ContactsPagingAdapter: [bindContact] Step 7: Switch toggled for '${contact.phone}' - New state: $isChecked (was: ${contact.isAllowed})")
                    if (isChecked != contact.isAllowed) {
                        try {
                            listener.onContactAllowedStatusChanged(contact, isChecked)
                            Timber.d("ContactsPagingAdapter: [bindContact] Step 8: Listener called for '${contact.phone}' with isChecked=$isChecked")
                        } catch (e: Exception) {
                            Timber.e(e, "ContactsPagingAdapter: [bindContact] Error in onContactAllowedStatusChanged for '${contact.phone}': ${e.message}")
                            CrashlyticsLog.recordException(e, "ContactsPagingAdapter: Exception in onContactAllowedStatusChanged(contact=${contact.phone}, isChecked=$isChecked)")
                        }
                    }
                }
            } else {
                Timber.d("ContactsPagingAdapter: [bindContact] Step 7: Listener not set for '${contact.phone}' because isUpdating=true")
            }
        }
    }

    override fun onViewRecycled(holder: ContactViewHolder) {
        Timber.v("ContactsPagingAdapter: [onViewRecycled] Step 1: ViewHolder recycled, cleaning up")
        super.onViewRecycled(holder)
        with(holder) {
            contactSwitch.setOnCheckedChangeListener(null)
            contactProgress.visibility = View.GONE
            contactSwitch.visibility = View.VISIBLE
            contactSwitch.isEnabled = true
        }
        Timber.v("ContactsPagingAdapter: [onViewRecycled] Step 2: Cleanup complete")
    }

    fun notifyContactChanged(phone: String) {
        Timber.d("ContactsPagingAdapter: [notifyContactChanged] Step 1: Notifying change for contact with phone='$phone'")
        val position = snapshot().items.indexOfFirst { it.phone == phone }
        if (position != -1) {
            Timber.d("ContactsPagingAdapter: [notifyContactChanged] Step 2: Notifying item changed at position $position for phone='$phone'")
            notifyItemChanged(position)
        } else {
            Timber.w("ContactsPagingAdapter: [notifyContactChanged] Warning: No contact found with phone='$phone' to notify")
        }
    }
}