package com.sosmartlabs.momotabletpadres.models

/**
 * Possible login status
 */
enum class LoginStatus {
    /**
     * Current user is logged in
     */
    LOGGED_IN,

    /**
     * Current user is been logged out
     */
    LOGGING_OUT,

    /**
     * Current user is forced to logout due to invalid session token
     */
    LOGGING_OUT_INVALID_TOKEN,

    /**
     * The last user was successfully logged out
     */
    LOGGED_OUT,

    /**
     * Occurred an error on logging out the current user
     */
    LOGOUT_ERROR
}