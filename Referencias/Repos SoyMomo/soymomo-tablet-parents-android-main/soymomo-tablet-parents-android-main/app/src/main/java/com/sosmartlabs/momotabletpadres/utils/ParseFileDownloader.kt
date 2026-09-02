package com.sosmartlabs.momotabletpadres.utils

import com.sosmartlabs.momotabletpadres.utils.dns.IPv4PreferredDns
import com.sosmartlabs.momotabletpadres.utils.firebase.FirebaseRemoteConfigRepository
import okhttp3.Call
import okhttp3.OkHttpClient
import okhttp3.Request
import timber.log.Timber
import java.util.concurrent.TimeUnit

/**
 * Downloads ParseFile bytes BY URL using a dedicated OkHttp client.
 *
 * WHY THIS EXISTS — app-wide-hang root cause:
 * Parse's blocking [com.parse.ParseFile.getData] / getDataStream() runs the actual
 * download inside ParseFileController.fetchAsync on Bolts' Task.BACKGROUND_EXECUTOR,
 * a pool of only CPU+1 threads (3 on a 2-core device, 5 on 4-core, 9 on 8-core).
 * That SAME pool runs the JSON->ParseObject result-delivery continuation of EVERY
 * Parse query. A burst of file downloads (icon / screenshot / detection / avatar
 * grids on a device-detail page) pins all CPU+1 threads, so query responses arrive
 * on the wire but are never delivered — the whole app freezes until force-close on
 * low-core devices (never on the dev's 8-core phone). Fetching the file's public URL
 * with our own OkHttp client keeps these downloads entirely off Bolts.
 *
 * IPv4-preferred DNS + a hard callTimeout match the main Parse client so a stalled
 * IPv6 route or slow socket can't pin a download thread indefinitely either.
 */
object ParseFileDownloader {

    @Volatile
    private var cachedClient: OkHttpClient? = null

    // Built lazily (after RemoteConfig has been fetched in Application.onCreate) so the
    // IPv4-preferred DNS honours the SAME DISABLE_IPV4_PREFERRED_DNS kill-switch as the
    // main Parse client — otherwise flipping the flag would recover queries but not these
    // file downloads.
    val client: OkHttpClient
        get() = cachedClient ?: synchronized(this) {
            cachedClient ?: buildClient().also { cachedClient = it }
        }

    private fun buildClient(): OkHttpClient {
        val ipv4PreferredDisabled = runCatching {
            FirebaseRemoteConfigRepository.disableIpv4PreferredDns
        }.getOrDefault(false)
        return OkHttpClient.Builder()
            .apply { if (!ipv4PreferredDisabled) dns(IPv4PreferredDns()) }
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .callTimeout(45, TimeUnit.SECONDS)
            .build()
    }

    /** A cancellable GET call for [url]. The caller is responsible for executing/cancelling it. */
    fun newCall(url: String): Call = client.newCall(Request.Builder().url(url).get().build())

    /** Blocking GET of [url]'s bytes, off the Bolts pool. Returns null on failure. */
    fun download(url: String): ByteArray? = try {
        newCall(url).execute().use { response ->
            if (response.isSuccessful) {
                response.body.bytes()
            } else {
                Timber.w("ParseFileDownloader: HTTP ${response.code} downloading $url")
                null
            }
        }
    } catch (e: Exception) {
        Timber.e(e, "ParseFileDownloader: download failed for $url")
        null
    }
}
