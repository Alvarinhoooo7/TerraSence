package com.sosmartlabs.momo.chat.presentation.viewmodel

import android.content.Context
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.repository.MemberRepository
import com.sosmartlabs.momo.chat.presentation.model.MemberAvailabilityState
import com.sosmartlabs.momo.chat.presentation.model.MemberItem
import com.sosmartlabs.momo.models.WatchUser
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * ViewModel for AddMembersFragment
 * Handles loading and managing members (wearers and associated users) for group creation
 */
@HiltViewModel
class AddMembersViewModel @Inject constructor(
    @ApplicationContext context: Context,
    private val memberRepository: MemberRepository
) : ViewModel() {
    private val appContext = context.applicationContext

    private val _members = MutableLiveData<List<MemberItem>>()
    val members: LiveData<List<MemberItem>> = _members

    private val _availabilityState = MutableLiveData<MemberAvailabilityState>()
    val availabilityState: LiveData<MemberAvailabilityState> = _availabilityState

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    /**
     * Loads all available members from the given WatchUsers for group chat creation.
     * Only includes wearers that support chat groups (Space4+) and their associated users.
     * 
     * @param watchUsers List of WatchUser objects from the current user
     */
    fun loadMembers(watchUsers: List<WatchUser>) {
        Timber.d("AddMembersViewModel: loadMembers called with ${watchUsers.size} watch users")
        
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                // 1. Filter to only include wearers that support chat groups (Space4+)
                val groupChatWatchUsers = memberRepository.filterWatchUsersForGroupChat(watchUsers)
                Timber.d("AddMembersViewModel: Filtered to ${groupChatWatchUsers.size} group-chat-compatible watch users")
                
                // 2. Map filtered wearers to MemberItems
                val wearers = groupChatWatchUsers.mapNotNull { it.watch }
                val wearerMembers = memberRepository.mapWearersToMemberItemsForGroupChat(watchUsers)
                
                // 3. Fetch associated users linked to group-chat-compatible wearers only
                val associatedUsers = memberRepository.fetchAssociatedUsers(wearers)
                
                // 4. Combine and filter duplicates
                val combinedMembers = (wearerMembers + associatedUsers).distinctBy { it.id }
                
                Timber.d("AddMembersViewModel: Loaded ${combinedMembers.size} total members " +
                        "(${wearerMembers.size} wearers + ${associatedUsers.size} users)")
                
                _availabilityState.value = when {
                    groupChatWatchUsers.isEmpty() -> MemberAvailabilityState.NO_COMPATIBLE_WATCHES
                    combinedMembers.isEmpty() -> MemberAvailabilityState.NO_AVAILABLE_MEMBERS
                    else -> MemberAvailabilityState.AVAILABLE
                }
                _members.value = combinedMembers
            } catch (e: Exception) {
                Timber.e(e, "AddMembersViewModel: Error loading members")
                _error.value = e.message ?: appContext.getString(R.string.error_loading_members)
                
                // Fallback: show only group-chat-compatible wearers if fetch fails
                val wearerMembers = memberRepository.mapWearersToMemberItemsForGroupChat(watchUsers)
                _availabilityState.value = if (wearerMembers.isEmpty()) {
                    MemberAvailabilityState.NO_COMPATIBLE_WATCHES
                } else {
                    MemberAvailabilityState.AVAILABLE
                }
                _members.value = wearerMembers
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Clears any error messages
     */
    fun clearError() {
        _error.value = null
    }
}
