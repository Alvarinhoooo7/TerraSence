package com.sosmartlabs.momotabletpadres.contacts.model

data class ContactDetail(
    val phoneContactObjectId: String,
    val phone: String,
    val fullName: String,
    var isAllowed: Boolean
)
