package com.sosmartlabs.momo.chat.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import java.io.Serializable

@Entity(tableName = "GroupEntity")
class GroupEntity(
    @PrimaryKey @ColumnInfo(name = "id") val id: String,
    @ColumnInfo(name = "name") val name: String,
    @ColumnInfo(name = "avatar") val avatar: String?,
    @ColumnInfo(name = "description") val description: String?,
    @ColumnInfo(name = "owner_id") val ownerId: String,
    @ColumnInfo(name = "last_message_text") val lastMessageText: String?,
    @ColumnInfo(name = "last_message_type") val lastMessageType: String?,
    @ColumnInfo(name = "last_message_sender_id") val lastMessageSenderId: String?,
    @ColumnInfo(name = "last_message_sender_name") val lastMessageSenderName: String?,
    @ColumnInfo(name = "last_message_time") val lastMessageTime: Long,
    @ColumnInfo(name = "unread_count") val unreadCount: Int,
    @ColumnInfo(name = "member_count") val memberCount: Int,
): Serializable
