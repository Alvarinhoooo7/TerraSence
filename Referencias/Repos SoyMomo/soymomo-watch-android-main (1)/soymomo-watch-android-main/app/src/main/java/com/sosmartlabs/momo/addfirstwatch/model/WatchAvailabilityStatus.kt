package com.sosmartlabs.momo.addfirstwatch.model

enum class WatchAvailabilityStatus {
    // Success states
    SUCCESS,
    SUCCESS_WITH_SIM_PRE_INSERTED,
    SUCCESS_WATCH_BELONGS_TO_OTHER_USER,

    // In progress states
    SEARCH_IN_PROGRESS,

    // IMEI validation errors
    IMEI_INVALID,
    IMEI_LENGTH_ERROR,
    IMEI_UNKNOWN,

    // Watch availability errors
    WATCH_ALREADY_LINKED,
    WATCH_ALREADY_LINKED_MISSING_PRE_INSERTED_SIM_ACTIVATION,
    WATCH_NOT_FOUND,

    // Other errors
    SEARCH_ERROR,
    INTERNAL_ERROR,
}