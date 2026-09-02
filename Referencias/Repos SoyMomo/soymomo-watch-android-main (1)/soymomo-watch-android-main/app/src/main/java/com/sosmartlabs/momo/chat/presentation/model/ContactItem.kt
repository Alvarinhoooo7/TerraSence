package com.sosmartlabs.momo.chat.presentation.model

import com.sosmartlabs.momo.models.Wearer
import java.io.Serializable

sealed class ContactItem : Serializable {
    data class Header(val text: String, val enabled: Boolean = true) : ContactItem()
    data class Contact(
        val id: String,
        val name: String,
        val subtitle: String,
        val avatarUrl: String?,
        val wearer: Wearer?,
        val isWearer: Boolean
    ) : ContactItem()
}

