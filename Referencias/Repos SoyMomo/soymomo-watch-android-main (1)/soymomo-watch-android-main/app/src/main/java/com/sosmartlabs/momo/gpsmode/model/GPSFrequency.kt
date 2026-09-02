package com.sosmartlabs.momo.gpsmode.model

enum class GPSFrequency(val minutes: Int, val seconds: Int) {
    ONE_MINUTE(1, 1 * 60),
    THREE_MINUTES(3, 3 * 60),
    FIVE_MINUTES(5, 5 * 60),
    TEN_MINUTES(10, 10 * 60),
    THIRTY_MINUTES(30, 30 * 60),
    ONE_HOUR(60, 60 * 60);

    companion object {
        fun fromSeconds(seconds: Int): GPSFrequency {
            return values().find { it.seconds == seconds } ?: ONE_MINUTE
        }
    }
}