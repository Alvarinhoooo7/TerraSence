package com.sosmartlabs.momo.chat.presentation.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.presentation.model.MemberItem
import com.sosmartlabs.momo.databinding.ItemMemberSelectionHeaderBinding
import com.sosmartlabs.momo.databinding.ItemMemberSelectableBinding
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber

internal class MemberSelectionAdapter(
    private val onMemberToggled: (MemberItem, Boolean) -> Unit
) : ListAdapter<MemberSelectionListItem, RecyclerView.ViewHolder>(MemberDiffCallback()) {

    override fun getItemViewType(position: Int): Int {
        return when (getItem(position)) {
            is MemberSelectionListItem.Header -> VIEW_TYPE_HEADER
            is MemberSelectionListItem.Member -> VIEW_TYPE_MEMBER
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return when (viewType) {
            VIEW_TYPE_HEADER -> HeaderViewHolder(
                ItemMemberSelectionHeaderBinding.inflate(
                    LayoutInflater.from(parent.context), parent, false
                )
            )
            else -> MemberViewHolder(
                ItemMemberSelectableBinding.inflate(
                    LayoutInflater.from(parent.context), parent, false
                ),
                onMemberToggled
            )
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val item = getItem(position)) {
            is MemberSelectionListItem.Header -> (holder as HeaderViewHolder).bind(item)
            is MemberSelectionListItem.Member -> (holder as MemberViewHolder).bind(item.member)
        }
    }

    override fun onBindViewHolder(
        holder: RecyclerView.ViewHolder,
        position: Int,
        payloads: MutableList<Any>
    ) {
        val item = getItem(position)
        if (holder is MemberViewHolder &&
            item is MemberSelectionListItem.Member &&
            payloads.any { it === SelectionChanged }
        ) {
            holder.bindSelection(item.member)
        } else {
            onBindViewHolder(holder, position)
        }
    }

    class HeaderViewHolder(
        private val binding: ItemMemberSelectionHeaderBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(item: MemberSelectionListItem.Header) {
            binding.memberSectionHeaderTextView.text = item.title.uppercase()
        }
    }

    class MemberViewHolder(
        private val binding: ItemMemberSelectableBinding,
        private val onMemberToggled: (MemberItem, Boolean) -> Unit
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(member: MemberItem) {
            Timber.d("MemberSelectionAdapter: Binding member ${member.name}")
            binding.memberNameTextView.text = member.name
            binding.memberDetailTextView.text = member.detailText()

            if (member.isWearer) {
                binding.wearerBadge.visibility = View.VISIBLE
            } else {
                binding.wearerBadge.visibility = View.GONE
            }

            binding.memberAvatarImageView.loadImage(
                member.avatarUrl,
                fallback = com.sosmartlabs.momo.utils.ui.DefaultIcons.PROFILE_MOMO_SPACE
            )

            bindSelection(member)
        }

        fun bindSelection(member: MemberItem) {
            binding.memberCheckBox.setOnCheckedChangeListener(null)
            binding.memberCheckBox.isChecked = member.isSelected
            val contentDescription = member.contentDescription()
            binding.root.contentDescription = contentDescription
            binding.memberCheckBox.contentDescription = contentDescription

            binding.root.setOnClickListener {
                binding.memberCheckBox.isChecked = !binding.memberCheckBox.isChecked
            }

            binding.memberCheckBox.setOnCheckedChangeListener { _, isChecked ->
                Timber.d("MemberSelectionAdapter: Checkbox toggled for ${member.name} -> $isChecked")
                onMemberToggled(member, isChecked)
            }
        }

        private fun MemberItem.contentDescription(): String {
            val context = binding.root.context
            val selectedText = context.getString(
                if (isSelected) {
                    R.string.member_selection_state_selected
                } else {
                    R.string.member_selection_state_not_selected
                }
            )
            return context.getString(
                R.string.member_selectable_row_content_description,
                name,
                detailText(),
                selectedText
            )
        }

        private fun MemberItem.detailText(): String {
            val context = binding.root.context
            return if (isWearer) {
                val modelName = wearerModelName
                if (modelName.isNullOrBlank()) {
                    context.getString(R.string.group_member_type_wearer)
                } else {
                    modelName
                }
            } else {
                context.getString(R.string.group_member_type_parent)
            }
        }
    }

    private object SelectionChanged

    private class MemberDiffCallback : DiffUtil.ItemCallback<MemberSelectionListItem>() {
        override fun areItemsTheSame(
            oldItem: MemberSelectionListItem,
            newItem: MemberSelectionListItem
        ): Boolean {
            return when {
                oldItem is MemberSelectionListItem.Header && newItem is MemberSelectionListItem.Header ->
                    oldItem.title == newItem.title
                oldItem is MemberSelectionListItem.Member && newItem is MemberSelectionListItem.Member ->
                    oldItem.member.id == newItem.member.id
                else -> false
            }
        }

        override fun areContentsTheSame(
            oldItem: MemberSelectionListItem,
            newItem: MemberSelectionListItem
        ): Boolean {
            return oldItem == newItem
        }

        override fun getChangePayload(
            oldItem: MemberSelectionListItem,
            newItem: MemberSelectionListItem
        ): Any? {
            if (oldItem !is MemberSelectionListItem.Member || newItem !is MemberSelectionListItem.Member) {
                return null
            }

            val oldMember = oldItem.member
            val newMember = newItem.member
            val onlySelectionChanged =
                oldMember.name == newMember.name
                        && oldMember.avatarUrl == newMember.avatarUrl
                        && oldMember.isWearer == newMember.isWearer
                        && oldMember.wearerModelName == newMember.wearerModelName

            if (!onlySelectionChanged) {
                return null
            }

            if (oldMember.isSelected == newMember.isSelected) {
                return null
            }

            return SelectionChanged
        }
    }

    private companion object {
        const val VIEW_TYPE_HEADER = 0
        const val VIEW_TYPE_MEMBER = 1
    }
}
