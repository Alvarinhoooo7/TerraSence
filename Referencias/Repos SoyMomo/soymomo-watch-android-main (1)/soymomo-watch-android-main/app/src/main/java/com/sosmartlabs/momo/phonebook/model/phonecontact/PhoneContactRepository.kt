package com.sosmartlabs.momo.phonebook.model.phonecontact

import com.parse.ParseException
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ParseQuery
import com.parse.ktx.whereEqualTo
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import java.io.File
import javax.inject.Inject

/**
 * Repository fo handling PhoneContact Parse database interaction
 */
class PhoneContactRepository @Inject constructor() {
    /**
     * Obtains from Parse the contacts associated to the watch with the given watch.
     * Must be called from a background thread/coroutine.
     * @param watch Watch for which we are looking contacts.
     * @return List with phone contacts associated with the given watch.
     */
    fun getPhoneContacts(watch: Wearer) : List<PhoneContact> {
        lateinit var contacts: List<PhoneContact>

        runCatching {
            contacts = ParseQuery.getQuery(PhoneContact::class.java)
                .whereEqualTo(PhoneContact::watch, watch)
                .find()
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it,"Error on getPhoneContacts list by wearer")
            checkAndThrowConnectionExceptionOrException(it)
        }

        return contacts
    }

    /**
     * Saves an instance of PhoneContact in Parse
     * @param phoneContact Contact to save in database
     * @param name Name of contact
     * @param phoneNumber Phone number of contact
     * @param imagePath Path of the new image, if any
     */
    private fun savePhoneContact(phoneContact: PhoneContact, name: String, phoneNumber: String,
                                 imagePath: String? = null): PhoneContact {
        val imageFile = if(imagePath != null) ParseFile(File(imagePath)) else null
        phoneContact.apply {
            this.name = name
            phone = phoneNumber
            image = imageFile ?: image
        }

        runCatching {
            imageFile?.save()
            phoneContact.save()
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it, "Error savePhoneContact")
            phoneContact.revert()
            checkAndThrowConnectionExceptionOrException(it)
        }

        return phoneContact
    }

    /**
     * Adds a new PhoneContact to the given watch.
     * Must be called from a background thread/coroutine.
     * @param watch Watch to add the new contact.
     * @param name Name of the new contact.
     * @param phone Phone number of the new contact.
     * @param position Position in contact list of the new contact.
     * @param imagePath Image path for the new contact (optional).
     * @param sos If new contact is SOS contact or not. False by default.
     * @return New created phone contact.
     */
    fun addPhoneContact(watch: Wearer, name: String, phone: String, position: Int,
                        imagePath: String?, sos: Boolean = false) : PhoneContact {
        val phoneContact = PhoneContact().apply {
            this.watch = watch
            this.position = position
            this.sos = sos
            this.isFamily = false
        }

        return savePhoneContact(phoneContact, name, phone, imagePath)
    }

    /**
     * Updates an instance of PhoneContact
     * @param phoneContact Contact to save in database
     * @param name Name of contact
     * @param phone Phone number of contact
     * @param imagePath Path of the new image, if any
     */
    fun updatePhoneContact(phoneContact: PhoneContact, name: String, phone: String,
                           imagePath: String? = null) : PhoneContact {
        return savePhoneContact(phoneContact, name, phone, imagePath)
    }

    /**
     * Updates the SOS field for a PhoneContact
     * @param phoneContact PhoneContact to update
     * @param sos new SOS value
     */
    fun updateSosPhoneContact(phoneContact: PhoneContact, sos: Boolean) {
        runCatching {
            phoneContact.sos = sos
            phoneContact.save()
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it, "Error updateSosPhoneContact")
            phoneContact.revert()
            checkAndThrowConnectionExceptionOrException(it)
        }
    }

    fun updateBookmarkPhoneContact(phoneContact: PhoneContact, newState: Boolean) {
        runCatching {
            phoneContact.isFamily = newState
            phoneContact.save()
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it, "Error updateSosPhoneContact")
            phoneContact.revert()
            checkAndThrowConnectionExceptionOrException(it)
        }
    }

    /**
     * Removes a PhoneContact from a watch
     * @param phoneContact Contact to remove
     */
    fun deletePhoneContact(phoneContact: PhoneContact) {
        runCatching {
            phoneContact.delete()
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it, "Error deletePhoneContact")
            checkAndThrowConnectionExceptionOrException(it)
        }
    }

    /**
     * Updates a list on PhoneContact in a single operation
     * @param contactList List of contacts to update
     */
    fun updateContactList(contactList: List<PhoneContact>) {
        runCatching {
            ParseObject.saveAll(contactList)
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it, "Error updateContactList")
            contactList.forEach { contact -> contact.revert()}
            checkAndThrowConnectionExceptionOrException(it)
        }
    }

    /**
     * Checks if a throwable is a Parse connection exception. If so, it throws a
     * [ConnectionException]. If not, throws the exception it receives.
     * @param exception Throwable to check
     */
    private fun checkAndThrowConnectionExceptionOrException(exception: Throwable): Nothing {
        if (exception is ParseException) {
            if (exception.code in
                arrayListOf(ParseException.CONNECTION_FAILED, ParseException.INVALID_JSON)) {
                throw ConnectionException(exception.localizedMessage)
            }
        }

        throw exception
    }

    /**
     * Exception class for Parse connection errors
     * @param message Message for exception
     */
    class ConnectionException(message: String?) : Exception(message ?: "Parse connection error")
}