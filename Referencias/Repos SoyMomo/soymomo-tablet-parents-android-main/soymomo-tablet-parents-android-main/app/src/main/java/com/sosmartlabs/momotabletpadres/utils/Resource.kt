package com.sosmartlabs.momotabletpadres.utils

/**
 * Class for wrapping data and status
 * @param T Resource data type for been handled
 * @param U Specific error type (if any) for been handled
 * @param status Status for the data
 * @param data Data to be displayed
 * @param statusType Specific status type
 */
data class Resource<out T, U> (val status: Status, val data: T?, val statusType: U?) {

    /**
     * Constructor for no error type
     * @param status Status for the data
     * @param data Data to be displayed
     */
    constructor(status: Status, data: T? = null): this(status, data, null)

    /**
     * Status for been shown in the main view.
     */
    enum class Status {
        /**
         * Default status.
         */
        DEFAULT,

        /**
         * Load success status. Data has successfully fetched
         */
        LOAD_SUCCESS,

        /**
         * Load error status, something went wrong
         */
        LOAD_ERROR,

        /**
         * Loading status, data is been fetched
         */
        LOADING,

        /**
         * Adding new status, a new element is been added
         */
        ADDING,

        /**
         * Success in adding ew element
         */
        ADDING_SUCCESS,

        /**
         * Error adding new element
         */
        ADDING_ERROR,

        /**
         * Updating status, an element is been updated
         */
        UPDATING,

        /**
         * Success updating element
         */
        UPDATING_SUCCESS,

        /**
         * Error updating element
         */
        UPDATING_ERROR,

        /**
         * Deleting status, an element is been deleted
         */
        DELETING,

        /**
         * Success deleting element
         */
        DELETING_SUCCESS,

        /**
         * Error deleting element
         */
        DELETING_ERROR,

        /**
         * Unknown error
         */
        UNKNOWN_ERROR
    }
}