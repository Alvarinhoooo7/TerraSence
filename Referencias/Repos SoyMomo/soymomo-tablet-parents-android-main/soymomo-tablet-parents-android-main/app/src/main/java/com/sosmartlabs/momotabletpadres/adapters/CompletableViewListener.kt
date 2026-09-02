package com.sosmartlabs.momotabletpadres.adapters

/**
 * Interface for each ViewListener in the UI for handling Completable processes.
 * It is the interface between the UI and the Controller.
 */
interface CompletableViewListener {
    /**
     * Show the loading viewListener.
     */
    fun showLoading()

    /**
     * Hide the loading viewListener.
     */
    fun hideLoading()

    /**
     * Show the error message
     */
    fun showErrorMessage(message:String)

    /**
     * Show the retry viewListener.
     */
    fun showRetry()

    /**
     * Hide the retry viewListener.
     */
    fun hideRetry()

    /**
     * Show the data viewListener.
     */
    fun showComplete()
}