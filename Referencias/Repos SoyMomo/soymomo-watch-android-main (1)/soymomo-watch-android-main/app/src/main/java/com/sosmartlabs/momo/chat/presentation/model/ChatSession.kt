package com.sosmartlabs.momo.chat.presentation.model

import com.sosmartlabs.momo.models.Wearer

sealed class ChatSession {
    data class Individual(val wearer: Wearer) : ChatSession()
    data class Group(val groupId: String, val groupName: String?) : ChatSession()
}
