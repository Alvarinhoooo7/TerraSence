package com.sosmartlabs.momo.chat.presentation.model

data class UnifiedMessageItem(
    val id: String,
    val timestamp: Long,
    val senderId: String,
    val senderName: String,
    val isMine: Boolean,
    val type: String,
    val text: String? = null,
    val audio: String? = null,
    val audioDuration: Long? = null,
    val image: String? = null,
    val video: String? = null,
    val status: String,
    val isSeparator: Boolean = false,
    val isIsolatedAudio: Boolean = false,
    val senderAvatar: String? = null,
    val audioWaveform: String? = null
)
