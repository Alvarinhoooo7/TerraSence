package com.sosmartlabs.momo.chat.presentation.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.presentation.model.MemberItem
import com.sosmartlabs.momo.databinding.ItemSelectedMemberChipBinding
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber

class SelectedMemberChipAdapter(
    private val onRemoveClick: (MemberItem) -> Unit,
    private val compact: Boolean = false
) : ListAdapter<MemberItem, SelectedMemberChipAdapter.ChipViewHolder>(MemberChipDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChipViewHolder {
        val binding = ItemSelectedMemberChipBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ChipViewHolder(binding, onRemoveClick, compact)
    }

    override fun onBindViewHolder(holder: ChipViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class ChipViewHolder(
        private val binding: ItemSelectedMemberChipBinding,
        private val onRemoveClick: (MemberItem) -> Unit,
        private val compact: Boolean = false
    ) : RecyclerView.ViewHolder(binding.root) {

        init {
            if (compact) {
                applyCompactSizing()
            }
        }

        fun bind(member: MemberItem) {
            Timber.d("SelectedMemberChipAdapter: Binding chip for ${member.name}")
            
            // Get first name or first word
            val displayName = member.name.split(" ").firstOrNull() ?: member.name
            binding.chipNameTextView.text = displayName
            binding.root.contentDescription = binding.root.context.getString(
                R.string.selected_member_chip_content_description,
                member.name
            )
            binding.removeButton.contentDescription = binding.root.context.getString(
                R.string.selected_member_remove_content_description,
                member.name
            )
            
            binding.chipAvatarImageView.loadImage(
                member.avatarUrl,
                fallback = com.sosmartlabs.momo.utils.ui.DefaultIcons.PROFILE_MOMO_SPACE
            )
            
            binding.removeButton.setOnClickListener {
                Timber.d("SelectedMemberChipAdapter: Remove clicked for ${member.name}")
                onRemoveClick(member)
            }
        }

        private fun applyCompactSizing() {
            val avatarSize = 44.dp()
            val removeSize = 22.dp()
            binding.root.setPadding(4.dp(), 4.dp(), 4.dp(), 2.dp())
            binding.chipAvatarContainer.layoutParams =
                binding.chipAvatarContainer.layoutParams.apply {
                    width = avatarSize
                    height = avatarSize
                }
            binding.removeButton.layoutParams = binding.removeButton.layoutParams.apply {
                width = removeSize
                height = removeSize
            }
            binding.removeButton.setPadding(6.dp(), 6.dp(), 6.dp(), 6.dp())
            binding.chipNameTextView.textSize = 12f
            binding.chipNameTextView.maxWidth = 52.dp()
        }

        private fun Int.dp(): Int {
            val density = binding.root.resources.displayMetrics.density
            return (this * density + 0.5f).toInt()
        }
    }

    private class MemberChipDiffCallback : DiffUtil.ItemCallback<MemberItem>() {
        override fun areItemsTheSame(oldItem: MemberItem, newItem: MemberItem): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: MemberItem, newItem: MemberItem): Boolean {
            return oldItem == newItem
        }
    }
}
