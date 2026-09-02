package com.sosmartlabs.momo.chat.presentation.model

import com.sosmartlabs.momo.chat.data.remote.model.ChatGroup
import com.sosmartlabs.momo.models.Wearer
import java.io.Serializable

data class ChatListItem(
    val chatId: String,
    val name: String,
    val lastMessage: String,
    val timestamp: Long,
    val unreadCount: Int,
    val isGroup: Boolean,
    val profileImageURL: String?,
    val watch: Wearer?,
    val group: ChatGroup?,
    val hasConversation: Boolean,
    val isRemoved: Boolean = false,
    val memberCount: Int = 0
) : Serializable
