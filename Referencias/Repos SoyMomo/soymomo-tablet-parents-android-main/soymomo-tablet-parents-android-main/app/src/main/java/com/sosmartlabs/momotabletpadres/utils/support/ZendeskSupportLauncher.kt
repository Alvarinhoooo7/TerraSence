package com.sosmartlabs.momotabletpadres.utils.support

import android.content.Context
import android.content.Intent
import com.sosmartlabs.momotabletpadres.utils.CountryProvider
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
        i.data = url.toUri()
        context.startActivity(i)
    }
}