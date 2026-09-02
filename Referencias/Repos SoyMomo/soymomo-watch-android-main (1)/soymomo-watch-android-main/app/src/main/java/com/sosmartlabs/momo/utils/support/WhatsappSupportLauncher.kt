package com.sosmartlabs.momo.utils.support

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.sosmartlabs.momo.utils.CountryProvider
import timber.log.Timber
import java.net.URLEncoder
import androidx.core.net.toUri

/**
 * Helper object for launch WhatsApp support contact
 */
object WhatsappSupportLauncher {

    /**
     * Launches support contact in WhatsApp
     * @param context Context for launch WhatsApp
     * @param text An optional string to send as preset for the WhatsApp message
     */
    fun launchWhatsappSupportContact(context: Context, text: String? = null) {
        var url = "https://soymomo.com/support/whatsapp"
        text?.let {
            val encodedText = URLEncoder.encode(it, "UTF-8")
            url += "?text=${encodedText}"
        }
        Timber.d(url)
        val i = Intent(Intent.ACTION_VIEW)
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        i.data = url.toUri()
        try {
            context.startActivity(i)
        } catch (e: Exception) {
            Timber.e(e, "WhatsappSupportLauncher: No activity found to handle WhatsApp support URL")
        }
    }

}