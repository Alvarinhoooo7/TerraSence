package com.sosmartlabs.momo.chat.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "ChatLastViewed", primaryKeys = ["chat_id"])
data class ChatLastViewedEntity(
    @ColumnInfo(name = "chat_id") val chatId: String,
    @ColumnInfo(name = "last_viewed_at") val lastViewedAt: Long,
    @ColumnInfo(name = "is_group") val isGroup: Boolean
)

