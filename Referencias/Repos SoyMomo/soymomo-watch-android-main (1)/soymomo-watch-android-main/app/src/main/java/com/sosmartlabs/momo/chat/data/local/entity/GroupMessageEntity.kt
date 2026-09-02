package com.sosmartlabs.momo.chat.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.io.Serializable

@Entity(
    tableName = "GroupMessageEntity",
    indices = [
        Index(value = ["ulid"], unique = true),
        Index(value = ["remote_id"])
    ]
)
data class GroupMessageEntity(
    @PrimaryKey @ColumnInfo(name = "id") val id: String,
    @ColumnInfo(name = "remote_id") val remoteId: String?,
    @ColumnInfo(name = "group_id") val groupId: String,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "sender") val sender: String,
    @ColumnInfo(name = "sender_id") val senderId: String,
    @ColumnInfo(name = "sender_name") val senderName: String,
    @ColumnInfo(name = "sender_avatar") val senderAvatar: String?,
    @ColumnInfo(name = "type") val type: String,
    @ColumnInfo(name = "text") val text: String?,
    @ColumnInfo(name = "audio") val audio: String?,
    @ColumnInfo(name = "audio_duration") val audioDuration: Long?,
    @ColumnInfo(name = "image") val image: String?,
    @ColumnInfo(name = "video") val video: String?,
    @ColumnInfo(name = "status") val status: String,
    @ColumnInfo(name = "ulid") val ulid: String?,
    @ColumnInfo(name = "audio_waveform") val audioWaveform: String? = null,
): Serializable {
    companion object {
        // Sender types
        const val SENDER_USER = "user"
        const val SENDER_WEARER = "wearer"

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

        fun buildId(ulid: String?, remoteId: String?, fallbackId: String? = null): String {
            return ulid?.takeIf { it.isNotBlank() }
                ?: remoteId?.takeIf { it.isNotBlank() }
                ?: fallbackId?.takeIf { it.isNotBlank() }
                ?: throw IllegalArgumentException("GroupMessageEntity requires ulid, remoteId, or fallbackId")
        }

        fun isTerminalStatus(status: String?): Boolean {
            return status == STATUS_SENT || status == STATUS_RECEIVED
        }
    }
}
