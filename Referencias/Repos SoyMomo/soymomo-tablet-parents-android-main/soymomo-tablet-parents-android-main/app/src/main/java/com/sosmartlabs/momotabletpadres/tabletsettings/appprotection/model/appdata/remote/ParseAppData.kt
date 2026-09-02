package com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.remote

import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.utils.ParseFileDownloader
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber

/**
 * Represents an element from InstalledApp collection on Parse database.
 */
@ParseClassName("AppData")
class ParseAppData : ParseObject() {
    var packageName by ParseDelegate<String>(null)
    var title by ParseDelegate<String>(null)
    var contentRating by ParseDelegate<String>(null)
    var llmDescription by ParseDelegate<HashMap<String, String>>(null)
    var potentialDangers by ParseDelegate<HashMap<String, String>>(null)
    var icon by ParseDelegate<ParseFile>(null)
}

/**
 * Asynchronously fetches and returns the icon as a Drawable.
 */
suspend fun ParseAppData.getIconDrawable(context: Context): Drawable? = withContext(Dispatchers.IO) {
    Timber.d("ParseAppData: getIconDrawable - Start for packageName=$packageName")
    val iconFile = icon
    if (iconFile == null) {
        Timber.w("ParseAppData: getIconDrawable - No icon ParseFile for app: $packageName")
        return@withContext null
    }
    Timber.v("ParseAppData: getIconDrawable - Fetching icon data for app: $packageName")
    return@withContext try {
        // Download by URL off Bolts BACKGROUND_EXECUTOR — NOT the blocking iconFile.data
        // (ParseFile.getData()), which pins a CPU+1-sized Bolts thread per icon and can
        // freeze all Parse query delivery app-wide. See [ParseFileDownloader].
        val url = iconFile.url
        val data = if (url.isNullOrEmpty()) null else ParseFileDownloader.download(url)
        if (data == null) {
            Timber.w("ParseAppData: getIconDrawable - Icon data is null for app: $packageName")
            null
        } else {
            Timber.v("ParseAppData: getIconDrawable - Decoding bitmap for app: $packageName, data size: ${data.size}")
            val bitmap = BitmapFactory.decodeByteArray(data, 0, data.size)
            if (bitmap == null) {
                Timber.e("ParseAppData: getIconDrawable - BitmapFactory.decodeByteArray returned null for app: $packageName")
                CrashlyticsLog.log("ParseAppData: BitmapFactory.decodeByteArray returned null for $packageName")
                null
            } else {
                Timber.d("ParseAppData: getIconDrawable - Successfully decoded bitmap for app: $packageName")
                BitmapDrawable(context.resources, bitmap)
            }
        }
    } catch (e: Exception) {
        Timber.e(e, "ParseAppData: getIconDrawable - Error fetching or decoding icon for app: $packageName")
        CrashlyticsLog.recordNonFatalError(e, "ParseAppData: Exception in getIconDrawable for $packageName")
        null
    }
}

/**
 * Asynchronously fetches and returns the icon URL as a String.
 */
suspend fun ParseAppData.getIconUrl(): String? = withContext(Dispatchers.IO) {
    Timber.d("ParseAppData: getIconUrl - Start for packageName=$packageName")
    val iconFile = icon
    if (iconFile == null) {
        Timber.w("ParseAppData: getIconUrl - No icon ParseFile for app: $packageName")
        return@withContext null
    }
    val url = iconFile.url
    if (url == null) {
        Timber.w("ParseAppData: getIconUrl - Icon URL is null for app: $packageName")
    } else {
        Timber.d("ParseAppData: getIconUrl - Successfully fetched icon URL for app: $packageName: $url")
    }
    url
}
