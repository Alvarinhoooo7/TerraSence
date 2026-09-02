package com.sosmartlabs.momo.chat.presentation.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.presentation.model.ContactItem
import com.sosmartlabs.momo.databinding.ItemContactSelectableBinding
import com.sosmartlabs.momo.databinding.ItemNewGroupHeaderBinding
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber

class ContactSelectionAdapter(
    private val onNewGroupClick: () -> Unit,
    private val onContactClick: (ContactItem.Contact) -> Unit
) : ListAdapter<ContactItem, RecyclerView.ViewHolder>(ContactDiffCallback()) {

    companion object {
        private const val VIEW_TYPE_HEADER = 0
        private const val VIEW_TYPE_CONTACT = 1
    }

    override fun getItemViewType(position: Int): Int {
        return when (getItem(position)) {
            is ContactItem.Header -> VIEW_TYPE_HEADER
            is ContactItem.Contact -> VIEW_TYPE_CONTACT
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return when (viewType) {
            VIEW_TYPE_HEADER -> {
                val binding = ItemNewGroupHeaderBinding.inflate(
                    LayoutInflater.from(parent.context), parent, false
                )
                HeaderViewHolder(binding, onNewGroupClick)
            }
            else -> {
                val binding = ItemContactSelectableBinding.inflate(
                    LayoutInflater.from(parent.context), parent, false
                )
                ContactViewHolder(binding, onContactClick)
            }
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (holder) {
            is HeaderViewHolder -> holder.bind(getItem(position) as ContactItem.Header)
            is ContactViewHolder -> holder.bind(getItem(position) as ContactItem.Contact)
        }
    }

    class HeaderViewHolder(
        private val binding: ItemNewGroupHeaderBinding,
        private val onNewGroupClick: () -> Unit
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(header: ContactItem.Header) {
            // Set enabled/disabled state
            binding.root.isEnabled = header.enabled
            binding.root.alpha = if (header.enabled) 1.0f else 0.5f
            
            binding.newGroupTitle.setTextColor(
                ContextCompat.getColor(
                    binding.root.context,
                    if (header.enabled) R.color.colorPrimary else R.color.greySeparator
                )
            )
            
            binding.root.setOnClickListener {
                Timber.d("ContactSelectionAdapter: New Group header clicked, enabled=${header.enabled}")
                onNewGroupClick()
            }
        }
    }

    class ContactViewHolder(
        private val binding: ItemContactSelectableBinding,
        private val onContactClick: (ContactItem.Contact) -> Unit
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(contact: ContactItem.Contact) {
            Timber.d("ContactSelectionAdapter: Binding contact ${contact.name}")
            binding.contactNameTextView.text = contact.name
            binding.contactSubtitleTextView.text = contact.subtitle
            
            binding.contactAvatarImageView.loadImage(
                contact.avatarUrl,
                fallback = com.sosmartlabs.momo.utils.ui.DefaultIcons.PROFILE_MOMO_SPACE
            )
            
            binding.root.setOnClickListener {
                onContactClick(contact)
            }
        }
    }

    private class ContactDiffCallback : DiffUtil.ItemCallback<ContactItem>() {
        override fun areItemsTheSame(oldItem: ContactItem, newItem: ContactItem): Boolean {
            return when {
                oldItem is ContactItem.Header && newItem is ContactItem.Header -> true
                oldItem is ContactItem.Contact && newItem is ContactItem.Contact -> oldItem.id == newItem.id
                else -> false
            }
        }

        override fun areContentsTheSame(oldItem: ContactItem, newItem: ContactItem): Boolean {
            return oldItem == newItem
        }
    }
}

