package com.sosmartlabs.momotabletpadres.link.model

enum class LinkDeviceStatus {
    // Success states
    DEVICE_AVAILABLE,
    DEVICE_BELONGS_TO_OTHER_USER,
    DEVICE_LINK_SUCCESS,
    AWAITING_COLOR_SELECTION,
    READY_TO_LINK,

    // In progress states
    SEARCH_IN_PROGRESS,
    LINKING_IN_PROGRESS,

    // Device availability errors
    DEVICE_ALREADY_LINKED,

    // Other errors
    ERROR
}