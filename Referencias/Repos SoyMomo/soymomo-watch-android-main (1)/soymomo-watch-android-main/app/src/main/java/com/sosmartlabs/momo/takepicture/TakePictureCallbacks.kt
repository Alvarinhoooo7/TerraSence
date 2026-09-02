package com.sosmartlabs.momo.takepicture

import android.Manifest

/**
 * Callbacks for been implemented by Take picture activities and fragments
 */
interface TakePictureCallbacks {

    /**
     * Checks whether the app has the [Manifest.permission.CAMERA] permission granted
     */
    val hasCameraPermission: Boolean

    /**
     * Launches the device camera for taking a picture.
     * If the request is successful, the function [onImageLoaded] will be called with the obtained
     * image path. If the request fails with an exception, the function [onTakingPictureError] will be called.
     */
    fun launchTakePicture()

    /**
     * Handles the error when the [launchTakePicture] function fails on obtaining an image from
     * device camera.
     *
     * The default implementation is no-op, so it should be override if required. Also, consider
     * that when this function is called, the error was already registered on Crashlytics as non-fatal.
     */
    fun onTakingPictureError(e: Throwable)

    /**
     * Launches an intent to obtaining a picture from device gallery.
     * If the request is successful, the function [onImageLoaded] will be called with the obtained
     * image.
     */
    fun launchSelectPictureFromGallery()

    /**
     * Function called when an image is loaded from device camera or from gallery.
     */
    fun onImageLoaded(path: String?)
}