package com.sosmartlabs.momo.videocall.model

data class RTCAudioStats(
    var roundTripTime: Double? = 0.0,
    var jitter: Double? = 0.0,
    var headerBytesSent: Long? = 0,
    var bytesSent: Long? = 0,
    var retransmittedBytesSent: Long? = 0,
    var headerBytesReceived: Long? = 0,
    var bytesReceived: Long? = 0) {

    override fun toString(): String {
        return "roundTripTime ${getConnectionDelay()}\n" +
                "jitter ${getJitter()}\n" +
                "headerBytesSent ${headerBytesSent}\n" +
                "bytesSent ${bytesSent}\n" +
                "retransmittedBytesSent ${retransmittedBytesSent}\n" +
                "headerBytesReceived ${headerBytesReceived}\n" +
                "bytesReceived ${bytesReceived}\n"
    }

    fun getBandwidthSent(): String {
        val totalBytes = headerBytesSent!!.plus(bytesSent!!).plus(retransmittedBytesSent!!)
        return "$totalBytes Bytes/s"
    }

    fun getBandwidthReceived(): String {
        val totalBytes = headerBytesReceived!!.plus(bytesReceived!!)
        return "$totalBytes Bytes/s"
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
