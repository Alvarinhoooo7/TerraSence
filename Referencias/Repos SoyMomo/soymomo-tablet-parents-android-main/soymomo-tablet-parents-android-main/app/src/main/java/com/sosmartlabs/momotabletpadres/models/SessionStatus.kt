package com.sosmartlabs.momotabletpadres.models

/**
 * Possible login status
 */
enum class SessionStatus {
    /**
     * Current user is logged in
     */
    LOGGED_IN,

    /**
     * Current user is been logged out
     */
    LOGGING_OUT,

    /**
     * The last user was successfully logged out
     */
    LOGGED_OUT,

    /**
     * Occurred an error on logging out the current user
     */
    LOGOUT_ERROR
}