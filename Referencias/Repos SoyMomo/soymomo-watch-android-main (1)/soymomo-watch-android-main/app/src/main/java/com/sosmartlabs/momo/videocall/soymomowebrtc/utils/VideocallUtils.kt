package com.sosmartlabs.momo.videocall.soymomowebrtc.utils

import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber
import java.text.SimpleDateFormat

class VideocallUtils {

    companion object {

        const val RING_TIMEOUT_MS = 40 * 1000
        val SDF_VIDEOCALL = SimpleDateFormat("dd-MM-yyyy-HH-mm-ss-z")

        /**
         * Converts a byte value into a human-readable string (B, KB, MB, GB, TB).
         * Logs each step and errors for better traceability.
         */
        fun bytesIntoHumanReadable(bytes: Long): String {
            Timber.d("VideocallUtils: bytesIntoHumanReadable() - Called with bytes=$bytes")
            val kilobyte: Long = 1024
            val megabyte = kilobyte * 1024
            val gigabyte = megabyte * 1024
            val terabyte = gigabyte * 1024

            try {
                val result = when {
                    bytes < 0 -> {
                        Timber.e("VideocallUtils: bytesIntoHumanReadable() - Negative byte value: $bytes")
                        CrashlyticsLog.log("VideocallUtils: bytesIntoHumanReadable() - Negative byte value: $bytes")
                        "Invalid size"
                    }
                    bytes in 0 until kilobyte -> {
                        Timber.d("VideocallUtils: bytesIntoHumanReadable() - Value in B range")
                        "$bytes B"
                    }
                    bytes in kilobyte until megabyte -> {
                        Timber.d("VideocallUtils: bytesIntoHumanReadable() - Value in KB range")
                        "${bytes / kilobyte} KB"
                    }
                    bytes in megabyte until gigabyte -> {
                        Timber.d("VideocallUtils: bytesIntoHumanReadable() - Value in MB range")
                        "${bytes / megabyte} MB"
                    }
                    bytes in gigabyte until terabyte -> {
                        Timber.d("VideocallUtils: bytesIntoHumanReadable() - Value in GB range")
                        "${bytes / gigabyte} GB"
                    }
                    bytes >= terabyte -> {
                        Timber.d("VideocallUtils: bytesIntoHumanReadable() - Value in TB range")
                        "${bytes / terabyte} TB"
                    }
                    else -> {
                        Timber.e("VideocallUtils: bytesIntoHumanReadable() - Unexpected value: $bytes")
                        CrashlyticsLog.log("VideocallUtils: bytesIntoHumanReadable() - Unexpected value: $bytes")
                        "$bytes Bytes"
                    }
                }
                Timber.d("VideocallUtils: bytesIntoHumanReadable() - Result: $result")
                return result
            } catch (e: Exception) {
                Timber.e("VideocallUtils: bytesIntoHumanReadable() - Exception: $e")
                CrashlyticsLog.recordNonFatalError(e, "VideocallUtils: bytesIntoHumanReadable() - Exception for bytes=$bytes")
                return "Error"
            }
        }
    }
}