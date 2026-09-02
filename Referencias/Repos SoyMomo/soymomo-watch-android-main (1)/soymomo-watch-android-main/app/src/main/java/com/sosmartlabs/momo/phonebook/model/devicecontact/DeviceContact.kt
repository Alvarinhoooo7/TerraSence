package com.sosmartlabs.momo.phonebook.model.devicecontact

/**
 * Represents a contact obtained from device phonebook
 * @param name Contact's name
 * @param imageUri Contact's image URI
 * @param phoneNumber Contact's phone number
 */
data class DeviceContact(val name: String, val imageUri: String?, val phoneNumber: String)