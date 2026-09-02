package com.sosmartlabs.momo.sim.util

import android.content.Context
import android.content.Intent
import android.util.Patterns
import androidx.core.net.toUri
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber

/**
 * Helper object for launching the subscription management portal URL.
 * Validates URLs and opens them in the default browser.
 */
object SubscriptionPortalLauncher {

    /**
     * Launches the subscription management portal URL in the default browser.
     *
     * @param context Context for launching the intent.
     * @param url The portal URL to open.
     * @return `true` if the URL was successfully launched, `false` otherwise.
     */
    fun launchPortalUrl(context: Context, url: String): Boolean {
        Timber.d("SubscriptionPortalLauncher: Attempting to launch portal URL")

        if (!isValidUrl(url)) {
            Timber.e("SubscriptionPortalLauncher: Invalid URL provided")
            CrashlyticsLog.log("SubscriptionPortalLauncher: Invalid portal URL")
            return false
        }

        return try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = url.toUri()
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            Timber.d("SubscriptionPortalLauncher: Successfully launched portal URL")
            true
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionPortalLauncher: Error launching portal URL")
            CrashlyticsLog.recordNonFatalError(e, "Error launching subscription portal URL")
            false
        }
    }

    /**
     * Validates that the provided string is a valid web URL.
     *
     * @param url The URL string to validate.
     * @return `true` if the URL is valid, `false` otherwise.
     */
    private fun isValidUrl(url: String): Boolean {
        return url.isNotBlank() && Patterns.WEB_URL.matcher(url).matches()
    }
}
