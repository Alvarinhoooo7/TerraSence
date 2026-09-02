package com.sosmartlabs.momo.utils.support

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.net.toUri
import timber.log.Timber

/**
 * Helper object for launch SoyMomo commerce page
 */
object StoreCommerceLauncher {

    /**
     * Launches SoyMomo commerce page
     * @param context Context for launch SoyMomo commerce page
     */
    fun launchStoreCommerceLauncher(context: Context) {
        val url = "https://soymomo.com"
        val i = Intent(Intent.ACTION_VIEW)
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        i.data = url.toUri()
        try {
            context.startActivity(i)
        } catch (e: Exception) {
            Timber.e(e, "StoreCommerceLauncher: No activity found to handle store URL")
        }
    }
}