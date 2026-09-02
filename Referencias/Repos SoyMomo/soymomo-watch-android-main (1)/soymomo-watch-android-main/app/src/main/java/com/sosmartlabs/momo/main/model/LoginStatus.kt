package com.sosmartlabs.momo.main.model

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
     * The last user was successfully logged out
     */
    LOGGED_OUT,

    /**
     * Occurred an error on logging out the current user
     */
    LOGOUT_ERROR
}