package com.sosmartlabs.momo.utils

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.core.net.toUri
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

/**
 * Opens turn-by-turn directions to a coordinate in whatever maps app the user has.
 *
 * Lifted out of `WatchCardAdapter` so the wearer card and DisconnectionActivity share one
 * implementation rather than growing a second copy of the fallback chain below.
 */
object DirectionsLauncher {

    fun open(context: Context, latitude: Double, longitude: Double, label: String) {
        // Locale.ROOT, not getDefault(): the geo: URI grammar requires ASCII digits and a
        // '.' separator. Patching only the separator (as this did before it was lifted out
        // of WatchCardAdapter) still leaves the DEVICE locale's zero digit, so an Arabic,
        // Persian or Bengali device emitted "geo:0,0?q=٤٠٫٧١٢٧٧٦..." — unparseable, and the
        // parent lands on a pin at 0,0. The app shipping only Latin-script locales does not
        // help: Locale.getDefault() is the device's, not the app's.
        val decimalFormat = DecimalFormat("0.000000", DecimalFormatSymbols(Locale.ROOT))
        val formattedLatitude = decimalFormat.format(latitude)
        val formattedLongitude = decimalFormat.format(longitude)
        val geoLocation = context.getString(
            R.string.uri_get_directions, formattedLatitude, formattedLongitude, label
        ).toUri()

        // startActivity resolves implicit intents system-side and is exempt from
        // package-visibility filtering, so the geo: intent reaches ANY installed maps
        // app — unlike the old resolveActivity gate, which only saw Google Maps (via
        // play-services-maps' merged <queries> entry) and whose else-branch intent,
        // hard-pinned to the Maps package, crashed with ActivityNotFoundException
        // whenever Maps was uninstalled or disabled. Try geo: first (today's behavior
        // for everyone with a maps app), then the Maps website, then a toast.
        val candidates = listOf(
            Intent(Intent.ACTION_VIEW, geoLocation),
            Intent(
                Intent.ACTION_VIEW,
                "https://www.google.com/maps/dir/?api=1&destination=$formattedLatitude,$formattedLongitude".toUri()
            )
        )

        var lastError: ActivityNotFoundException? = null
        for (mapIntent in candidates) {
            try {
                context.startActivity(mapIntent)
                return
            } catch (e: ActivityNotFoundException) {
                lastError = e
                Timber.w(e, "DirectionsLauncher: no activity to handle directions intent ${mapIntent.data?.scheme}")
            }
        }
        lastError?.let {
            CrashlyticsLog.recordNonFatalError(it, "DirectionsLauncher: no app available to open directions")
        }
        Toast.makeText(context, R.string.toast_error_opening_url, Toast.LENGTH_LONG).show()
    }
}
