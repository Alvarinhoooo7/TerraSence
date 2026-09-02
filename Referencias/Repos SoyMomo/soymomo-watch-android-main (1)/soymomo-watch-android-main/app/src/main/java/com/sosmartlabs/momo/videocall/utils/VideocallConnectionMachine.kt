package com.sosmartlabs.momo.videocall.utils

import androidx.lifecycle.MutableLiveData
import androidx.room.util.foreignKeyCheck
import com.sosmartlabs.momo.videocall.model.VideoDimensions
import com.sosmartlabs.momo.videocall.model.VideocallSignalState
import kotlinx.coroutines.CoroutineScope
import org.webrtc.PeerConnection
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import org.webrtc.RTCStats
import org.webrtc.RTCStatsReport
import timber.log.Timber
import javax.inject.Inject
import kotlin.collections.iterator
import kotlin.math.roundToInt

/**
 * A component that polls peer connection stats, infers video quality and frame dimensions,
 * and publishes signals for “user upload” and “watch view” quality.
 */
class VideocallConnectionMachine @Inject constructor() {

    private val pollIntervalMs: Long = 2000L
    private val highFpsThreshold: Double = 24.0
    private val midFpsThreshold: Double = 16.0
    private val watchHighThreshold: Double = 10.0
    private val watchMidThreshold: Double = 6.0

    val userReport = MutableLiveData<VideocallSignalState?>()
    val watchReport = MutableLiveData<VideocallSignalState?>()
    val remoteVideoDimensions = MutableLiveData<VideoDimensions?>()

    private var peerConnection: PeerConnection? = null
    private var pollingJob: Job? = null

    fun setConnection(pc: PeerConnection?) {
        peerConnection = pc
        Timber.d("VideocallConnectionMachine: setConnection → $pc")
    }

    fun start() {
        // Cancel any existing poll job
        pollingJob?.cancel()
        pollingJob = CoroutineScope(Dispatchers.IO).launch {
            while (isActive && !isConnectionClosed(peerConnection)) {
                try {
                    peerConnection?.getStats { report ->
                        processStatsReport(report)
                    }
                } catch (e: Exception) {
                    Timber.e(e, "VideocallConnectionMachine: getStats failed")
                }
                delay(pollIntervalMs)
            }
            Timber.i("VideocallConnectionMachine: Polling loop ended")
        }
    }

    fun stop() {
        pollingJob?.cancel()
        pollingJob = null
    }

    private fun isConnectionClosed(pc: PeerConnection?): Boolean {
        if (pc == null) {
            Timber.d("VideocallConnectionMachine: PeerConnection is null — treating as closed")
            return true
        }
        val state = pc.connectionState()
        if (state == PeerConnection.PeerConnectionState.CLOSED) {
            Timber.d("VideocallConnectionMachine: PeerConnection state is CLOSED")
            return true
        }
        return false
    }

    private fun processStatsReport(report: RTCStatsReport?) {
        if (report == null) {
            Timber.w("VideocallConnectionMachine: stats report is null")
            return
        }
        for ((_, stats) in report.statsMap) {
            try {
                when (stats.type) {
                    "inbound-rtp" -> handleInbound(stats)
                    "outbound-rtp" -> handleOutbound(stats)
                    else -> {
                        // ignore other types
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "VideocallConnectionMachine: error processing stat: ${stats.id}")
            }
        }
    }

    private fun handleInbound(stats: RTCStats) {
        val kind = stats.members["kind"] as? String
        if (kind != "video") return

        Timber.v("VideocallConnectionMachine: inbound-rtp video stats: ${stats.id}")

        // frames per second (decoded)
        val fps = (stats.members["framesPerSecond"] as? Double)
        val newState = when {
            fps == null || fps >= watchHighThreshold -> VideocallSignalState.CONNECTION_HIGH
            fps >= watchMidThreshold -> VideocallSignalState.CONNECTION_MID
            else -> VideocallSignalState.CONNECTION_LOW
        }
        Timber.v("VideocallConnectionMachine: inbound-rtp fps: $fps, state: $newState")

        watchReport.postValue(newState)

        // frame dimensions (if available)
        val widthD = stats.members["frameWidth"].toString().toInt()
        val heightD = stats.members["frameHeight"].toString().toInt()
        if (widthD > 0 && heightD > 0) {
            val dims = VideoDimensions(widthD, heightD)
            val current = remoteVideoDimensions.value
            if (current == null || current.width != dims.width || current.height != dims.height) {
                remoteVideoDimensions.postValue(dims)
                Timber.i("VideocallConnectionMachine: Updated remote video dimensions: ${dims.width}x${dims.height}")
            } else {
                Timber.v("VideocallConnectionMachine: Remote video dimensions unchanged: ${dims.width}x${dims.height}")
            }
        } else {
            Timber.v("VideocallConnectionMachine: No valid frameWidth/frameHeight in inbound stats")
        }
    }

    private fun handleOutbound(stats: RTCStats) {
        val kind = stats.members["kind"] as? String
        if (kind != "video") return

        Timber.v("VideocallConnectionMachine: outbound-rtp video stats: ${stats.id}")

        // outbound video may not have framesPerSecond; use framesEncoded or packetsSent
        val framesEncoded = (stats.members["framesEncoded"] as? Double)
        val fps = framesEncoded ?: (stats.members["framesPerSecond"] as? Double) ?: 0.0
        val newState = when {
            fps >= highFpsThreshold -> VideocallSignalState.CONNECTION_HIGH
            fps >= midFpsThreshold -> VideocallSignalState.CONNECTION_MID
            else -> VideocallSignalState.CONNECTION_LOW
        }
        Timber.v("VideocallConnectionMachine: outbound-rtp framesEncoded: $framesEncoded, fps: $fps, state: $newState")

        userReport.postValue(newState)
    }
}