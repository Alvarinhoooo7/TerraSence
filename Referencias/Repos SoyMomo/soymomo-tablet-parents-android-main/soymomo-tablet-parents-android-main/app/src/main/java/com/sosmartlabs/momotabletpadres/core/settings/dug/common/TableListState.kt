package com.sosmartlabs.momotabletpadres.core.settings.dug.common

/**
 * Enum with the different tablet list states
 */
enum class TableListState {
    /**
     * The list data is currently loading
     */
    Loading,

    /**
     * An error occurred while loading the list data
     */
    Error,

    /**
     * The list data is empty
     */
    Empty,

    /**
     * The list data is populated
     */
    Populated
}