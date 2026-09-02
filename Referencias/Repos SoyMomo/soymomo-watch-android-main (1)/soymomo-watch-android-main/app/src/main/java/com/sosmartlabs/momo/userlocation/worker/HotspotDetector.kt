package com.sosmartlabs.momo.userlocation.worker

import android.net.wifi.ScanResult
import timber.log.Timber
import java.util.Locale

object HotspotDetector {

    // List of keywords that are likely to indicate a mobile hotspot.
    private val HOTSPOT_KEYWORDS = listOf(
        // Brand Names (most common)
        "iphone", "google", "samsung", "htc", "lg", "motorola", "oneplus",
        "xiaomi", "nokia", "sony", "redmi", "galaxy", "realme",
        // General English Keywords
        "mobile", "hotspot", "personal", "tether", "mifi", "portable", "phone",
        // Spanish Keywords
        "telefono", "celular",
        // German Keywords
        "telefon"
    )

    // Optional: Exclude common router/enterprise names to reduce false positives.
    private val EXCLUSION_KEYWORDS = listOf(
        "linksys", "netgear", "dlink", "tp-link", "asus"
    )

    fun isMobileHotspot(scanResult: ScanResult): Boolean {
        // Normalize the SSID by trimming whitespace and using a locale-independent lowercase.
        val ssid = scanResult.SSID.trim().lowercase(Locale.ROOT)
        if (ssid.isEmpty()) return false

        // Exclude networks with SSIDs that contain known router brand names.
        if (EXCLUSION_KEYWORDS.any { ssid.contains(it) }) {
            return false
        }

        // Check if any of the hotspot keywords are contained in the SSID.
        HOTSPOT_KEYWORDS.forEach { keyword ->
            if (ssid.contains(keyword)) {
                Timber.d("HotspotDetector: Detected mobile hotspot SSID: \"$ssid\" (matched keyword: \"$keyword\")")
                return true
            }
        }
        return false
    }
}