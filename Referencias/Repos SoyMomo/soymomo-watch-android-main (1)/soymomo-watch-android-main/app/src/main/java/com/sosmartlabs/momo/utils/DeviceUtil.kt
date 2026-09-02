package com.sosmartlabs.momo.utils

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import timber.log.Timber


class DeviceUtil {

    companion object {

        private fun isRunningOnEmulator(): Boolean {
            var result = (Build.FINGERPRINT.startsWith("generic")
                    || Build.FINGERPRINT.startsWith("unknown")
                    || Build.MODEL.contains("google_sdk")
                    || Build.MODEL.contains("Emulator")
                    || Build.MODEL.contains("Android SDK built for x86")
                    || Build.MANUFACTURER.contains("Genymotion"))
            if (result)
                return true
            result = result or (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
            if (result)
                return true
            result = result or ("google_sdk" == Build.PRODUCT)
            return result
        }

        /** Helper method for building a string of thread information. */
        fun getThreadInfo(): String? {
            return ("@[name=" + Thread.currentThread().name + ", id=" + Thread.currentThread().id + "]")
        }

        /** Information about the current build, taken from system properties.  */
        @SuppressLint("BinaryOperationInTimber")
        fun logDeviceInfo(tag: String?) {
            Timber.d(
                    "Android SDK: " + Build.VERSION.SDK_INT + ", "
                            + "Release: " + Build.VERSION.RELEASE + ", "
                            + "Brand: " + Build.BRAND + ", "
                            + "Device: " + Build.DEVICE + ", "
                            + "Id: " + Build.ID + ", "
                            + "Hardware: " + Build.HARDWARE + ", "
                            + "Manufacturer: " + Build.MANUFACTURER + ", "
                            + "Model: " + Build.MODEL + ", "
                            + "Product: " + Build.PRODUCT
            )
        }

        fun isTimeAutomatic(c: Context): Boolean {
            return Settings.Global.getInt(c.contentResolver, Settings.Global.AUTO_TIME, 0) == 1
        }

        private fun isPackageInstalled(context: Context, packageName: String): Boolean {
            return try {
                val pm: PackageManager = context.packageManager
                pm.getPackageInfo(packageName, 0)
                true
            } catch (e: PackageManager.NameNotFoundException) {
                false
            }
        }
    }

}