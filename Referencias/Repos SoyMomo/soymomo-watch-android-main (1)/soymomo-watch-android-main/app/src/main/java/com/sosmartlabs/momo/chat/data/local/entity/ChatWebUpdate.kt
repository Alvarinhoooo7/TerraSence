package com.sosmartlabs.momo.chat.data.local.entity

import androidx.room.ColumnInfo

/**
 * Class for partial update for database.
 * Intended for updating from Parse (without calculated audio duration)
 */
class ChatWebUpdate(
    @ColumnInfo(name = "id") val id: String,
    @ColumnInfo(name = "chat_id") val chatId: String,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "sender") val sender: String,
    @ColumnInfo(name = "receiver") val receiver: String,
    @ColumnInfo(name = "type") val type: String,
    @ColumnInfo(name = "status") val status: String,
    @ColumnInfo(name = "text") val text: String?,
    @ColumnInfo(name = "image") val image: String?,
    @ColumnInfo(name = "audio") val audio: String?,
    @ColumnInfo(name = "video") val video: String?,
    @ColumnInfo(name = "is_isolated_audio") val isIsolatedAudio: Boolean?)