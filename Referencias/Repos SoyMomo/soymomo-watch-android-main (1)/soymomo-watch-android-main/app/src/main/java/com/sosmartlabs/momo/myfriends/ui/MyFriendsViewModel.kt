package com.sosmartlabs.momo.myfriends.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.parse.ParseUser
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.myfriends.model.WatchWearer
import com.sosmartlabs.momo.myfriends.model.WatchWearerRepository
import com.sosmartlabs.momo.myfriends.model.WhichWatch
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

/**
 * ViewModel for MyFriends view
 * @param externalScope Scope for external coroutine operations
 * @param ioContext Context for IO operation in coroutines
 * @param watchWearerRepository Repository of WatchWearers
 */
@HiltViewModel
class MyFriendsViewModel @Inject constructor(private val externalScope: CoroutineScope,
                                             private val ioContext: CoroutineContext,
                                             private val watchWearerRepository: WatchWearerRepository): ViewModel() {

    /**
     * Current watch
     */
    private lateinit var watch: Wearer

    /**
     * LiveData for getting if show friends list or an empty view.
     * Private instance with MutableListData, must be accessed from Activity through
     * [showFriendsList] getter with LiveData type.
     */
    private val _showFriendsLists = MutableLiveData<Boolean>()

    /**
     * LiveData for getting if show friends list or an empty view.
     */
    val showFriendsList: LiveData<Boolean> get() = _showFriendsLists

    /**
     * LiveData for getting pending friends requests from the view.
     * Private instance with MutableListData, must be accessed from Activity through
     * [pendingRequests] getter with LiveData type.
     */
    private val _pendingRequests = MutableLiveData<Resource<List<WatchWearer>, Any?>>()

    /**
     * LiveData for getting pending friends requests from the view.
     */
    val pendingRequests: LiveData<Resource<List<WatchWearer>, Any?>> get() = _pendingRequests

    /**
     * LiveData for getting accepted friends requests from the view.
     * Private instance with MutableListData, must be accessed from Activity through
     * [pendingRequests] getter with LiveData type.
     */
    private val _acceptedRequests = MutableLiveData<Resource<List<WatchWearer>, Any?>>()

    /**
     * LiveData for getting accepted friends requests from the view.
     */
    val acceptedRequests: LiveData<Resource<List<WatchWearer>, Any?>> get() = _acceptedRequests

    /**
     * LiveData for operations over a single WatchWearer request.
     * Private instance with MutableListData, must be accessed from Activity through
     * [currentRequest] getter with LiveData type.
     */
    private val _currentRequest = MutableLiveData<Resource<WatchWearer, WatchWearerDeleteType>>()

    /**
     * LiveData for operations over a single WatchWearer request.
     */
    val currentRequest: LiveData<Resource<WatchWearer, WatchWearerDeleteType>> get() = _currentRequest

    /**
     * Load the friends request list for the given watch.
     * @param watch Wearer for looking friends
     */
    fun loadFriends(watch: Wearer) {
        this.watch = watch
        _pendingRequests.value = Resource(Resource.Status.LOADING)
        var friends: List<WatchWearer>? = null
        viewModelScope.launch(ioContext) {
            runCatching {
                friends = watchWearerRepository.getWatchWearers(watch)
            }.onSuccess {
                if (friends.isNullOrEmpty()) {
                    _showFriendsLists.postValue(false)
                    return@launch
                }
                else _showFriendsLists.postValue(true)

                val (accepted, pending) = friends!!.partition { request ->
                    request.isWatch1Approved && request.isWatch2Approved
                }

                // filter null values (there should not be any, if there is it's probably an ACL issue)
                val newAccepted = accepted.filter { request ->
                    request.watch1 != null && request.watch2!= null
                }
                val newPending = pending.filter { request ->
                    request.watch1 != null && request.watch2 != null
                }

                _pendingRequests.postValue(Resource(Resource.Status.LOAD_SUCCESS, newPending))
                _acceptedRequests.postValue(Resource(Resource.Status.LOAD_SUCCESS, newAccepted))
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error on loading friends")
                    recordException(it)
                }
                Timber.e(it.cause)
                _pendingRequests.postValue(Resource(Resource.Status.LOAD_ERROR))
            }
        }
    }

    /**
     * Determines if the current user has administrator privileges for the current watch
     * @param watch Watch to check
     * @return true if the current user is admin, false otherwise.
     */
    fun isAdmin(watch: Wearer = this.watch) = watch.userInCharge.objectId == ParseUser.getCurrentUser().objectId

    /**
     * Accepts a friend request for the current watch
     * @param watchWearer Friend request to accept
     */
    fun acceptFriendRequest(watchWearer: WatchWearer) {
        _currentRequest.value = Resource(Resource.Status.UPDATING, watchWearer)
        val pendingRequestsList = _pendingRequests.value!!.data!!.toMutableList()
        val acceptedRequestsList = _acceptedRequests.value!!.data!!.toMutableList()
        externalScope.launch(ioContext) {
            runCatching {
                watchWearerRepository.acceptWatchWearerRequest(watchWearer,
                    if (watchWearer.watch1.objectId == watch.objectId) WhichWatch.WATCH1
                    else WhichWatch.WATCH2)
            }.onSuccess {
                if (watchWearer.isWatch1Approved && watchWearer.isWatch2Approved) {
                    pendingRequestsList.remove(watchWearer)
                    acceptedRequestsList.add(watchWearer)
                    _pendingRequests.postValue(Resource(Resource.Status.UPDATING_SUCCESS,
                        pendingRequestsList.toList()))
                    _acceptedRequests.postValue(Resource(Resource.Status.UPDATING_SUCCESS,
                        acceptedRequestsList.toList()))
                }
                else {
                    _currentRequest.postValue(Resource(Resource.Status.UPDATING_SUCCESS, watchWearer))
                }
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error on accepting friend request")
                    recordException(it)
                }
                Timber.e(it.cause)
                watchWearerRepository.revertChanges(watchWearer)
                _currentRequest.postValue(Resource(Resource.Status.UPDATING_ERROR, watchWearer))
            }
        }
    }

    /**
     * Rejects a friend request for current watch
     * @param watchWearer WatchWearer request to reject
     */
    fun rejectFriendRequest(watchWearer: WatchWearer) {
        deleteWatchWearer(watchWearer, _pendingRequests,
            WatchWearerDeleteType.REJECTING_REQUEST)
    }

    /**
     * Delete an accepted friend for current watch
     * @param watchWearer WatchWearer friend to delete
     */
    fun deleteAcceptedFriend(watchWearer: WatchWearer) {
        deleteWatchWearer(watchWearer, _acceptedRequests,
            WatchWearerDeleteType.DELETE_ACCEPTED_REQUEST)
    }

    /**
     * Delete an WatchWearer for current watch
     * @param watchWearer WatchWearer to delete
     * @param liveDataToUpdate Live data to be updated when the delete succeed
     * @param deleteType Type of the deletion been to be performed
     */
    private fun deleteWatchWearer(watchWearer: WatchWearer,
                                  liveDataToUpdate: MutableLiveData
                                  <Resource<List<WatchWearer>, Any?>>,
                                  deleteType: WatchWearerDeleteType) {
        _currentRequest.value = Resource(Resource.Status.DELETING, watchWearer,deleteType)
        val requestsList = liveDataToUpdate.value!!.data!!.toMutableList()
        externalScope.launch(ioContext) {
            runCatching {
                watchWearerRepository.deleteWatchWearerRequest(watchWearer)
            }.onSuccess {
                requestsList.remove(watchWearer)
                liveDataToUpdate.postValue(Resource(Resource.Status.DELETING_SUCCESS, requestsList.toList()))
            }.onFailure {
                with(Firebase.crashlytics) {
                    log("Error removing watchWearer")
                    recordException(it)
                }
                watchWearerRepository.revertChanges(watchWearer)
                _currentRequest.postValue(Resource(Resource.Status.DELETING_ERROR, watchWearer,
                    deleteType))
            }
        }
    }
}
