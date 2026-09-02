package com.sosmartlabs.momo.chat.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Ignore
import androidx.room.PrimaryKey
import java.io.Serializable

@Entity(tableName = "ChatEntity")
class ChatEntity(
    @PrimaryKey @ColumnInfo(name = "id") val id: String,
    @ColumnInfo(name = "chat_id") val chatId: String,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "sender") val sender: String,
    @ColumnInfo(name = "receiver") val receiver: String,
    @ColumnInfo(name = "status") val status: String,
    @ColumnInfo(name = "type") val type: String,
    @ColumnInfo(name = "audio") val audio: String?,
    @ColumnInfo(name = "audio_duration") val audioDuration: Long?,
    @ColumnInfo(name = "image") val image: String?,
    @ColumnInfo(name = "text") val text: String?,
    @ColumnInfo(name = "video") val video: String?,
    @ColumnInfo(name = "is_isolated_audio") val isIsolatedAudio: Boolean?,
    @ColumnInfo(name = "audio_waveform") val audioWaveform: String? = null,
): Serializable {
    @Ignore
    var groupSenderName: String? = null

    @Ignore
    var groupSenderImage: String? = null

    companion object {
        // Sender types
        const val SENDER_APP = "app"
        const val SENDER_WATCH = "watch"

        // Message status
        const val STATUS_SENDING = "sending"
        const val STATUS_SENT = "sent" 
        const val STATUS_RECEIVED = "received"
        const val STATUS_ERROR = "error"

        // Message types
        const val TYPE_AUDIO = "audio"
        const val TYPE_IMAGE = "image"
        const val TYPE_SEPARATOR = "separator"
        const val TYPE_TEXT = "text"
        const val TYPE_VIDEO = "video"
    }
}
