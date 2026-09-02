package com.sosmartlabs.momo.videocall.soymomowebrtc.utils

import android.annotation.SuppressLint
import android.content.Context
import android.hardware.Camera
import android.hardware.Camera.CameraInfo
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import org.webrtc.Camera1Enumerator
import org.webrtc.Camera2Enumerator
import org.webrtc.CameraEnumerator
import timber.log.Timber

class CameraUtils {

    companion object {
        private const val CAMERA_TYPE_FRONT = 1
        private const val CAMERA_TYPE_REAR = 2
        private const val CAMERA_TYPE_UNDEFINED = -1

        /**
         * Checks if the Camera2 API is supported.
         *
         * @param context the context
         * @return true if the Camera2 API is supported
         */
        fun useCamera2(context: Context): Boolean {
            val supported = Camera2Enumerator.isSupported(context)
            Timber.d("CameraUtils: useCamera2() - Camera2 API supported: $supported")
            return supported
        }

        /**
         * Gets a camera enumerator for the device.
         *
         * @param context the context
         * @return the camera enumerator
         */
        fun getCameraEnumerator(context: Context): CameraEnumerator? {
            val useCamera2 = useCamera2(context)
            Timber.d("CameraUtils: getCameraEnumerator() - Using Camera2: $useCamera2")
            return try {
                if (useCamera2) {
                    Camera2Enumerator(context)
                } else {
                    Camera1Enumerator(false)
                }
            } catch (e: Exception) {
                Timber.e("CameraUtils: getCameraEnumerator() - Failed to get enumerator: $e")
                CrashlyticsLog.recordNonFatalError(e, "CameraUtils: getCameraEnumerator() failed")
                null
            }
        }

        /**
         * Checks if camera switching is supported (i.e., more than one camera available).
         *
         * @param context the context
         * @return true if camera switch can work
         */
        fun isSwitchCameraSupported(context: Context): Boolean {
            Timber.d("CameraUtils: isSwitchCameraSupported() - Checking if camera switch is supported")
            val enumerator = getCameraEnumerator(context)
            if (enumerator == null) {
                Timber.e("CameraUtils: isSwitchCameraSupported() - CameraEnumerator is null")
                CrashlyticsLog.log("CameraUtils: isSwitchCameraSupported() - CameraEnumerator is null")
                return false
            }
            val deviceNames = enumerator.deviceNames
            val supported = deviceNames.isNotEmpty() && deviceNames.size > 1
            Timber.d("CameraUtils: isSwitchCameraSupported() - Device names: ${deviceNames.joinToString()} Supported: $supported")
            return supported
        }

        /**
         * Checks if the specified camera is currently in use by another app.
         * Prevents crashes at org.webrtc.Camera1Session.create(Camera1Session.java:80)
         * when the front camera is not available.
         *
         * @param context    the context
         * @param isFrontOne true if the camera is the front camera
         * @return true if the camera is used.
         */
        @SuppressLint("Deprecation")
        fun isCameraInUse(context: Context, isFrontOne: Boolean): Boolean {
            Timber.d("CameraUtils: isCameraInUse() - Checking if camera is in use. isFrontOne=$isFrontOne")
            var isUsed = false
            if (!useCamera2(context)) {
                var cameraId = -1
                val numberOfCameras = Camera.getNumberOfCameras()
                Timber.d("CameraUtils: isCameraInUse() - Number of cameras: $numberOfCameras")
                for (i in 0 until numberOfCameras) {
                    val info = CameraInfo()
                    Camera.getCameraInfo(i, info)
                    if (info.facing == CameraInfo.CAMERA_FACING_FRONT && isFrontOne) {
                        cameraId = i
                        break
                    } else if (info.facing == CameraInfo.CAMERA_FACING_BACK && !isFrontOne) {
                        cameraId = i
                        break
                    }
                }
                Timber.d("CameraUtils: isCameraInUse() - Selected cameraId: $cameraId")
                if (cameraId >= 0) {
                    var c: Camera? = null
                    try {
                        c = Camera.open(cameraId)
                        Timber.d("CameraUtils: isCameraInUse() - Camera $cameraId opened successfully")
                    } catch (e: Exception) {
                        Timber.e("CameraUtils: isCameraInUse() - Failed to open camera $cameraId: $e")
                        CrashlyticsLog.recordNonFatalError(e, "CameraUtils: isCameraInUse() - Failed to open camera $cameraId")
                    } finally {
                        isUsed = (c == null)
                        if (c != null) {
                            c.release()
                            Timber.d("CameraUtils: isCameraInUse() - Camera $cameraId released")
                        }
                    }
                } else {
                    Timber.e("CameraUtils: isCameraInUse() - No suitable cameraId found for isFrontOne=$isFrontOne")
                    CrashlyticsLog.log("CameraUtils: isCameraInUse() - No suitable cameraId found for isFrontOne=$isFrontOne")
                }
            } else {
                Timber.d("CameraUtils: isCameraInUse() - Camera2 API in use, skipping Camera1 check")
            }
            Timber.d("CameraUtils: isCameraInUse() - isUsed=$isUsed")
            return isUsed
        }

        /**
         * Checks if the device has at least one available camera device.
         *
         * @return true if the device has a camera device
         */
        fun hasCameraDevice(context: Context): Boolean {
            Timber.d("CameraUtils: hasCameraDevice() - Checking for available camera devices")
            val enumerator = getCameraEnumerator(context)
            if (enumerator == null) {
                Timber.e("CameraUtils: hasCameraDevice() - CameraEnumerator is null")
                CrashlyticsLog.log("CameraUtils: hasCameraDevice() - CameraEnumerator is null")
                return false
            }
            val deviceNames = enumerator.deviceNames
            Timber.d("CameraUtils: hasCameraDevice() - Device names: ${deviceNames.joinToString()}")
            var frontCameraName: String? = null
            var backCameraName: String? = null
            for (deviceName in deviceNames) {
                try {
                    if (enumerator.isFrontFacing(deviceName) && !isCameraInUse(context, true)) {
                        frontCameraName = deviceName
                        Timber.d("CameraUtils: hasCameraDevice() - Found available front camera: $deviceName")
                    } else if (enumerator.isBackFacing(deviceName) && !isCameraInUse(context, false)) {
                        backCameraName = deviceName
                        Timber.d("CameraUtils: hasCameraDevice() - Found available back camera: $deviceName")
                    }
                } catch (e: Exception) {
                    Timber.e("CameraUtils: hasCameraDevice() - Error checking camera $deviceName: $e")
                    CrashlyticsLog.recordNonFatalError(e, "CameraUtils: hasCameraDevice() - Error checking camera $deviceName")
                }
            }
            val cameraCount = deviceNames.size
            Timber.d("CameraUtils: hasCameraDevice() - Camera count: $cameraCount")
            Timber.d("CameraUtils: hasCameraDevice() - frontCameraName=$frontCameraName, backCameraName=$backCameraName")
            val hasCamera = (frontCameraName != null || backCameraName != null)
            if (!hasCamera) {
                Timber.e("CameraUtils: hasCameraDevice() - No available camera found")
                CrashlyticsLog.log("CameraUtils: hasCameraDevice() - No available camera found")
            }
            return hasCamera
        }
    }
}