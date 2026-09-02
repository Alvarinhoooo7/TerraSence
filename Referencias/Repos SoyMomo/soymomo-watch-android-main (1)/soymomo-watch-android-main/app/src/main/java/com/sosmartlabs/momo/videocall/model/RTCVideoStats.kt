package com.sosmartlabs.momo.videocall.model

import com.sosmartlabs.momo.videocall.soymomowebrtc.utils.VideocallUtils

data class RTCVideoStats(
    var roundTripTime: Double? = 0.0,
    var jitter: Double? = 0.0,
    var headerBytesSent: Long? = 0,
    var bytesSent: Long? = 0,
    var retransmittedBytesSent: Long? = 0,
    var headerBytesReceived: Long? = 0,
    var bytesReceived: Long? = 0,
    var frameWidthSent: String? = "0",
    var frameHeightSent: String? = "0",
    var fpsSent: String? = "0",
    var frameWidthReceived: String? = "0",
    var frameHeightReceived: String? = "0",
    var fpsReceived: String? = "0",) {

    override fun toString(): String {
        return "roundTripTime ${getConnectionDelay()}\n" +
                "jitter ${getJitter()}\n" +
                "headerBytesSent ${VideocallUtils.bytesIntoHumanReadable(headerBytesSent!!)}\n" +
                "bytesSent ${VideocallUtils.bytesIntoHumanReadable(bytesSent!!)}\n" +
                "retransmittedBytesSent ${VideocallUtils.bytesIntoHumanReadable(retransmittedBytesSent!!)}\n" +
                "headerBytesReceived ${VideocallUtils.bytesIntoHumanReadable(headerBytesReceived!!)}\n" +
                "bytesReceived ${VideocallUtils.bytesIntoHumanReadable(bytesReceived!!)}\n" +
                "resolutionSent ${getResolutionSent()} fpsSent ${getFPSSent()}\n" +
                "resolutionReceived ${getResolutionReceived()} fpsReceived ${getFPSReceived()}\n"
    }

    fun getResolutionSent(): String {
        return "${frameWidthSent}x$frameHeightSent"
    }

    fun getResolutionReceived(): String {
        return "${frameWidthReceived}x$frameHeightReceived"
    }

    fun getFPSSent(): String {
        return "$fpsSent fps"
    }

    fun getFPSReceived(): String {
        return "$fpsReceived fps"
    }

    fun getBandwidthSent(): String {
        val totalBytes = headerBytesSent!!.plus(bytesSent!!).plus(retransmittedBytesSent!!)
        return "${VideocallUtils.bytesIntoHumanReadable(totalBytes)} Bytes/s"
    }

    fun getBandwidthReceived(): String {
        val totalBytes = headerBytesReceived!!.plus(bytesReceived!!)
        return "${VideocallUtils.bytesIntoHumanReadable(totalBytes)} Bytes/s"
    }

    fun getConnectionDelay(): String {
        val ms = roundTripTime!!.times(1000)
        return "$ms ms"
    }

    fun getJitter(): String {
        val ms = jitter!!.times(1000)
        return "$ms ms"
    }
}
