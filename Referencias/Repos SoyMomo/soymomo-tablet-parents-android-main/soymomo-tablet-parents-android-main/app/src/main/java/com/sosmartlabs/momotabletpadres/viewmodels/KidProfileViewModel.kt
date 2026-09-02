package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.ui.TabletViewModelBase
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject

@HiltViewModel
class KidProfileViewModel @Inject constructor(
    application: Application,
    private val tabletRepository: TabletRepository
) : TabletViewModelBase(application) {

    /**
     * Coroutine scope for IO operations
     */
    private val scopeIO = CoroutineScope(Dispatchers.IO)

    /**
     * Current Tablet
     */
    private var _currentTablet = MutableLiveData<Resource<Tablet, Resource.Status>>()
    val currentTablet: LiveData<Resource<Tablet, Resource.Status>>
        get() = _currentTablet

    /**
     * Kid picture status
     */
    private var _kidPictureStatus = MutableLiveData<Resource.Status>()
    val kidPictureStatus: LiveData<Resource.Status>
        get() = _kidPictureStatus

    /**
     * Kid edit form has current changes
     */
    private var _kidFormHasChanges = MutableLiveData(false)
    val kidFormHasChanges: LiveData<Boolean>
        get() = _kidFormHasChanges

    /**
     * Sets the current tablet for this view model
     * @param tablet Current tablet
     */
    override fun setCurrentTablet(tablet: Tablet) {
        Timber.d("setCurrentTablet $tablet")
        super.setCurrentTablet(tablet)
        viewModelScope.launch(Dispatchers.IO) {
            _currentTablet.postValue(Resource(status = Resource.Status.LOADING))
            runCatching {
                tablet
            }.onSuccess {
                _currentTablet.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = it))
            }.onFailure { e ->
                Timber.e(e)
                CrashlyticsLog.recordNonFatalError(e, "Error: setCurrentTablet")
                _currentTablet.postValue(Resource(status = Resource.Status.LOAD_ERROR))
            }
        }
    }

    /**
     * Changes the current user picture
     */
    fun changeKidPicture(path: String) {
        Timber.d("changeUserPicture $path")
        viewModelScope.launch(Dispatchers.IO) {
            _kidPictureStatus.postValue(Resource.Status.UPDATING)
            runCatching {
                val currentTablet = currentTablet.value!!.data!!
                tabletRepository.updateProfileImage(currentTablet, path)
                tabletRepository.getTabletByObjectId(currentTablet.objectId!!)
            }.onSuccess {
                _kidPictureStatus.postValue(Resource.Status.UPDATING_SUCCESS)
                _currentTablet.postValue(Resource(status = Resource.Status.LOAD_SUCCESS, data = it))
            }.onFailure { e ->
                _kidPictureStatus.postValue(Resource.Status.UPDATING_ERROR)
                Timber.e(e)
                CrashlyticsLog.recordNonFatalError(e, "Error: changeKidPicture")
            }
        }
    }

    /**
     * Reset [kidPictureStatus] to [Resource.Status.DEFAULT]
     */
    fun resetKidPictureStatus() {
        Timber.d("resetKidPictureStatus")
        viewModelScope.launch(Dispatchers.IO) {
            _kidPictureStatus.postValue(Resource.Status.DEFAULT)
        }
    }

    /**
     * Checks if the info provided by the Kid edit UI has changes
     */
    fun checkKidHasChanges(params: MutableMap<String, Any>) {
        Timber.d("checkKidHasChanges $params")
        viewModelScope.launch(Dispatchers.IO) {
            var hasChanges = false
            runCatching {
                val currentTablet = currentTablet.value!!.data!!

                val simpleDateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val birthdayDate = params["birthday"]?.let { simpleDateFormat.parse(it as String) }

                Timber.d("${currentTablet.profileName} - ${params["profileName"]}")
                Timber.d("${currentTablet.kidBirthday} - $birthdayDate")

                hasChanges = currentTablet.profileName != params["profileName"] ||
                        currentTablet.kidBirthday != birthdayDate

                Timber.d("hasChanges $hasChanges")
            }.onFailure { e ->
                Timber.e(e)
            }
            _kidFormHasChanges.postValue(hasChanges)
        }
    }

    /**
     * Save the new Kid info
     */
    fun saveKidInfo(params: MutableMap<String, Any>) {
        Timber.d("saveKidInfo $params")
        viewModelScope.launch(Dispatchers.IO) {
            val tablet = currentTablet.value!!.data!!
            _currentTablet.postValue(Resource(status = Resource.Status.UPDATING, data = tablet))
            runCatching {
                tablet.profileName = params["profileName"] as String
                val simpleDateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val birthdayDate = params["birthday"]?.let { simpleDateFormat.parse(it as String) }
                if (birthdayDate != null) {
                    tablet.kidBirthday = birthdayDate
                }
                tabletRepository.update(tablet)
            }.onSuccess {
                _currentTablet.postValue(Resource(status = Resource.Status.UPDATING_SUCCESS, data = it))
            }.onFailure { e ->
                Timber.e(e)
                _currentTablet.postValue(Resource(status = Resource.Status.UPDATING_ERROR, data = tablet))
            }
        }
    }
}