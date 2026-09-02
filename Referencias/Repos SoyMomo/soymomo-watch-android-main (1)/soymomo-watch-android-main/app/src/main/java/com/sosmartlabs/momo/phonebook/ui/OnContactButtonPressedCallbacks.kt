package com.sosmartlabs.momo.phonebook.ui

import com.sosmartlabs.momo.phonebook.model.phonecontact.PhoneContact

/**
 * Callbacks for interacting with buttons been pressed on PhoneContact card
 */
interface OnContactButtonPressedCallbacks {
    /**
     * Callback for user pressing edit button in PhoneContact card
     */
    fun onEditButtonPressed(phoneContact: PhoneContact)

    /**
     * Callback for user pressing delete button in PhoneContact card
     */
    fun onDeleteButtonPressed(phoneContact: PhoneContact)

    /**
     * Callback for user pressing SOS switch in PhoneContact card
     */
    fun onSosSwitchPressed(phoneContact: PhoneContact, sos: Boolean)

    /**
     * Callback for user pressing bookmark icon in PhoneContact card
     */
    fun onBookmarkIconPressed(phoneContact: PhoneContact)
}