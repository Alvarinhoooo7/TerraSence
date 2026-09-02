package com.sosmartlabs.momo.chat.data.local.entity

import androidx.room.ColumnInfo

/**
 * Class for update the audio duration in database
 */
class ChatAudioDurationUpdate(
    @ColumnInfo(name = "id") val id: String,
    @ColumnInfo(name = "audio_duration") val audioDuration: Long?)