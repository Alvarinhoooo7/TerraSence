package com.sosmartlabs.momotabletpadres.contacts.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.sosmartlabs.momotabletpadres.contacts.model.ContactDetail
import com.sosmartlabs.momotabletpadres.contacts.repository.AllowedNumbersRepository
import com.sosmartlabs.momotabletpadres.contacts.repository.ContactsPagingSource
import com.sosmartlabs.momotabletpadres.contacts.repository.ContactsRepository
import com.sosmartlabs.momotabletpadres.utils.Resource
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class ContactsViewModel @Inject constructor(
    private val contactsRepository: ContactsRepository,
    private val allowedNumbersRepository: AllowedNumbersRepository
) : ViewModel() {

    private val _updateStatus = MutableLiveData<Resource<ContactDetail, Unit>>()
    val updateStatus: LiveData<Resource<ContactDetail, Unit>> get() = _updateStatus

    private val tabletIdFlow = MutableStateFlow<String?>(null)

    @OptIn(ExperimentalCoroutinesApi::class)
    val contactsPagingData: Flow<PagingData<ContactDetail>> = tabletIdFlow
        .flatMapLatest { tabletId ->
            if (tabletId != null) {
                Timber.d("ContactsViewModel: [contactsPagingData] Step 1: Creating Pager for tabletId=$tabletId")
                Pager(
                    config = PagingConfig(
                        pageSize = 50,
                        prefetchDistance = 10,
                        enablePlaceholders = false,
                        initialLoadSize = 50
                    ),
                    pagingSourceFactory = {
                        Timber.d("ContactsViewModel: [contactsPagingData] Step 2: Creating ContactsPagingSource for tabletId=$tabletId")
                        ContactsPagingSource(
                            contactsRepository = contactsRepository,
                            allowedNumbersRepository = allowedNumbersRepository,
                            tabletId = tabletId
                        )
                    }
                ).flow.cachedIn(viewModelScope)
            } else {
                Timber.d("ContactsViewModel: [contactsPagingData] Step 1: tabletId is null, returning empty PagingData")
                flowOf(PagingData.empty())
            }
        }

    fun setTabletId(tabletId: String) {
        Timber.d("ContactsViewModel: [setTabletId] Step 1: Setting tabletId to $tabletId")
        tabletIdFlow.value = tabletId
        Timber.d("ContactsViewModel: [setTabletId] Step 2: tabletIdFlow updated")
    }

    fun updateAllowedStatus(contact: ContactDetail, tabletId: String, isAllowed: Boolean) {
        Timber.d("ContactsViewModel: [updateAllowedStatus] Step 1: Start updating allowed status for contact=${contact.phone}, isAllowed=$isAllowed, tabletId=$tabletId")
        _updateStatus.value = Resource(status = Resource.Status.UPDATING)
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    Timber.d("ContactsViewModel: [updateAllowedStatus] Step 2: Performing allowed status update in IO context for contact=${contact.phone}")
                    if (isAllowed) {
                        Timber.d("ContactsViewModel: [updateAllowedStatus] Step 3a: Adding ${contact.phone} to allowed numbers for tabletId=$tabletId")
                        allowedNumbersRepository.addAllowedNumber(contact.phone, tabletId)
                    } else {
                        Timber.d("ContactsViewModel: [updateAllowedStatus] Step 3b: Removing ${contact.phone} from allowed numbers for tabletId=$tabletId")
                        allowedNumbersRepository.removeAllowedNumber(contact.phone, tabletId)
                    }
                    val updatedContact = contact.copy(isAllowed = isAllowed)
                    Timber.d("ContactsViewModel: [updateAllowedStatus] Step 4: Allowed status updated for contact=${contact.phone}, isAllowed=$isAllowed")
                    withContext(Dispatchers.Main) {
                        Timber.d("ContactsViewModel: [updateAllowedStatus] Step 5: Posting UPDATING_SUCCESS for contact=${contact.phone}")
                        _updateStatus.value = Resource(
                            status = Resource.Status.UPDATING_SUCCESS,
                            data = updatedContact
                        )
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "ContactsViewModel: [updateAllowedStatus] Error updating allowed status for contact=${contact.phone}, isAllowed=$isAllowed, tabletId=$tabletId: ${e.message}")
                CrashlyticsLog.recordException(e, "ContactsViewModel: Exception in updateAllowedStatus(contact=${contact.phone}, isAllowed=$isAllowed, tabletId=$tabletId)")
                withContext(Dispatchers.Main) {
                    Timber.d("ContactsViewModel: [updateAllowedStatus] Step 6: Posting UPDATING_ERROR for contact=${contact.phone}")
                    _updateStatus.value = Resource(status = Resource.Status.UPDATING_ERROR)
                }
            }
        }
    }
}