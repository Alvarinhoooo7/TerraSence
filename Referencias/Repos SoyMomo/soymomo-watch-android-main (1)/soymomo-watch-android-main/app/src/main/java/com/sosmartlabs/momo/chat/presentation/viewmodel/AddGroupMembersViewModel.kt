package com.sosmartlabs.momo.chat.presentation.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.repository.ChatGroupRepository
import com.sosmartlabs.momo.chat.data.repository.MemberRepository
import com.sosmartlabs.momo.chat.data.remote.model.ChatGroup
import com.sosmartlabs.momo.chat.presentation.model.MemberAvailabilityState
import com.sosmartlabs.momo.chat.presentation.model.MemberItem
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.WatchUser
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

/**
 * ViewModel for AddGroupMembersFragment
 * Handles loading available members (excluding existing group members) and adding them to the group
 */
@HiltViewModel
class AddGroupMembersViewModel @Inject constructor(
    @ApplicationContext context: Context,
    private val ioContext: CoroutineContext,
    private val memberRepository: MemberRepository,
    private val chatGroupRepository: ChatGroupRepository
) : AndroidViewModel(context as Application) {
    private val appContext: Context = context.applicationContext

    private val _availableMembers = MutableLiveData<List<MemberItem>>()
    val availableMembers: LiveData<List<MemberItem>> = _availableMembers

    private val _availabilityState = MutableLiveData<MemberAvailabilityState>()
    val availabilityState: LiveData<MemberAvailabilityState> = _availabilityState

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _addMembersSuccess = MutableLiveData<Boolean?>()
    val addMembersSuccess: LiveData<Boolean?> = _addMembersSuccess

    private var currentGroup: ChatGroup? = null
    private var existingMemberIds: Set<String> = emptySet()

    /**
     * Loads the group and its existing members
     */
    suspend fun loadGroup(groupId: String): ChatGroup? {
        Timber.d("AddGroupMembersViewModel: loadGroup groupId=$groupId")
        return try {
            val group = chatGroupRepository.getGroupById(groupId)
            if (group != null) {
                currentGroup = group
                // Load existing members to filter them out
                val existingMembers = chatGroupRepository.getGroupMembers(group)
                existingMemberIds = existingMembers.mapNotNull { 
                    it.userId ?: it.wearerId 
                }.toSet()
                Timber.d("AddGroupMembersViewModel: Loaded ${existingMemberIds.size} existing members")
            }
            group
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Timber.e(e, "AddGroupMembersViewModel: Error loading group")
            CrashlyticsLog.recordNonFatalError(e, "AddGroupMembersViewModel: Error loading group")
            _error.postValue(e.message ?: appContext.getString(R.string.error_loading_group))
            null
        }
    }

    /**
     * Loads all available members from the given WatchUsers,
     * excluding members that are already in the group.
     * Only includes wearers that support chat groups (Space4+) and their associated users.
     */
    fun loadAvailableMembers(watchUsers: List<WatchUser>) {
        Timber.d("AddGroupMembersViewModel: loadAvailableMembers called with ${watchUsers.size} watch users")
        
        viewModelScope.launch(ioContext) {
            _isLoading.postValue(true)
            _error.postValue(null)
            
            try {
                // 1. Filter to only include wearers that support chat groups (Space4+)
                val groupChatWatchUsers = memberRepository.filterWatchUsersForGroupChat(watchUsers)
                Timber.d("AddGroupMembersViewModel: Filtered to ${groupChatWatchUsers.size} group-chat-compatible watch users")
                
                // 2. Map filtered wearers to MemberItems
                val wearers = groupChatWatchUsers.mapNotNull { it.watch }
                val wearerMembers = memberRepository.mapWearersToMemberItemsForGroupChat(watchUsers)
                
                // 3. Fetch associated users linked to group-chat-compatible wearers only
                val associatedUsers = memberRepository.fetchAssociatedUsers(wearers)
                
                // 4. Combine and filter duplicates
                val allMembers = (wearerMembers + associatedUsers).distinctBy { it.id }
                
                // 5. Filter out existing group members
                val availableMembers = allMembers.filter { member ->
                    !existingMemberIds.contains(member.id)
                }
                
                Timber.d("AddGroupMembersViewModel: Loaded ${availableMembers.size} available members " +
                        "(${allMembers.size} total - ${existingMemberIds.size} existing)")
                
                _availabilityState.postValue(
                    when {
                        groupChatWatchUsers.isEmpty() -> MemberAvailabilityState.NO_COMPATIBLE_WATCHES
                        availableMembers.isEmpty() -> MemberAvailabilityState.NO_AVAILABLE_MEMBERS
                        else -> MemberAvailabilityState.AVAILABLE
                    }
                )
                _availableMembers.postValue(availableMembers)
            } catch (e: Exception) {
                Timber.e(e, "AddGroupMembersViewModel: Error loading members")
                CrashlyticsLog.recordNonFatalError(e, "AddGroupMembersViewModel: Error loading members")
                _error.postValue(e.message ?: appContext.getString(R.string.error_loading_members))
            } finally {
                _isLoading.postValue(false)
            }
        }
    }

    /**
     * Adds the selected members to the group
     * @param selectedMembers List of member IDs and whether they are wearers
     */
    fun addMembersToGroup(selectedMembers: List<Pair<String, Boolean>>) {
        val group = currentGroup
        if (group == null) {
            _error.value = appContext.getString(R.string.error_group_not_loaded)
            return
        }
        
        Timber.d("AddGroupMembersViewModel: addMembersToGroup with ${selectedMembers.size} members")
        
        viewModelScope.launch(ioContext) {
            _isLoading.postValue(true)
            _error.postValue(null)
            
            try {
                val result = chatGroupRepository.addMembers(group, selectedMembers)
                if (result) {
                    Timber.d("AddGroupMembersViewModel: Successfully added members")
                    _addMembersSuccess.postValue(true)
                } else {
                    Timber.e("AddGroupMembersViewModel: Failed to add members")
                    _error.postValue(appContext.getString(R.string.error_add_members_failed))
                    _addMembersSuccess.postValue(false)
                }
            } catch (e: Exception) {
                Timber.e(e, "AddGroupMembersViewModel: Error adding members")
                CrashlyticsLog.recordNonFatalError(e, "AddGroupMembersViewModel: Error adding members")
                _error.postValue(e.message ?: appContext.getString(R.string.error_add_members_failed))
                _addMembersSuccess.postValue(false)
            } finally {
                _isLoading.postValue(false)
            }
        }
    }

    /**
     * Clears any error messages
     */
    fun clearError() {
        _error.value = null
    }

    /**
     * Clears the add members success state
     */
    fun clearAddMembersSuccess() {
        _addMembersSuccess.value = null
    }
}
