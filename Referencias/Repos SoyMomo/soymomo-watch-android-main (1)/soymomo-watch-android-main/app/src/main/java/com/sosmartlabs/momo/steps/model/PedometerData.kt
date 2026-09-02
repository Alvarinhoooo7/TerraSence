package com.sosmartlabs.momo.steps.model

import java.util.Date

/**
 * Unified data model for pedometer data from different watch models.
 * Maps data from both Pedometer and PedometerSteps classes.
 */
data class PedometerData(
    val date: Date,
    val steps: Float,
    val source: DataSource
) {
    enum class DataSource {
        LEGACY_PEDOMETER,
        NEWER_PEDOMETER_STEPS
    }
}