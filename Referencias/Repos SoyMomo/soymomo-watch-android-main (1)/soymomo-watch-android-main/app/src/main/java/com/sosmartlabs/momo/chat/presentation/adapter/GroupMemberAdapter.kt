package com.sosmartlabs.momo.chat.presentation.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.local.entity.GroupMemberEntity
import com.sosmartlabs.momo.databinding.ItemGroupMemberBinding
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber

class GroupMemberAdapter(
    private val currentUserId: String,
    private val ownerId: String,
    private val onMemberClick: (GroupMemberEntity) -> Unit
) : ListAdapter<GroupMemberEntity, GroupMemberAdapter.MemberViewHolder>(MemberDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MemberViewHolder {
        val binding = ItemGroupMemberBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return MemberViewHolder(binding, ownerId, onMemberClick)
    }

    override fun onBindViewHolder(holder: MemberViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class MemberViewHolder(
        private val binding: ItemGroupMemberBinding,
        private val ownerId: String,
        private val onMemberClick: (GroupMemberEntity) -> Unit
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(member: GroupMemberEntity) {
            Timber.d("GroupMemberAdapter: Binding member ${member.name}")
            val roleText = member.roleText()
            binding.memberNameTextView.text = member.name
            binding.memberDetailTextView.text = member.detailText()
            
            binding.memberAvatarImageView.loadImage(
                member.avatar,
                fallback = com.sosmartlabs.momo.utils.ui.DefaultIcons.PROFILE_MOMO_SPACE
            )
            
            // Show role badge
            when {
                member.userId == ownerId || member.wearerId == ownerId -> {
                    binding.roleBadge.visibility = View.VISIBLE
                    binding.roleBadge.text = roleText
                }
                member.role == GroupMemberEntity.ROLE_ADMIN -> {
                    binding.roleBadge.visibility = View.VISIBLE
                    binding.roleBadge.text = roleText
                }
                else -> {
                    binding.roleBadge.visibility = View.GONE
                }
            }
            binding.root.contentDescription = member.contentDescription(roleText)
            
            binding.root.setOnClickListener {
                Timber.d("GroupMemberAdapter: Click on member ${member.name}")
                onMemberClick(member)
            }
        }

        private fun GroupMemberEntity.roleText(): String? {
            val context = binding.root.context
            return when {
                userId == ownerId || wearerId == ownerId ->
                    context.getString(R.string.group_member_role_owner)
                role == GroupMemberEntity.ROLE_ADMIN ->
                    context.getString(R.string.group_member_role_admin)
                else -> null
            }
        }

        private fun GroupMemberEntity.contentDescription(roleText: String?): String {
            val context = binding.root.context
            val detailText = detailText()
            return if (roleText.isNullOrBlank()) {
                context.getString(
                    R.string.group_member_row_content_description,
                    name,
                    detailText
                )
            } else {
                context.getString(
                    R.string.group_member_row_role_content_description,
                    name,
                    detailText,
                    roleText
                )
            }
        }

        private fun GroupMemberEntity.detailText(): String {
            val context = binding.root.context
            return if (isWearer) {
                val modelName = wearerModelName
                if (modelName.isNullOrBlank()) {
                    context.getString(R.string.group_member_type_wearer)
                } else {
                    context.getString(R.string.group_member_type_wearer_model, modelName)
                }
            } else {
                context.getString(R.string.group_member_type_parent)
            }
        }
    }

    private class MemberDiffCallback : DiffUtil.ItemCallback<GroupMemberEntity>() {
        override fun areItemsTheSame(
            oldItem: GroupMemberEntity,
            newItem: GroupMemberEntity
        ): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(
            oldItem: GroupMemberEntity,
            newItem: GroupMemberEntity
        ): Boolean {
            return oldItem == newItem
        }
    }
}
