package com.sosmartlabs.momo.myfriends.ui

/**
 * Enum for differentiate deleting operations for [com.sosmartlabs.momo.myfriends.model.WatchWearer]
 */
enum class WatchWearerDeleteType {
    /**
     * Indicates that a pending request is been rejected
     */
    REJECTING_REQUEST,

    /**
     * Indicates than a accepted request is been deleted
     */
    DELETE_ACCEPTED_REQUEST
}