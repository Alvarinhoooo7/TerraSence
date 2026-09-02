package com.sosmartlabs.momo.utils.support

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.utils.CountryProvider
import timber.log.Timber
import java.net.URLEncoder
import java.util.*
import androidx.core.net.toUri

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