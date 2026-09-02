package com.sosmartlabs.momo.chat.presentation.model

import java.io.Serializable

data class MemberItem(
    val id: String,
    val name: String,
    val avatarUrl: String?,
    val isWearer: Boolean,
    val wearerModelName: String? = null,
    val isSelected: Boolean = false
) : Serializable
