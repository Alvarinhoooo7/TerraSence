package com.sosmartlabs.momo.chat.presentation.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.repository.ChatGroupRepository
import com.sosmartlabs.momo.chat.data.repository.MemberRepository
import com.sosmartlabs.momo.chat.data.remote.model.ChatGroup
import com.sosmartlabs.momo.chat.presentation.model.ContactItem
import com.sosmartlabs.momo.chat.presentation.model.MemberItem
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.WatchUser
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class NewChatViewModel @Inject constructor(
    @ApplicationContext context: Context,
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val chatGroupRepository: ChatGroupRepository,
    private val memberRepository: MemberRepository
) : AndroidViewModel(context as Application) {
    private val appContext: Context = context.applicationContext

    private val _availableContacts = MutableLiveData<List<ContactItem>>()
    val availableContacts: LiveData<List<ContactItem>> = _availableContacts

    private val _selectedMembers = MutableLiveData<List<MemberItem>>()
    val selectedMembers: LiveData<List<MemberItem>> = _selectedMembers

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _createdGroup = MutableLiveData<ChatGroup?>()
    val createdGroup: LiveData<ChatGroup?> = _createdGroup

    fun loadAvailableContacts(activeWatchUsers: List<WatchUser>) {
        Timber.d("NewChatViewModel: loadAvailableContacts")
        _isLoading.value = true

        viewModelScope.launch(ioContext) {
            try {
                val contacts = activeWatchUsers.mapNotNull { watchUser ->
                    watchUser.watch?.let { wearer ->
                        ContactItem.Contact(
                            id = wearer.objectId,
                            name = wearer.name(),
                            subtitle = appContext.getString(
                                R.string.chat_contact_subtitle_device,
                                wearer.deviceId.orEmpty()
                            ),
                            avatarUrl = wearer.image?.url,
                            wearer = wearer,
                            isWearer = true
                        )
                    }
                }

                _availableContacts.postValue(contacts)
                _isLoading.postValue(false)
            } catch (e: Exception) {
                Timber.e(e, "NewChatViewModel: Error loading contacts")
                CrashlyticsLog.recordNonFatalError(e, "NewChatViewModel: Error loading contacts")
                _isLoading.postValue(false)
            }
        }
    }

    /**
     * Loads member details for the selected member IDs
     * @param memberIds Array of member IDs
     * @param isWearerFlags Array indicating if each member is a wearer
     */
    fun loadSelectedMembers(memberIds: Array<String>, isWearerFlags: BooleanArray) {
        Timber.d("NewChatViewModel: loadSelectedMembers with ${memberIds.size} members")
        
        viewModelScope.launch(ioContext) {
            _isLoading.postValue(true)
            _error.postValue(null)
            
            try {
                val members = memberRepository.fetchMemberDetails(memberIds, isWearerFlags)
                Timber.d("NewChatViewModel: Loaded ${members.size} member details")
                _selectedMembers.postValue(members)
            } catch (e: Exception) {
                Timber.e(e, "NewChatViewModel: Error loading member details")
                CrashlyticsLog.recordNonFatalError(e, "NewChatViewModel: Error loading member details")
                _error.postValue(e.message ?: appContext.getString(R.string.error_loading_member_details))
            } finally {
                _isLoading.postValue(false)
            }
        }
    }

    fun createGroup(
        name: String,
        description: String?,
        avatarData: ByteArray?,
        owner: ParseUser,
        members: List<Pair<String, Boolean>>
    ) {
        Timber.d("NewChatViewModel: createGroup name=$name")
        _isLoading.value = true
        _error.value = null
        _createdGroup.value = null

        viewModelScope.launch(ioContext) {
            try {
                val group = chatGroupRepository.createGroup(name, description, avatarData, owner, members)
                _createdGroup.postValue(group)
                if (group == null) {
                    _error.postValue(appContext.getString(R.string.error_create_group_failed))
                }
            } catch (e: Exception) {
                Timber.e(e, "NewChatViewModel: Error creating group")
                CrashlyticsLog.recordNonFatalError(e, "NewChatViewModel: Error creating group")
                val reason = e.message ?: appContext.getString(R.string.error_create_group_failed)
                _error.postValue(appContext.getString(R.string.chat_error_with_reason, reason))
            } finally {
                _isLoading.postValue(false)
            }
        }
    }

    /**
     * Clears the created group state after navigation
     */
    fun clearCreatedGroup() {
        _createdGroup.value = null
    }

    /**
     * Clears any error messages
     */
    fun clearError() {
        _error.value = null
    }
}
