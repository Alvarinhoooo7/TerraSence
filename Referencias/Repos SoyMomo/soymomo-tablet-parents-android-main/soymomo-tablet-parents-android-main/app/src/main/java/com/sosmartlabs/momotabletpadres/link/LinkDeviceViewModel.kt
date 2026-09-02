package com.sosmartlabs.momotabletpadres.link

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.link.model.DeviceColor
import com.sosmartlabs.momotabletpadres.link.model.LinkDeviceStatus
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.security.DeviceKeyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@ExperimentalCoroutinesApi
@HiltViewModel
class LinkDeviceViewModel @Inject constructor(
    application: Application,
    private val tabletRepository: TabletRepository,
    private val deviceKeyRepository: DeviceKeyRepository,
) : AndroidViewModel(application) {

    private var _linkDeviceStatus = MutableLiveData<LinkDeviceStatus>()
    val linkDeviceStatus: LiveData<LinkDeviceStatus>
        get() = _linkDeviceStatus

    private var _currentTablet = MutableLiveData<Tablet?>()
    val currentTablet: LiveData<Tablet?>
        get() = _currentTablet

    private val _selectedDeviceColor = MutableLiveData<DeviceColor?>()
    val selectedDeviceColor: LiveData<DeviceColor?> = _selectedDeviceColor

    private var isLinkedToOtherUser = false

    fun setSelectedDeviceColor(color: DeviceColor) {
        _selectedDeviceColor.postValue(color)
        _linkDeviceStatus.postValue(LinkDeviceStatus.READY_TO_LINK)
    }

    fun checkTabletStatus(tabletId: String) {
        Timber.d("LinkDeviceViewModel: checkTabletStatus - Start checking tablet status for id: $tabletId")
        CrashlyticsLog.log("LinkDeviceViewModel: checkTabletStatus - Start checking tablet status for id: $tabletId")
        _linkDeviceStatus.postValue(LinkDeviceStatus.SEARCH_IN_PROGRESS)
        _currentTablet.postValue(null)
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                Timber.d("LinkDeviceViewModel: checkTabletStatus - Calling tabletRepository.checkTabletStatus")
                val status = tabletRepository.checkTabletStatus(tabletId)
                val tablet = if (status == LinkDeviceStatus.DEVICE_AVAILABLE) {
                    Timber.d("LinkDeviceViewModel: checkTabletStatus - Tablet available, getting details")
                    tabletRepository.getTabletByObjectId(tabletId)
                } else {
                    null
                }
                Pair(status, tablet)
            }.onSuccess { (status, tablet) ->
                Timber.d("LinkDeviceViewModel: checkTabletStatus - Successfully checked tablet status for id: $tabletId, status: $status")
                _currentTablet.postValue(tablet)
                when (status) {
                    LinkDeviceStatus.DEVICE_AVAILABLE -> {
                        _linkDeviceStatus.postValue(LinkDeviceStatus.AWAITING_COLOR_SELECTION)
                    }
                    LinkDeviceStatus.DEVICE_BELONGS_TO_OTHER_USER -> {
                        isLinkedToOtherUser = true
                        _linkDeviceStatus.postValue(LinkDeviceStatus.DEVICE_BELONGS_TO_OTHER_USER)
                    }
                    else -> {
                        _linkDeviceStatus.postValue(status)
                    }
                }
            }.onFailure { throwable ->
                Timber.e(throwable, "LinkDeviceViewModel: checkTabletStatus - Failed to check tablet status for id: $tabletId: ${throwable.message}")
                CrashlyticsLog.recordNonFatalError(throwable, "LinkDeviceViewModel: checkTabletStatus - Error on linking tablet with id: $tabletId")
                _linkDeviceStatus.postValue(LinkDeviceStatus.ERROR)
            }
        }
    }

    fun linkTabletWithObjectId(tabletId: String, colorId: String) {
        Timber.d("LinkDeviceViewModel: linkTabletWithObjectId - Start linking tablet with objectId: $tabletId")
        CrashlyticsLog.log("LinkDeviceViewModel: linkTabletWithObjectId - Start linking tablet with objectId: $tabletId")

        _linkDeviceStatus.postValue(LinkDeviceStatus.LINKING_IN_PROGRESS)
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                Timber.d("LinkDeviceViewModel: linkTabletWithObjectId - Calling tabletRepository.linkTabletByObjectId")
                val linkedTablet = tabletRepository.linkTabletByObjectId(tabletId)

                if (colorId.isNotEmpty() && !isLinkedToOtherUser) {
                    try {
                        tabletRepository.setTabletColorWithObjectId(tabletId, colorId)
                    } catch (e: Exception) {
                        Timber.d("LinkDeviceViewModel: linkTabletWithObjectId - Failed to set device color $colorId to $tabletId")
                        CrashlyticsLog.log("LinkDeviceViewModel: linkTabletWithObjectId - Failed to set device color $colorId to $tabletId")
                    }
                }

                linkedTablet
            }.onSuccess { tablet ->
                Timber.d("LinkDeviceViewModel: linkTabletWithObjectId - Successfully linked tablet: ${tablet.objectId}")
                CrashlyticsLog.log("LinkDeviceViewModel: linkTabletWithObjectId - Successfully linked tablet: ${tablet.objectId}")
                
                // Fetch and store the device encryption key for this tablet
                tablet.objectId?.let { linkedTabletId ->
                    try {
                        Timber.d("LinkDeviceViewModel: linkTabletWithObjectId - Fetching device key for tablet: $linkedTabletId")
                        deviceKeyRepository.fetchAndStoreKey(linkedTabletId)
                        Timber.d("LinkDeviceViewModel: linkTabletWithObjectId - Successfully fetched device key for tablet: $linkedTabletId")
                    } catch (e: Exception) {
                        // Don't fail the linking if key fetch fails - it can be retried later
                        Timber.w(e, "LinkDeviceViewModel: linkTabletWithObjectId - Failed to fetch device key for tablet: $linkedTabletId")
                        CrashlyticsLog.log("LinkDeviceViewModel: linkTabletWithObjectId - Failed to fetch device key: ${e.message}")
                    }
                }
                
                _linkDeviceStatus.postValue(LinkDeviceStatus.DEVICE_LINK_SUCCESS)
                _currentTablet.postValue(tablet)
            }.onFailure { throwable ->
                Timber.e(throwable, "LinkDeviceViewModel: linkTabletWithObjectId - Failed to link tablet with objectId: $tabletId: ${throwable.message}")
                CrashlyticsLog.recordNonFatalError(throwable, "LinkDeviceViewModel: linkTabletWithObjectId - Error on linking tablet with objectId: $tabletId")
                _linkDeviceStatus.postValue(LinkDeviceStatus.ERROR)
            }
        }
    }
}