package com.sosmartlabs.momo.chat.presentation.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.parse.ParseException
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.repository.ChatGroupError
import com.sosmartlabs.momo.chat.data.repository.ChatGroupRepository
import com.sosmartlabs.momo.chat.data.repository.DeleteGroupResult
import com.sosmartlabs.momo.chat.data.repository.LeaveGroupResult
import com.sosmartlabs.momo.chat.data.local.entity.GroupMemberEntity
import com.sosmartlabs.momo.chat.data.remote.model.ChatGroup
import com.sosmartlabs.momo.chat.data.remote.model.GroupMember
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class GroupMembersViewModel @Inject constructor(
    @ApplicationContext context: Context,
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val chatGroupRepository: ChatGroupRepository
) : AndroidViewModel(context as Application) {
    private val appContext: Context = context.applicationContext

    private val _members = MutableLiveData<List<GroupMemberEntity>>()
    val members: LiveData<List<GroupMemberEntity>> = _members
    
    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _errorMessage = MutableLiveData<String?>()
    val errorMessage: LiveData<String?> = _errorMessage

    /**
     * One-shot UI events (leave / delete success, etc.). A [Channel] instead
     * of [LiveData] so rotation doesn't replay "You left the group" toasts
     * and navigation commands.
     */
    private val _uiEvents = Channel<UiEvent>(capacity = Channel.BUFFERED)
    val uiEvents: Flow<UiEvent> = _uiEvents.receiveAsFlow()

    sealed interface UiEvent {
        /** Success signal from [leaveGroup]; fragment should pop back + toast. */
        data class LeftGroup(val groupId: String, val ownerTransferred: Boolean) : UiEvent

        /** Success signal from [deleteGroup]; fragment should pop back + toast. */
        data class DeletedGroup(val groupId: String) : UiEvent
    }

    fun loadMembers(group: ChatGroup): LiveData<List<GroupMemberEntity>> {
        Timber.d("GroupMembersViewModel: loadMembers for group=${group.objectId}")
        _isLoading.value = true

        viewModelScope.launch(ioContext) {
            try {
                val membersList = chatGroupRepository.getGroupMembers(group)
                _members.postValue(membersList)
                _isLoading.postValue(false)
            } catch (e: Exception) {
                Timber.e(e, "GroupMembersViewModel: Error loading members")
                CrashlyticsLog.recordNonFatalError(e, "GroupMembersViewModel: Error loading members")
                _errorMessage.postValue(e.message ?: appContext.getString(R.string.error_loading_members))
                _isLoading.postValue(false)
            }
        }

        return _members
    }

    fun addMembers(group: ChatGroup, members: List<Pair<String, Boolean>>) {
        Timber.d("GroupMembersViewModel: addMembers to group=${group.objectId}")
        viewModelScope.launch(ioContext) {
            try {
                val result = chatGroupRepository.addMembers(group, members)
                if (!result) {
                    _errorMessage.postValue(appContext.getString(R.string.error_add_members_failed))
                }
            } catch (e: Exception) {
                Timber.e(e, "GroupMembersViewModel: Error adding members")
                CrashlyticsLog.recordNonFatalError(e, "GroupMembersViewModel: Error adding members")
                _errorMessage.postValue(e.message ?: appContext.getString(R.string.error_add_members_failed))
            }
        }
    }

    fun removeMember(member: GroupMember) {
        Timber.d("GroupMembersViewModel: removeMember ${member.objectId}")
        viewModelScope.launch(ioContext) {
            try {
                chatGroupRepository.removeMember(member)
            } catch (e: ParseException) {
                Timber.w(e, "GroupMembersViewModel: removeMember rejected parseCode=${e.code}")
                val stringRes = ChatGroupError.stringResForCode(e.code)
                    ?: R.string.error_group_generic
                _errorMessage.postValue(appContext.getString(stringRes))
            } catch (e: Exception) {
                Timber.e(e, "GroupMembersViewModel: Error removing member")
                CrashlyticsLog.recordNonFatalError(e, "GroupMembersViewModel: Error removing member")
                _errorMessage.postValue(appContext.getString(R.string.error_group_generic))
            }
        }
    }

    fun toggleAdmin(member: GroupMember, makeAdmin: Boolean) {
        Timber.d("GroupMembersViewModel: toggleAdmin ${member.objectId}, makeAdmin=$makeAdmin")
        viewModelScope.launch(ioContext) {
            try {
                val result = if (makeAdmin) {
                    chatGroupRepository.makeAdmin(member)
                } else {
                    chatGroupRepository.removeAdmin(member)
                }
                
                if (!result) {
                    _errorMessage.postValue(appContext.getString(R.string.error_update_admin_role_failed))
                }
            } catch (e: Exception) {
                Timber.e(e, "GroupMembersViewModel: Error toggling admin")
                CrashlyticsLog.recordNonFatalError(e, "GroupMembersViewModel: Error toggling admin")
                _errorMessage.postValue(e.message ?: appContext.getString(R.string.error_update_admin_role_failed))
            }
        }
    }

    suspend fun fetchGroup(groupId: String): ChatGroup? {
        Timber.d("GroupMembersViewModel: fetchGroup groupId=$groupId")
        return try {
            chatGroupRepository.getGroupByIdOrCachedPointer(groupId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Timber.e(e, "GroupMembersViewModel: Error fetching group")
            CrashlyticsLog.recordNonFatalError(e, "GroupMembersViewModel: Error fetching group")
            null
        }
    }

    suspend fun updateGroup(
        group: ChatGroup,
        name: String?,
        description: String?,
        avatarData: ByteArray?
    ): Boolean {
        Timber.d("GroupMembersViewModel: updateGroup groupId=${group.objectId}")
        return try {
            chatGroupRepository.updateGroup(group, name, description, avatarData)
        } catch (e: Exception) {
            Timber.e(e, "GroupMembersViewModel: Error updating group")
            CrashlyticsLog.recordNonFatalError(e, "GroupMembersViewModel: Error updating group")
            _errorMessage.postValue(e.message ?: appContext.getString(R.string.error_group_update_failed))
            false
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun leaveGroup(groupId: String) {
        Timber.d("GroupMembersViewModel: leaveGroup groupId=$groupId")
        viewModelScope.launch(ioContext) {
            when (val result = chatGroupRepository.leaveGroup(groupId)) {
                is LeaveGroupResult.Success -> {
                    _uiEvents.send(UiEvent.LeftGroup(groupId, result.ownerTransferred))
                }
                is LeaveGroupResult.Failure -> {
                    val stringRes = ChatGroupError.stringResForCode(result.parseCode)
                        ?: R.string.error_group_generic
                    _errorMessage.postValue(appContext.getString(stringRes))
                }
            }
        }
    }

    fun deleteGroup(groupId: String) {
        Timber.d("GroupMembersViewModel: deleteGroup groupId=$groupId")
        viewModelScope.launch(ioContext) {
            when (val result = chatGroupRepository.deleteGroup(groupId)) {
                is DeleteGroupResult.Success -> {
                    _uiEvents.send(UiEvent.DeletedGroup(groupId))
                }
                is DeleteGroupResult.Failure -> {
                    val stringRes = ChatGroupError.stringResForCode(result.parseCode)
                        ?: R.string.error_group_generic
                    _errorMessage.postValue(appContext.getString(stringRes))
                }
            }
        }
    }
}
