package com.sosmartlabs.momo.userprofile.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.analytics.FirebaseAnalytics
import com.parse.ParseFile
import com.parse.ParseUser
import com.sosmartlabs.momo.dispatch.model.ParseInstallationRepository
import com.sosmartlabs.momo.geofences.repository.GeofenceRepository
import com.sosmartlabs.momo.main.model.UserRepository
import com.sosmartlabs.momo.main.model.WatchUserRepository
import com.sosmartlabs.momo.settingsapp.model.SessionStatus
import com.sosmartlabs.momo.sim.repository.SubscriptionRepository
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import timber.log.Timber
import java.io.File
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class UserProfileViewModel @Inject constructor(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val userRepository: UserRepository,
    private val watchUserRepository: WatchUserRepository,
    private val parseInstallationRepository: ParseInstallationRepository,
    private val geofenceRepository: GeofenceRepository,
    private val subscriptionRepository: SubscriptionRepository,
    private val firebaseAnalytics: FirebaseAnalytics
) : ViewModel() {

    /**
     * Current User
     */
    private var _currentUser = MutableLiveData<Resource<ParseUser, Resource.Status>>()
    val currentUser: LiveData<Resource<ParseUser, Resource.Status>>
        get() = _currentUser

    /**
     * LiveData for current user login status.
     * Must be accessed through the [sessionStatus] public getter from activity
     */
    private var _sessionStatus = MutableLiveData(SessionStatus.LOGGED_IN)
    val sessionStatus: LiveData<SessionStatus>
        get() = _sessionStatus

    /**
     * User picture status
     */
    private var _userPictureStatus = MutableLiveData<Resource.Status>()
    val userPictureStatus: LiveData<Resource.Status>
        get() = _userPictureStatus


    /**
     * User edit form has current changes
     */
    private var _userFormHasChanges = MutableLiveData(false)
    val userFormHasChanges: LiveData<Boolean>
        get() = _userFormHasChanges

    init {
        getCurrentUser()
    }

    /**
     * Loads the current user
     */
    fun getCurrentUser() {
        viewModelScope.launch(ioContext) {
            _currentUser.postValue(Resource(status = Resource.Status.LOADING))
            runCatching {
                userRepository.getCurrentUser()
            }.onSuccess {
                _currentUser.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = it))
            }.onFailure { e ->
                Timber.e(e)
                CrashlyticsLog.recordNonFatalError(e, "Error: getCurrentUser")
                _currentUser.postValue(Resource(status = Resource.Status.LOAD_ERROR))
            }
        }
    }

    /**
     * Removes the current user picture
     */
    fun removeUserPicture() {
        viewModelScope.launch(ioContext) {
            _userPictureStatus.postValue(Resource.Status.DELETING)
            runCatching {
                val currentUser = currentUser.value!!.data!!
                currentUser.remove("image")
                currentUser.save()
            }.onSuccess {
                _userPictureStatus.postValue(Resource.Status.DELETING_SUCCESS)
                getCurrentUser()
            }.onFailure { e ->
                _userPictureStatus.postValue(Resource.Status.DELETING_ERROR)
                Timber.e(e)
                CrashlyticsLog.recordNonFatalError(e, "Error: deleteUserPicture")
                getCurrentUser()
            }
        }
    }

    /**
     * Changes the current user picture
     */
    fun changeUserPicture(path: String) {
        viewModelScope.launch(ioContext) {
            _userPictureStatus.postValue(Resource.Status.UPDATING)
            runCatching {
                val currentUser = currentUser.value!!.data!!
                val parseFile = ParseFile(File(path))
                parseFile.save()
                currentUser.put("image", parseFile)
                currentUser.save()
            }.onSuccess {
                _userPictureStatus.postValue(Resource.Status.UPDATING_SUCCESS)
                getCurrentUser()
            }.onFailure { e ->
                _userPictureStatus.postValue(Resource.Status.UPDATING_ERROR)
                Timber.e(e)
                CrashlyticsLog.recordNonFatalError(e, "Error: changeUserPicture")
                getCurrentUser()
            }
        }
    }

    /**
     * Reset [userPictureStatus] to [Resource.Status.DEFAULT]
     */
    fun resetUserPictureStatus() {
        viewModelScope.launch(ioContext) {
            _userPictureStatus.postValue(Resource.Status.DEFAULT)
        }
    }

    /**
     * Checks if the info provided by the User edit UI has changes
     */
    fun checkUserHasChanges(params: MutableMap<String, Any>) {
        viewModelScope.launch(ioContext) {
            var hasChanges = false
            runCatching {
                val currentUser = currentUser.value!!.data!!

                val simpleDateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val birthdayDate = params["birthday"]?.let { simpleDateFormat.parse(it as String) }

                Timber.d("${currentUser.getString("firstName")} - ${params["firstName"]}")
                Timber.d("${currentUser.getString("lastName")} - ${params["lastName"]}")
                Timber.d("${currentUser.getString("phone")} - ${params["phone"]}")
                Timber.d("${currentUser.getDate("birthday")} - $birthdayDate")

                hasChanges = currentUser.getString("firstName") != params["firstName"] ||
                        currentUser.getString("lastName") != params["lastName"] ||
                        currentUser.getString("phone") != params["phone"] ||
                        currentUser.getDate("birthday") != birthdayDate

                Timber.d("hasChanges $hasChanges")
            }.onFailure {e ->
                Timber.e(e)
            }
            _userFormHasChanges.postValue(hasChanges)
        }
    }

    /**
     * Save the new User info
     */
    fun saveUserInfo(params: MutableMap<String, Any>) {
        viewModelScope.launch(ioContext) {
            val currentUser = currentUser.value!!.data!!
            _currentUser.postValue(Resource(status = Resource.Status.UPDATING, data = currentUser))
            runCatching {
                currentUser.put("firstName", params["firstName"] as String)
                currentUser.put("lastName", params["lastName"] as String)
                currentUser.put("phone", params["phone"] as String)
                val simpleDateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val birthdayDate = params["birthday"]?.let { simpleDateFormat.parse(it as String) }
                if (birthdayDate != null) {
                    currentUser.put("birthday", birthdayDate)
                }
                currentUser.save()
                currentUser
            }.onSuccess {
                _currentUser.postValue(Resource(status = Resource.Status.UPDATING_SUCCESS, data = it))
            }.onFailure {e ->
                Timber.e(e)
                _currentUser.postValue(Resource(status = Resource.Status.UPDATING_ERROR, data = currentUser))
                currentUser.revert()
            }
        }
    }

    /**
     * Changes the current user email
     */
    fun changeUserEmail(params: MutableMap<String, Any>) {
        viewModelScope.launch(ioContext) {
            val currentUser = currentUser.value!!.data!!
            _currentUser.postValue(Resource(status = Resource.Status.UPDATING, data = currentUser))
            val newEmail = params["newEmail"] as String
            runCatching {
                currentUser.put("email", newEmail)
                currentUser.put("username", newEmail)
                currentUser.save()
                currentUser
            }.onSuccess {
                _currentUser.postValue(Resource(status = Resource.Status.UPDATING_SUCCESS, data = it))
            }.onFailure {e ->
                Timber.e(e)
                _currentUser.postValue(Resource(status = Resource.Status.UPDATING_ERROR, data = currentUser))
                currentUser.revert()
            }
        }
    }

    /**
     * Changes the current user password
     */
    fun changeUserPassword(params: MutableMap<String, Any>) {
        viewModelScope.launch(ioContext) {
            val currentUser = currentUser.value!!.data!!
            _currentUser.postValue(Resource(status = Resource.Status.UPDATING, data = currentUser))
            val currentPassword = params["currentPassword"] as String
            val newPassword = params["newPassword"] as String
            runCatching {
                ParseUser.logIn(currentUser.username, currentPassword)
                currentUser.setPassword(newPassword)
                currentUser.save()
                currentUser
            }.onSuccess {
                _currentUser.postValue(Resource(status = Resource.Status.UPDATING_SUCCESS, data = it))
            }.onFailure {e ->
                Timber.e(e)
                _currentUser.postValue(Resource(status = Resource.Status.UPDATING_ERROR, data = currentUser))
                currentUser.revert()
            }
        }
    }

    /**
     * Logout the current user
     */
    @OptIn(ExperimentalCoroutinesApi::class)
    fun logout() {
        externalScope.launch(ioContext) {
            _sessionStatus.postValue(SessionStatus.LOGGING_OUT)
            runCatching {
                userRepository.logout()
            }.onSuccess {
                runCatching {
                    parseInstallationRepository.removeUserFromInstallation()
                }.onFailure {
                    CrashlyticsLog.recordNonFatalError(
                        it,
                        "Error on removing user from installation in Parse"
                    )
                }
                _sessionStatus.postValue(SessionStatus.LOGGED_OUT)
            }.onFailure {
                _sessionStatus.postValue(SessionStatus.LOGOUT_ERROR)
                CrashlyticsLog.recordNonFatalError(it, "Error on logout from Main activity")
            }
        }
    }

}