package com.sosmartlabs.momo.chat.data.local.entity

import androidx.room.ColumnInfo

/**
 * Partial entity for updating audio waveform data in the database.
 */
class ChatAudioWaveformUpdate(
    @ColumnInfo(name = "id") val id: String,
    @ColumnInfo(name = "audio_waveform") val audioWaveform: String?
)
