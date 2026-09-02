package com.sosmartlabs.momotabletpadres.contacts.ui

import com.sosmartlabs.momotabletpadres.contacts.model.ContactDetail

interface ContactToggleListener {
    fun onContactAllowedStatusChanged(contact: ContactDetail, isAllowed: Boolean)
}