package com.sosmartlabs.momo.watchrequests.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.models.UserPermissionFeature
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.SingleLiveEvent
import com.sosmartlabs.momo.watchrequests.model.UserPermission
import com.sosmartlabs.momo.watchrequests.model.UserPermissionRepository
import com.sosmartlabs.momo.watchsettings.model.AclRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class WatchRequestViewModel @Inject constructor(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val watchUserRepository: WatchUserRepository,
    private val aclRepository: AclRepository,
    private val userPermissionRepository: UserPermissionRepository
) : ViewModel() {

    private val _state = SingleLiveEvent<RequestState>()
    val state: LiveData<RequestState> get() = _state
    private val _acceptedRequests = MutableLiveData<MutableList<WatchUser>>()
    val acceptedRequests: LiveData<MutableList<WatchUser>> get() = _acceptedRequests
    private val _pendingRequests = MutableLiveData<MutableList<WatchUser>>()
    val pendingRequests: LiveData<MutableList<WatchUser>> get() = _pendingRequests
    private val _currentUser = MutableLiveData<WatchUser>()
    val currentUser: LiveData<WatchUser> get() = _currentUser

    /** Whether a permission save is in flight. Lives in the (activity-scoped) ViewModel so the
     *  editor's spinner / disabled-Save state survives a config-change recreate, and so a save
     *  can't be triggered twice. */
    private val _saveInProgress = MutableLiveData(false)
    val saveInProgress: LiveData<Boolean> get() = _saveInProgress

    private lateinit var watchId: String

    private val _permissionFeatures = MutableLiveData<List<UserPermissionFeature>>()
    val permissionFeature: LiveData<List<UserPermissionFeature>> get() = _permissionFeatures

    /** Emitted after a request is accepted, so the UI can point the admin at the new
     *  co-manager's permissions (which default to full access). */
    private val _acceptedEvent = SingleLiveEvent<WatchUser>()
    val acceptedEvent: LiveData<WatchUser> get() = _acceptedEvent

    fun loadRequests(watchId: String) {
        loadRequests(watchId, true)
    }

    private fun loadRequests(watchId: String, setupAclIfRequired: Boolean) {
        this.watchId = watchId
        // postValue: the ACL-repair retry at the bottom of the launch block re-enters this method
        // on Dispatchers.IO, where setValue would crash (Crashlytics: "Cannot invoke setValue on a
        // background thread").
        _state.postValue(RequestState.LOADING)
        viewModelScope.launch(ioContext) {
            var requests: List<WatchUser>? = null
            runCatching {
                requests = watchUserRepository.loadRequestForId(watchId)
            }.onSuccess {
                val loadedRequests = requests!!
                val errorWatchUser = loadedRequests.firstOrNull { it.watch == null || it.user == null }
                if (errorWatchUser != null) {
                    if (setupAclIfRequired) {
                        aclRepository.setupWatchGlobalAcl(watchUserRepository.findWatchById(watchId))
                        loadRequests(watchId, false)
                    } else {
                        _state.postValue(RequestState.ERROR_GET)
                        CrashlyticsLog.recordNonFatalError(
                            Exception("Watch or user null for watchUser"),
                            "Watch or user null for watchUser ${errorWatchUser.objectId}"
                        )
                    }
                    return@launch
                }
                val (accepted, pending) = loadedRequests.partition { it.active }
                _state.postValue(RequestState.LOADING_SUCCESS)
                _acceptedRequests.postValue(accepted.toMutableList())
                _pendingRequests.postValue(pending.toMutableList())
            }.onFailure {
                _state.postValue(RequestState.ERROR_GET)
                with(Firebase.crashlytics) {
                    log("Error on loading requests")
                    recordException(it)
                }
            }
        }
    }

    fun setCurrentUser(user: WatchUser) {
        // Clear any feature list left over from a previous editor session. This ViewModel is
        // activity-scoped, so a stale list would be replayed to the re-entering editor fragment
        // and captured as its "original" baseline before loadPermissions() posts the fresh state.
        // That broke dirty-state detection (Save stayed disabled after a real change) and let
        // unsaved toggles leak into the shared model. loadPermissions() repopulates this.
        _permissionFeatures.value = emptyList()
        // A new editor session starts with no save in flight. Without this, a save still running
        // from a previous co-manager's editor (externalScope outlives navigation) would replay its
        // true value into this editor and show a stuck spinner / disabled Save.
        _saveInProgress.value = false
        _currentUser.value = user
    }

    /** Removes a co-manager after the admin confirms. Posts SUCCESS_DELETE / ERROR_DELETE. */
    fun removeRequest(request: WatchUser) {
        _state.value = RequestState.LOADING
        externalScope.launch(ioContext) {
            var result = 0
            runCatching {
                val params = HashMap<String, Any>()
                params["reqId"] = request.objectId
                result = watchUserRepository.removeRequest(params)
            }.onSuccess {
                if (result != 1) {
                    _state.postValue(RequestState.ERROR_DELETE)
                } else {
                    _state.postValue(RequestState.SUCCESS_DELETE)
                    val accepted = acceptedRequests.value?.toMutableList() ?: mutableListOf()
                    accepted.remove(request)
                    _acceptedRequests.postValue(accepted)
                }
            }.onFailure {
                Timber.e(it)
                with(Firebase.crashlytics) {
                    log("Error on removing requests")
                    recordException(it)
                }
                _state.postValue(RequestState.ERROR_DELETE)
            }
        }
    }

    fun handlePendingRequest(request: WatchUser, accepted: Boolean) {
        _state.value = RequestState.LOADING
        externalScope.launch(ioContext) {
            var result = 0
            runCatching {
                val params = HashMap<String, Any>()
                params["reqId"] = request.objectId
                params["accepted"] = accepted
                result = watchUserRepository.handlePendingRequest(params)
            }.onSuccess {
                if (result != 1) {
                    _state.postValue(if (accepted) RequestState.ERROR_ACCEPT else RequestState.ERROR_REJECT)
                } else {
                    _state.postValue(if (accepted) RequestState.SUCCESS_ACCEPT else RequestState.SUCCESS_REJECT)
                    val pending = pendingRequests.value?.toMutableList() ?: mutableListOf()
                    pending.remove(request)
                    _pendingRequests.postValue(pending)
                    if (accepted) {
                        request.active = true
                        val acceptedList = acceptedRequests.value?.toMutableList() ?: mutableListOf()
                        acceptedList.add(request)
                        _acceptedRequests.postValue(acceptedList)
                        _acceptedEvent.postValue(request)
                    }
                }
            }.onFailure {
                Timber.e(it)
                _state.postValue(if (accepted) RequestState.ERROR_ACCEPT else RequestState.ERROR_REJECT)

                with(Firebase.crashlytics) {
                    log("Error on handling pending requests")
                    recordException(it)
                }
            }
        }
    }

    /**
     * User Permissions
     */

    private lateinit var callPermission: UserPermissionFeature
    private lateinit var videoCallPermission: UserPermissionFeature
    private lateinit var messagesPermission: UserPermissionFeature
    private lateinit var locationPermission: UserPermissionFeature
    private lateinit var editPermission: UserPermissionFeature

    private fun getPermissions(userPermission: UserPermission) = listOf(
        UserPermissionFeature(
            R.drawable.ic_calls_permission, R.string.title_calls_permission, userPermission.call,
            R.string.watch_request_perm_calls_desc
        ).apply {
            callPermission = this
        },
        UserPermissionFeature(
            R.drawable.ic_video_calls_permission,
            R.string.title_video_calls_permission,
            userPermission.videocall,
            R.string.watch_request_perm_videocalls_desc
        ).apply {
            videoCallPermission = this
        },
        UserPermissionFeature(
            R.drawable.ic_messages_permission, R.string.messages_title, userPermission.messages,
            R.string.watch_request_perm_messages_desc
        ).apply {
            messagesPermission = this
        },
        UserPermissionFeature(
            R.drawable.ic_location_permission,
            R.string.title_location_permission,
            userPermission.location,
            R.string.watch_request_perm_location_desc
        ).apply {
            locationPermission = this
        },
        UserPermissionFeature(
            R.drawable.ic_edit_permission, R.string.title_edit_permission, userPermission.edit,
            R.string.watch_request_perm_edit_desc
        ).apply {
            editPermission = this
        }
    )


    fun loadPermissions(watchUser: WatchUser) {
        val permission: UserPermission? = watchUser.userPermission
        if (permission == null) {
            _state.value = RequestState.ERROR_GET
            CrashlyticsLog.recordNonFatalError(
                Exception("Null userPermission for watchUser"),
                "Null userPermission for watchUser ${watchUser.objectId}"
            )
            return
        }
        _state.value = RequestState.LOADING
        _permissionFeatures.postValue(getPermissions(permission))
        _state.value = RequestState.LOADING_SUCCESS
    }

    fun updateCurrentUserPermissionState(
        userPermission: UserPermissionFeature, enabled: Boolean
    ) {
        val user = currentUser.value ?: return
        val permission: UserPermission? = user.userPermission
        if (permission == null) return
        userPermissionRepository.updateCurrentUserPermission(
            permission,
            call = if (userPermission.isSamePermission(callPermission)) enabled else permission.call,
            videoCall = if (userPermission.isSamePermission(videoCallPermission)) enabled else permission.videocall,
            messages = if (userPermission.isSamePermission(messagesPermission)) enabled else permission.messages,
            location = if (userPermission.isSamePermission(locationPermission)) enabled else permission.location,
            edit = if (userPermission.isSamePermission(editPermission)) enabled else permission.edit
        )
    }

    /**
     * Reverts any unsaved permission edits on the current user back to their last-saved
     * (server) values, so discarding in the editor doesn't leave the accepted list showing
     * a permission state that was never persisted.
     */
    fun discardPermissionChanges() {
        val permission: UserPermission? = currentUser.value?.userPermission
        permission?.revert()
    }

    fun saveUserPermissionChanges(userPermission: UserPermission) {
        // Ignore a second tap while a save is already running (e.g. a recreate mid-save re-enabled
        // the button); the flag is ViewModel-owned so it holds across the recreate.
        if (_saveInProgress.value == true) return
        _saveInProgress.value = true
        externalScope.launch(ioContext) {
            _state.postValue(RequestState.LOADING)
            runCatching {
                userPermissionRepository.saveUserPermission(userPermission)
            }.onSuccess {
                _state.postValue(RequestState.SUCCESS_UPDATE)
            }.onFailure {
                _state.postValue(RequestState.ERROR_UPDATE)
                with(Firebase.crashlytics) {
                    log("Error on update permissions")
                    recordException(it)
                }
            }
            _saveInProgress.postValue(false)
        }
    }


    enum class RequestState {
        ERROR_DELETE, ERROR_ACCEPT, ERROR_REJECT, ERROR_GET, ERROR_UPDATE, SUCCESS_DELETE, SUCCESS_ACCEPT, SUCCESS_UPDATE, SUCCESS_REJECT, LOADING, LOADING_SUCCESS
    }
}