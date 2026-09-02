package com.sosmartlabs.momo.videocall.ui

import androidx.lifecycle.ViewModel
import com.sosmartlabs.momo.videocall.utils.VideocallConnectionMachine
import com.sosmartlabs.momo.videocall.soymomowebrtc.RTCClient
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext
import timber.log.Timber

/**
 * ViewModel for VideoCalls
 * @param externalScope Scope for coroutine operations that needs to outlive this ViewModel scope
 * @param ioContext Context for IO operations in coroutines
 */
@HiltViewModel
class VideocallStatsViewModel @Inject constructor(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext
) : ViewModel() {

    @Inject
    lateinit var connectionMachine: VideocallConnectionMachine

    /**
     * Starts the current videocall monitoring
     */
    fun startMonitoring(rtcClient: RTCClient, wearerModel: Int) {
        Timber.i("VideocallStatsViewModel: startMonitoring called with wearerModel=$wearerModel, rtcClient=$rtcClient")
        try {
            Timber.d("VideocallStatsViewModel: Setting peerConnection in connectionMachine")
            connectionMachine.setConnection(rtcClient.peerConnection)

            Timber.d("VideocallStatsViewModel: Retrieving statistics from connectionMachine")
            connectionMachine.start()

            Timber.i("VideocallStatsViewModel: Monitoring started successfully")
        } catch (e: Exception) {
            Timber.e(e, "VideocallStatsViewModel: Error starting monitoring")
            CrashlyticsLog.recordNonFatalError(e, "VideocallStatsViewModel: Error in startMonitoring with wearerModel=$wearerModel, rtcClient=$rtcClient")
        }
    }

    override fun onCleared() {
        super.onCleared()
        connectionMachine.stop()
    }
}