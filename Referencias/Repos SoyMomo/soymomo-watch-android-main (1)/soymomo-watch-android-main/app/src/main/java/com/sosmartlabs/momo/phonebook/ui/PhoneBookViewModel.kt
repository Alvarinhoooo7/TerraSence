package com.sosmartlabs.momo.phonebook.ui

import android.net.Uri
import android.telephony.PhoneNumberUtils
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.WatchModel
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.phonebook.model.devicecontact.DeviceContact
import com.sosmartlabs.momo.phonebook.model.devicecontact.DeviceContactRepository
import com.sosmartlabs.momo.phonebook.model.phonecontact.PhoneContact
import com.sosmartlabs.momo.phonebook.model.phonecontact.PhoneContactRepository
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

/**
 * ViewModel for Watch PhoneBook
 * @param externalScope Scope for coroutines that needs survive to this ViewModel scope
 * @param ioContext Context for coroutines that do IO operations
 * @param phoneContactRepository Repository for loading and saving contacts to database
 * @param deviceContactRepository Repository for loading contacts from device phonebook
 * @param watchUserRepository Repository for the watches associated to the current user
 */
@HiltViewModel
class PhoneBookViewModel @Inject constructor(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val phoneContactRepository: PhoneContactRepository,
    private val deviceContactRepository: DeviceContactRepository,
    private val watchUserRepository: WatchUserRepository
    ): ViewModel() {

    /**
     * Error types for operations over a PhoneContact
     */
    enum class PhoneContactError {
        /**
         * Error type for trying to set more than one SOS contact
         */
        SOS_ALREADY_EXIST_ERROR,

        /**
         * Error type for deleting SOS contact when isn't the only contact
         */
        DELETE_SOS_ERROR,

        /**
         * Error type for deleting SOS contact when isn't the only contact
         */
        DATABASE_ERROR,

        /**
         * Error type for creating or updating contact with a phone number already registered
         */
        NUMBER_ALREADY_EXIST_ERROR}

    /**
     * LiveData for getting phone contacts from the main view.
     * Private instance with MutableListData, must be accessed from Activity through
     * [phoneContactList] getter with LiveData type.
     */
    private val _phoneContactsList =  MutableLiveData<Resource<List<PhoneContact>, Unit>>()

    /**
     * LiveData for getting phone contacts from the main view
     */
    val phoneContactList: LiveData<Resource<List<PhoneContact>, Unit>> get() = _phoneContactsList

    /**
     * LiveData for getting operation status updates over an specific PhoneContact
     * Private instance with MutableListData, must be accessed from Activity through
     * [currentPhoneContact] getter with LiveData type.
     */
    private val _currentPhoneContact = MutableLiveData<Resource<PhoneContact, PhoneContactError>>()

    /**
     * LiveData for getting operation status updates over an specific PhoneContact
     */
    val currentPhoneContact: LiveData<Resource<PhoneContact, PhoneContactError>> get() = _currentPhoneContact

    /**
     * LiveData for getting phone contacts from device phonebook.
     * Private instance with MutableListData, must be accessed from Activity through
     * [devicePhoneContact] getter with LiveData type.
     */
    private val _devicePhoneContact = MutableLiveData<Resource<DeviceContact, Unit>>()

    /**
     * LiveData for getting phone contacts from device phonebook.
     */
    val devicePhoneContact: LiveData<Resource<DeviceContact, Unit>> get() = _devicePhoneContact

    /**
     * Watch associated to ViewModel
     */
    lateinit var watch: Wearer

    /**
     * Gets the contacts for the specified watch Id.
     * @param watchId: Watch Id.
     */
    fun fetchContacts(watchId: String) {
        _phoneContactsList.value = Resource(Resource.Status.LOADING)
        viewModelScope.launch(ioContext) {
            runCatching {
                watch = watchUserRepository.findWatchByDeviceId(watchId)
                val contacts = phoneContactRepository.getPhoneContacts(watch)
                _phoneContactsList.postValue(Resource(Resource.Status.LOAD_SUCCESS, contacts))
            }.onFailure {
                handleException(it, _phoneContactsList, Resource.Status.LOAD_ERROR, "Error fetching contacts")
            }
        }
    }

    fun getWatchModel(watchId: String): WatchModel {
        return watchUserRepository.findWatchByDeviceId(watchId).model
    }

    /**
     * Fetch a phone contact from device phonebook
     * @param deviceContactUri URI for the device contact to fetch.
     */
    fun fetchDeviceContact(deviceContactUri: Uri) {
        _devicePhoneContact.value = Resource(Resource.Status.LOADING)
        viewModelScope.launch(ioContext) {
            runCatching {
                val deviceContact = deviceContactRepository.getContact(deviceContactUri)
                _devicePhoneContact.postValue(Resource(Resource.Status.LOAD_SUCCESS, deviceContact))
            }.onFailure {
                Timber.d(it)
                handleException(it, _devicePhoneContact, Resource.Status.LOAD_ERROR, "Error fetching contact from device")
            }
        }
    }

    /**
     * Adds a new contact to Watch contact list
     * @param name New contact name
     * @param phone  New contact phone
     * @param image New contact image, if any
     */
    fun addNewContact(name: String, phone: String, image: String?) {
        _currentPhoneContact.value = Resource(Resource.Status.ADDING, null)
        externalScope.launch(ioContext) {
            runCatching {
                val contactList = phoneContactList.value!!.data!!.toMutableList()

                // If phone number already exists, launch error and return
                if (contactList.find { contact -> PhoneNumberUtils.compare(contact.phone, phone) } != null) {
                    _currentPhoneContact.postValue(Resource(Resource.Status.ADDING_ERROR, null, PhoneContactError.NUMBER_ALREADY_EXIST_ERROR))
                    return@runCatching
                }

                // If the contact list is empty, the new contact will be SOS contact
                val newContact = phoneContactRepository.addPhoneContact(
                    watch, name, phone, contactList.size, image, contactList.isEmpty())
                
                contactList += newContact
                _currentPhoneContact.postValue(Resource(Resource.Status.ADDING_SUCCESS, newContact))
                _phoneContactsList.postValue(Resource(Resource.Status.ADDING_SUCCESS, contactList))
            }.onFailure {
                handleException(it, _currentPhoneContact, Resource.Status.ADDING_ERROR, "Error adding contact")
            }
        }
    }

    /**
     * Updates an existing PhoneContact
     * @param contact PhoneContact to update
     * @param name Contact name
     * @param phone Contact phone number
     * @param image Image path to new image, if any.
     */
    fun updatePhoneContact(contact: PhoneContact, name: String, phone: String, image: String? = null) {
        // If contact hasn't name, phone or image changes, return
        if (contact.name == name && contact.phone == phone && image == null) return

        val contactList = phoneContactList.value!!.data!!.toMutableList()

        // If phone number already exists for another contact, launch error and return
        if (contactList.find { c -> c.objectId != contact.objectId && PhoneNumberUtils.compare(c.phone, phone) } != null) {
            _currentPhoneContact.postValue(Resource(Resource.Status.UPDATING_ERROR, contact, PhoneContactError.NUMBER_ALREADY_EXIST_ERROR))
            return
        }

        _currentPhoneContact.value = Resource(Resource.Status.UPDATING, contact)
        externalScope.launch(ioContext) {
            runCatching {

                phoneContactRepository.updatePhoneContact(contact, name, phone, image)
                _currentPhoneContact.postValue(Resource(Resource.Status.UPDATING_SUCCESS, contact))
            }.onFailure {
                handleException(it, _currentPhoneContact, Resource.Status.UPDATING_ERROR, "Error updating contact", contact,
                    PhoneContactError.DATABASE_ERROR)
            }
        }
    }

    /**
     * Updates the SOS field for a PhoneContact
     * @param contact PhoneContact to update
     * @param sos new SOS value
     */
    fun updateSosPhoneContact(contact: PhoneContact, sos: Boolean) {
        // If contact's SOS value hasn't changed, return
        if (contact.sos == sos) return

        val list = _phoneContactsList.value?.data!!

        if (sos && list.any { phoneContact ->
                phoneContact != contact && phoneContact.sos
            }) {
            _currentPhoneContact.value = Resource(Resource.Status.UPDATING_ERROR, contact, PhoneContactError.SOS_ALREADY_EXIST_ERROR)
            return
        }

        _currentPhoneContact.value = Resource(Resource.Status.UPDATING, contact)
        externalScope.launch(ioContext) {
            runCatching {
                phoneContactRepository.updateSosPhoneContact(contact, sos)
                _currentPhoneContact.postValue(Resource(Resource.Status.UPDATING_SUCCESS, contact))
            }.onFailure {
                handleException(it, _currentPhoneContact, Resource.Status.UPDATING_ERROR, "Error updating SOS contact", contact,
                    PhoneContactError.DATABASE_ERROR)
            }
        }
    }

    fun updateBookmarkPhoneContact(contact: PhoneContact) {
        val currentState = contact.isFamily ?: false
        _currentPhoneContact.value = Resource(Resource.Status.UPDATING, contact)
        externalScope.launch(ioContext) {
            runCatching {
                phoneContactRepository.updateBookmarkPhoneContact(contact, !currentState)
            }.onFailure {
                handleException(it, _currentPhoneContact, Resource.Status.UPDATING_ERROR, "Error updating SOS contact", contact,
                    PhoneContactError.DATABASE_ERROR)
            }.onSuccess {
                _currentPhoneContact.postValue(Resource(Resource.Status.UPDATING_SUCCESS, contact))
            }
        }

    }

    /**
     * Removes an existing PhoneContact
     * @param contact Contact to remove
     */
    fun removePhoneContact(contact: PhoneContact) {
        val list = _phoneContactsList.value!!.data

        // Can't delete a contact if is SOS and isn't the only contact
        if (contact.sos && list!!.size > 1) {
            _currentPhoneContact.value = Resource(Resource.Status.DELETING_ERROR, contact,
                PhoneContactError.DELETE_SOS_ERROR)
            return
        }

        _currentPhoneContact.value = Resource(Resource.Status.DELETING, contact)
        externalScope.launch(ioContext) {
            runCatching {
                val contactList = _phoneContactsList.value!!.data!!.toMutableList()
                phoneContactRepository.deletePhoneContact(contact)
                contactList -= contact
                updateContactIndexes(contactList)
                _currentPhoneContact.postValue(Resource(Resource.Status.DELETING_SUCCESS, contact))
                _phoneContactsList.postValue(Resource(Resource.Status.DELETING_SUCCESS, contactList))
            }.onFailure {
                handleException(it, _currentPhoneContact, Resource.Status.DELETING_ERROR, "Error removing contact", contact,
                    PhoneContactError.DATABASE_ERROR)
            }
        }
    }

    /**
     * Moves an element on the Watch PhoneContact List
     * @param oldPosition Current position of the element
     * @param newPosition New position for the element
     */
    fun movePhoneContactInList(oldPosition: Int, newPosition: Int) {
        val list = _phoneContactsList.value!!.data!!.toMutableList()
        val item = list[oldPosition]
        list.removeAt(oldPosition)
        list.add(newPosition, item)
        _phoneContactsList.value = Resource(Resource.Status.LOAD_SUCCESS, list)
    }

    /**
     * Updates the contact indexes according with the current order in list
     */
    fun updateContactIndexes() {
        val list = _phoneContactsList.value!!.data!!
        externalScope.launch(ioContext) {
            runCatching {
                updateContactIndexes(list)
                _phoneContactsList.postValue(Resource(Resource.Status.LOAD_SUCCESS, list))
            }.onFailure {
                handleException(it, _phoneContactsList, Resource.Status.UPDATING_ERROR, "Error updating contact indexes",
                    // A failed save reverts local changes, so contacts without a stored
                    // position can reappear as null here; sort them last.
                    list.sortedBy { contact -> contact.position ?: Int.MAX_VALUE })
            }
        }
    }

    /**
     * Updates the contacts positions after a delete or a user sort
     * @param contactList List of contacts to update
     */
    private fun updateContactIndexes(contactList: List<PhoneContact>) {
        val contactsToUpdate = mutableListOf<PhoneContact>()
        for (i in contactList.indices) {
            if (contactList[i].position != i){
                contactList[i].position = i
                contactsToUpdate += contactList[i]
            }
        }
        phoneContactRepository.updateContactList(contactsToUpdate)
    }

    /**
     * Handles the exceptions than can occur in the repositories
     * @param exception Exception to handle
     * @param liveData LiveData for handling the exception
     * @param defaultStatus Status for handling connection exception
     * @param errorLog
     * @param resourceData Data for dispatch with the exception, if any
     */
    private fun <T, U> handleException(exception: Throwable, liveData: MutableLiveData<Resource<T, U>>,
                                       defaultStatus: Resource.Status, errorLog: String,
                                       resourceData: T? = null, errorType: U? = null) {
        Timber.d(exception)

        with(Firebase.crashlytics) {
            log(errorLog)
            recordException(exception)
        }

        if (exception is PhoneContactRepository.ConnectionException) {
            liveData.postValue(Resource(defaultStatus, resourceData, errorType))
        }

        else liveData.postValue(Resource(Resource.Status.UNKNOWN_ERROR, resourceData))
    }
}