package com.sosmartlabs.momo.chat.presentation.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.presentation.common.ChatTimeFormatter
import com.sosmartlabs.momo.chat.presentation.model.ChatListItem
import com.sosmartlabs.momo.databinding.ItemChatListBinding
import com.sosmartlabs.momo.databinding.ItemGroupListBinding
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber

class ChatListAdapter(
    private val onChatClick: (ChatListItem) -> Unit
) : ListAdapter<ChatListItem, RecyclerView.ViewHolder>(ChatListDiffCallback()) {

    companion object {
        private const val VIEW_TYPE_INDIVIDUAL = 0
        private const val VIEW_TYPE_GROUP = 1
    }

    internal data class ChatListChangePayload(
        val lastMessageChanged: Boolean = false,
        val timestampChanged: Boolean = false,
        val unreadCountChanged: Boolean = false
    ) {
        fun merge(other: ChatListChangePayload) = ChatListChangePayload(
            lastMessageChanged = lastMessageChanged || other.lastMessageChanged,
            timestampChanged = timestampChanged || other.timestampChanged,
            unreadCountChanged = unreadCountChanged || other.unreadCountChanged
        )
    }

    override fun getItemViewType(position: Int): Int {
        return if (getItem(position).isGroup) VIEW_TYPE_GROUP else VIEW_TYPE_INDIVIDUAL
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return when (viewType) {
            VIEW_TYPE_GROUP -> {
                val binding = ItemGroupListBinding.inflate(
                    LayoutInflater.from(parent.context), parent, false
                )
                GroupChatViewHolder(binding, onChatClick)
            }
            else -> {
                val binding = ItemChatListBinding.inflate(
                    LayoutInflater.from(parent.context), parent, false
                )
                IndividualChatViewHolder(binding, onChatClick)
            }
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val chat = getItem(position)
        when (holder) {
            is IndividualChatViewHolder -> holder.bind(chat)
            is GroupChatViewHolder -> holder.bind(chat)
        }
    }

    override fun onBindViewHolder(
        holder: RecyclerView.ViewHolder,
        position: Int,
        payloads: MutableList<Any>
    ) {
        if (payloads.isEmpty()) {
            onBindViewHolder(holder, position)
            return
        }

        val payload = payloads
            .filterIsInstance<ChatListChangePayload>()
            .reduceOrNull { acc, next -> acc.merge(next) }

        if (payload == null) {
            onBindViewHolder(holder, position)
            return
        }

        val chat = getItem(position)
        when (holder) {
            is IndividualChatViewHolder -> holder.bindPartial(chat, payload)
            is GroupChatViewHolder -> holder.bindPartial(chat, payload)
            else -> onBindViewHolder(holder, position)
        }
    }

    class IndividualChatViewHolder(
        private val binding: ItemChatListBinding,
        private val onChatClick: (ChatListItem) -> Unit
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(chat: ChatListItem) {
            Timber.d("ChatListAdapter: Binding individual chat ${chat.name}")
            binding.nameTextView.text = chat.name
            bindLastMessage(chat.lastMessage)
            bindTimestamp(chat.timestamp)
            bindUnreadCount(chat.unreadCount)

            binding.avatarImageView.loadImage(
                chat.profileImageURL,
                fallback = R.drawable.ic_momo
            )

            binding.root.setOnClickListener {
                onChatClick(chat)
            }
        }

        internal fun bindPartial(chat: ChatListItem, payload: ChatListChangePayload) {
            if (payload.lastMessageChanged) bindLastMessage(chat.lastMessage)
            if (payload.timestampChanged) bindTimestamp(chat.timestamp)
            if (payload.unreadCountChanged) bindUnreadCount(chat.unreadCount)
        }

        private fun bindLastMessage(lastMessage: String) {
            binding.lastMessageTextView.text = lastMessage.ifEmpty {
                binding.root.context.getString(R.string.chat_list_no_messages_yet)
            }
        }

        private fun bindTimestamp(timestamp: Long) {
            binding.timestampTextView.text =
                ChatTimeFormatter.formatRelative(binding.root.context, timestamp)
        }

        private fun bindUnreadCount(unreadCount: Int) {
            if (unreadCount > 0) {
                binding.unreadBadge.visibility = View.VISIBLE
                binding.unreadBadge.text = unreadCount.toString()
            } else {
                binding.unreadBadge.visibility = View.GONE
            }
        }
    }

    class GroupChatViewHolder(
        private val binding: ItemGroupListBinding,
        private val onChatClick: (ChatListItem) -> Unit
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(chat: ChatListItem) {
            Timber.d("ChatListAdapter: Binding group chat ${chat.name}")
            binding.groupNameTextView.text = chat.name
            bindLastMessage(chat.lastMessage)
            bindTimestamp(chat.timestamp)
            bindUnreadCount(chat.unreadCount)

            binding.groupAvatarImageView.loadImage(
                chat.profileImageURL,
                fallback = R.drawable.ic_group_avatar
            )

            binding.root.setOnClickListener {
                onChatClick(chat)
            }
        }

        internal fun bindPartial(chat: ChatListItem, payload: ChatListChangePayload) {
            if (payload.lastMessageChanged) bindLastMessage(chat.lastMessage)
            if (payload.timestampChanged) bindTimestamp(chat.timestamp)
            if (payload.unreadCountChanged) bindUnreadCount(chat.unreadCount)
        }

        private fun bindLastMessage(lastMessage: String) {
            binding.groupLastMessageTextView.text = lastMessage.ifEmpty {
                binding.root.context.getString(R.string.chat_list_no_messages_yet)
            }
        }

        private fun bindTimestamp(timestamp: Long) {
            binding.groupTimestampTextView.text =
                ChatTimeFormatter.formatRelative(binding.root.context, timestamp)
        }

        private fun bindUnreadCount(unreadCount: Int) {
            if (unreadCount > 0) {
                binding.groupUnreadBadge.visibility = View.VISIBLE
                binding.groupUnreadBadge.text = unreadCount.toString()
            } else {
                binding.groupUnreadBadge.visibility = View.GONE
            }
        }
    }

    private class ChatListDiffCallback : DiffUtil.ItemCallback<ChatListItem>() {
        override fun areItemsTheSame(oldItem: ChatListItem, newItem: ChatListItem): Boolean {
            return oldItem.chatId == newItem.chatId
        }

        override fun areContentsTheSame(oldItem: ChatListItem, newItem: ChatListItem): Boolean {
            return oldItem == newItem
        }

        override fun getChangePayload(oldItem: ChatListItem, newItem: ChatListItem): Any? {
            val onlySupportedChanges =
                oldItem.name == newItem.name
                        && oldItem.isGroup == newItem.isGroup
                        && oldItem.profileImageURL == newItem.profileImageURL
                        && oldItem.watch == newItem.watch
                        && oldItem.group == newItem.group
                        && oldItem.hasConversation == newItem.hasConversation
                        && oldItem.isRemoved == newItem.isRemoved
                        && oldItem.memberCount == newItem.memberCount

            if (!onlySupportedChanges) {
                return null
            }

            val lastMessageChanged = oldItem.lastMessage != newItem.lastMessage
            val timestampChanged = oldItem.timestamp != newItem.timestamp
            val unreadCountChanged = oldItem.unreadCount != newItem.unreadCount

            if (!lastMessageChanged && !timestampChanged && !unreadCountChanged) {
                return null
            }

            return ChatListChangePayload(
                lastMessageChanged = lastMessageChanged,
                timestampChanged = timestampChanged,
                unreadCountChanged = unreadCountChanged
            )
        }
    }
}
