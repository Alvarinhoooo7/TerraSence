package com.sosmartlabs.momotabletpadres.utils.support

import android.content.Context
import android.content.Intent
import androidx.core.net.toUri
import timber.log.Timber

/**
 * Helper object for launch Privacy Policy page
 */
object PrivacyPolicyLauncher {

    /**
     * Launches Privacy Policy page
     * @param context Context for launch Privacy Policy page
     */
    fun launchPrivacyPolicyLauncher(context: Context) {
        val url = "https://soymomo.com/privacy-policy"
        val i = Intent(Intent.ACTION_VIEW)
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        i.data = url.toUri()
        try {
            context.startActivity(i)
        } catch (e: Exception) {
            Timber.e(e, "PrivacyPolicyLauncher: No activity found to handle privacy policy URL")
        }
    }
}