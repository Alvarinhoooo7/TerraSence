package com.sosmartlabs.momo.phonebook.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import com.sosmartlabs.momo.databinding.PhoneContactBinding
import com.sosmartlabs.momo.models.WatchModel
import com.sosmartlabs.momo.phonebook.model.phonecontact.PhoneContact

/**
 * Adapter for showing PhoneContacts in a RecyclerView
 */
class PhoneContactsAdapter(private val onContactButtonPressedCallbacks: OnContactButtonPressedCallbacks)
    : ListAdapter<PhoneContact, PhoneContactViewHolder>(PhoneContactDiffCallback()) {

    lateinit var watchModel: WatchModel

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PhoneContactViewHolder {
        return PhoneContactViewHolder(
            PhoneContactBinding.inflate(LayoutInflater.from(parent.context),
                parent, false),
            onContactButtonPressedCallbacks, watchModel
        )
    }

    override fun onBindViewHolder(holder: PhoneContactViewHolder, position: Int) {
        holder.phoneContact = getItem(position)
        holder.setBookmarkVisibility()
        holder.setBookmark()
    }
}