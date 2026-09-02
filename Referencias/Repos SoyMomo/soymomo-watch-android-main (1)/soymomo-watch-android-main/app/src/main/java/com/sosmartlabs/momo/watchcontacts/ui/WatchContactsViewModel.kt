package com.sosmartlabs.momo.watchcontacts.ui

import android.graphics.Bitmap
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.firebase.FirebaseRemoteConfigRepository
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.watchcontacts.model.Contact
import com.sosmartlabs.momo.watchcontacts.model.WatchContactsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import java.util.*
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class WatchContactsViewModel @Inject constructor(private val externalScope: CoroutineScope,
                                                 private val ioContext: CoroutineContext,
                                                 private val watchUserRepository: WatchUserRepository,
                                                 private val watchContactsRepository: WatchContactsRepository
): ViewModel() {
    private val _watch = MutableLiveData<Wearer>()
    val watch: LiveData<Wearer> get() = _watch

    private val _isWatchConnected = MutableLiveData<Boolean>()
    val isWatchConnected: LiveData<Boolean> get() = _isWatchConnected

    private val _contactList = MutableLiveData<Resource<List<Contact>, Unit>>()
    val contactList: LiveData<Resource<List<Contact>, Unit>> get() = _contactList

    fun getContacts(watchId: String) {
        _contactList.value = Resource(Resource.Status.LOADING)
        lateinit var contacts: List<Contact>
        lateinit var watch: Wearer
        viewModelScope.launch(ioContext) {
           runCatching {
                watch = watchUserRepository.findWatchByDeviceId(watchId)
                contacts = watchContactsRepository.getContacts(watch)
            }.onSuccess {
                calculateBatteryInformation(watch)
                _watch.postValue(watch)
                _contactList.postValue(Resource(Resource.Status.LOAD_SUCCESS, contacts))
            }.onFailure {
               with(Firebase.crashlytics) {
                   log("Error loading watch contacts")
                   recordException(it)
               }
                _contactList.postValue(Resource(Resource.Status.LOAD_ERROR))
            }
        }
    }

    private fun calculateBatteryInformation(watch: Wearer) {
        _isWatchConnected.postValue(!(watch.has("lastTKQ")
                && Calendar.getInstance().timeInMillis - watch.getDate("lastTKQ")!!.time > TimeUnit.MINUTES.toMillis(
            FirebaseRemoteConfigRepository.thresholdMinutesLastTKQ)))
    }

    /**
     * TODO: Use these functions for handle Parse queries
     */
    fun addNewContact(name: String, phone: String, bitmap: Bitmap) {
        val contactList = _contactList.value?.data?.toMutableList() ?: mutableListOf()
        _contactList.value = Resource(Resource.Status.ADDING, contactList)
        lateinit var contact: Contact
        val watch = _watch.value!!
        externalScope.launch(ioContext) {
            runCatching {
                contact = watchContactsRepository.addNewContact(watch, name, phone, bitmap, sos = false, chatEnabled = false)
            }.onSuccess {
                contactList += contact
                contactList.sortBy { contact -> contact.position }
                _contactList.postValue(Resource(Resource.Status.ADDING_SUCCESS))
            }
        }
    }
}