package com.sosmartlabs.momo.main.ui.map

/**
 * Result of attempting to focus a wearer from the watch carousel.
 */
data class FocusWearerResult(
    val watchFound: Boolean,
    val watchSelected: Boolean,
    val watchMappable: Boolean
)
