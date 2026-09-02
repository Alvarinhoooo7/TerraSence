package com.sosmartlabs.momotabletpadres.dispatch.model

/**
 * Enumerates the possible results for the Dispatch activity
 */
enum class DispatchResult {
    /**
     * The app is been opened for the first time.
     */
    OPEN_FIRST_TIME,

    /**
     * The app does not have a logged in user
     */
    USER_NULL,

    /**
     * The user logged in is new
     */
    NEW_USER,

    /**
     * Main activity must be initialized normally
     */
    START_MAIN,

    /**
     * The user session has expired
     */
    SESSION_EXPIRED,

    /**
     * A connection error has occurred
     */
    CONNECTION_ERROR,

    /**
     * An unexpected error has occurred
     */
    LOGIN_ERROR,

    /**
     * The app is running on a tablet SoyMomo
     */
    IS_TABLET
}