package com.sosmartlabs.momotabletpadres.link

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.adapters.CompletableViewListener
import com.sosmartlabs.momotabletpadres.security.DeviceKeyRepository
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@ExperimentalCoroutinesApi
@HiltViewModel
class UnlinkDeviceViewModel @Inject constructor(
    application: Application,
    private val tabletRepository: TabletRepository,
    private val deviceKeyRepository: DeviceKeyRepository,
) : AndroidViewModel(application) {

    lateinit var unlinkListener: CompletableViewListener

    fun unlinkTablet(tablet: Tablet) {
        Timber.d("UnlinkDeviceViewModel: unlinkTablet - Start unlinking tablet: ${tablet.objectId}")
        CrashlyticsLog.log("UnlinkDeviceViewModel: unlinkTablet - Start unlinking tablet: ${tablet.objectId}")
        unlinkListener.hideRetry()
        unlinkListener.showLoading()

        viewModelScope.launch(Dispatchers.IO) {
            Timber.d("UnlinkDeviceViewModel: unlinkTablet - Launching coroutine for unlinking tablet")
            CrashlyticsLog.log("UnlinkDeviceViewModel: unlinkTablet - Launching coroutine for unlinking tablet")
            runCatching {
                Timber.d("UnlinkDeviceViewModel: unlinkTablet - Calling tabletRepository.unlinkTablet")
                CrashlyticsLog.log("UnlinkDeviceViewModel: unlinkTablet - Calling tabletRepository.unlinkTablet")
                tabletRepository.unlinkTablet(tablet.objectId!!)
            }.onSuccess {
                Timber.d("UnlinkDeviceViewModel: unlinkTablet - Successfully unlinked tablet: ${tablet.objectId}")
                CrashlyticsLog.log("UnlinkDeviceViewModel: unlinkTablet - Successfully unlinked tablet: ${tablet.objectId}")
                
                // Clear the device encryption key for this tablet
                tablet.objectId?.let { tabletId ->
                    try {
                        deviceKeyRepository.clearKey(tabletId)
                        Timber.d("UnlinkDeviceViewModel: unlinkTablet - Cleared device key for tablet: $tabletId")
                    } catch (e: Exception) {
                        Timber.w(e, "UnlinkDeviceViewModel: unlinkTablet - Failed to clear device key for tablet: $tabletId")
                    }
                }
                
                viewModelScope.launch(Dispatchers.Main) {
                    unlinkListener.hideLoading()
                    unlinkListener.showComplete()
                }
            }.onFailure { throwable ->
                Timber.e(throwable, "UnlinkDeviceViewModel: unlinkTablet - Failed to unlink tablet: ${tablet.objectId}: ${throwable.message}")
                CrashlyticsLog.recordNonFatalError(throwable, "UnlinkDeviceViewModel: unlinkTablet - Error on unlinking tablet: ${tablet.objectId}")
                viewModelScope.launch(Dispatchers.Main) {
                    unlinkListener.hideLoading()
                    unlinkListener.showErrorMessage("Error on unlink tablet: $throwable")
                    unlinkListener.showRetry()
                }
            }
        }
    }
}