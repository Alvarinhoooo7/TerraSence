package com.sosmartlabs.momo.utils.support

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.sosmartlabs.momo.utils.CountryProvider
import timber.log.Timber
import java.util.*
import androidx.core.net.toUri

/**
 * Helper object for launch Zendesk support
 */
object ZendeskSupportLauncher {

    /**
     * Launches support in Zendesk
     * @param context Context for launch Zendesk
     */
    fun launchZendeskSupportLauncher(context: Context) {
        val url = when (CountryProvider.getCountry(context)) {
            "CL" -> "https://soymomo.zendesk.com/hc/es"
            "US" -> "https://soymomousa.zendesk.com/hc/en-us"
            "ES" -> "https://soymomoes.zendesk.com/hc/es"
            "DE" -> "https://soymomode.zendesk.com/hc/de-de"
            else -> "https://soymomo.zendesk.com/hc/es"
        }
        val i = Intent(Intent.ACTION_VIEW)
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        i.data = url.toUri()
        try {
            context.startActivity(i)
        } catch (e: Exception) {
            Timber.e(e, "ZendeskSupportLauncher: No activity found to handle Zendesk URL")
        }
    }
}