package com.sosmartlabs.momo.utils.support

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.net.toUri
import timber.log.Timber

/**
 * Helper object for launch Terms and Conditions page
 */
object TermsAndConditionsLauncher {

    /**
     * Launches Terms and Conditions page
     * @param context Context for launch Terms and Conditions page
     */
    fun launchTermsAndConditionsLauncher(context: Context) {
        val url = "https://soymomo.com/terms-and-conditions"
        val i = Intent(Intent.ACTION_VIEW)
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        i.data = url.toUri()
        try {
            context.startActivity(i)
        } catch (e: Exception) {
            Timber.e(e, "TermsAndConditionsLauncher: No activity found to handle T&C URL")
        }
    }
}