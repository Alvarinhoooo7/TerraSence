package com.sosmartlabs.momo.main.model

/**
 * Error types for WatchUser loading task
 */
enum class WatchUserError {
    /**
     * Indicates an error on connection with Parse.
     */
    CONNECTION_ERROR,

    /**
     * Indicates an error with the user session.
     */
    INVALID_SESSION,

    /**
     * Indicates an TIMEOUT error.
     */

    TIMEOUT,

    /**
     * Indicates an unknown error
     */
    UNKNOWN_ERROR


}