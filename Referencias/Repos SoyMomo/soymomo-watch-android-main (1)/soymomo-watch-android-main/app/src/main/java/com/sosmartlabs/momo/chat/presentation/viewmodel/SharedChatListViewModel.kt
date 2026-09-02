package com.sosmartlabs.momo.chat.presentation.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parse.ParseUser
import com.sosmartlabs.momo.chat.data.repository.ChatWatchUserRepository
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.WatchUser
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class SharedChatListViewModel @Inject constructor(
    private val chatWatchUserRepository: ChatWatchUserRepository
) : ViewModel() {

    private val _watchUsers = MutableLiveData<List<WatchUser>>(emptyList())
    val watchUsers: LiveData<List<WatchUser>> = _watchUsers

    private val _isWatchUsersLoading = MutableLiveData(false)
    val isWatchUsersLoading: LiveData<Boolean> = _isWatchUsersLoading

    private val _watchUsersError = MutableLiveData<String?>()
    val watchUsersError: LiveData<String?> = _watchUsersError

    private var loadWatchUsersJob: Job? = null

    fun loadWatchUsers(forceRefresh: Boolean = false) {
        if (!forceRefresh && !_watchUsers.value.isNullOrEmpty()) {
            Timber.d("SharedChatListViewModel: watch users already loaded, skipping")
            return
        }

        loadWatchUsersJob?.cancel()
        loadWatchUsersJob = viewModelScope.launch {
            val user = ParseUser.getCurrentUser()
            if (user == null) {
                Timber.w("SharedChatListViewModel: current user is null, clearing watch users")
                _watchUsers.value = emptyList()
                _isWatchUsersLoading.value = false
                return@launch
            }

            _isWatchUsersLoading.value = true
            _watchUsersError.value = null

            runCatching {
                chatWatchUserRepository.fetchActiveWatchUsers(user)
            }.onSuccess { watchUsers ->
                Timber.d("SharedChatListViewModel: loaded ${watchUsers.size} watch users")
                _watchUsers.value = watchUsers
            }.onFailure { throwable ->
                if (throwable is CancellationException) {
                    throw throwable
                }
                Timber.e(throwable, "SharedChatListViewModel: error loading watch users")
                CrashlyticsLog.recordNonFatalError(
                    throwable,
                    "SharedChatListViewModel: error loading watch users"
                )
                _watchUsersError.value = throwable.message
            }

            _isWatchUsersLoading.value = false
        }
    }

    fun clearWatchUsersError() {
        _watchUsersError.value = null
    }
}
