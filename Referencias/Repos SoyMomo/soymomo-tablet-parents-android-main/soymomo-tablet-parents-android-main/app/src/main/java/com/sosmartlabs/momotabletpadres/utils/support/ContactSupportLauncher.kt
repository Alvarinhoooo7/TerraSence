package com.sosmartlabs.momotabletpadres.utils.support

import android.content.Context
import android.content.Intent
import androidx.core.net.toUri
import timber.log.Timber

/**
 * Helper object for launch Contact support email
 */
object ContactSupportLauncher {

    /**
     * Launches email to Contact support
     * @param context Context for launch email to Contact support
     */
    fun launchContactSupportLauncher(context: Context) {
        val url = "https://soymomo.com/support/email"
        val intent = Intent(Intent.ACTION_VIEW).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        intent.data = url.toUri()
        try {
            context.startActivity(intent)
        } catch (e: Exception) {
            Timber.e(e, "ContactSupportLauncher: No activity found to handle contact support URL")
        }
    }
}