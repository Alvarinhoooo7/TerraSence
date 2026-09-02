package com.sosmartlabs.momotabletpadres.utils

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import timber.log.Timber

class EdgeToEdgeUtils {

    companion object {

        @SuppressLint("InternalInsetResource")
        fun hasButtonNavigation(context: Context): Boolean {
            return try {
                val resources = context.resources
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    // For Android 10+, check the navigation mode
                    val resourceId = resources.getIdentifier("config_navBarInteractionMode", "integer", "android")
                    if (resourceId > 0) {
                        val navBarInteractionMode = resources.getInteger(resourceId)
                        // 0 = 3-button navigation, 1 = 2-button navigation, 2 = gesture navigation
                        navBarInteractionMode < 2
                    } else {
                        // Fallback: check if navigation bar height is significant
                        val resourceId = resources.getIdentifier("navigation_bar_height", "dimen", "android")
                        return if (resourceId > 0) {
                            val navBarHeight = resources.getDimensionPixelSize(resourceId)
                            val density = resources.displayMetrics.density
                            val navBarHeightDp = navBarHeight / density
                            // If navigation bar is taller than 24dp, likely button navigation
                            navBarHeightDp > 24
                        } else {
                            false
                        }
                    }
                } else {
                    // For older versions, assume button navigation
                    true
                }
            } catch (e: Exception) {
                // If any error occurs, default to button navigation for safety
                Timber.w("EdgeToEdgeUtils: Error checking navigation mode, defaulting to button navigation $e")
                true
            }
        }

    }

}