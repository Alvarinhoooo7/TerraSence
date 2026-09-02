package com.sosmartlabs.momotabletpadres.glide

import com.bumptech.glide.Priority
import com.bumptech.glide.load.DataSource
import com.bumptech.glide.load.data.DataFetcher
import com.sosmartlabs.momotabletpadres.encryption.EncryptionHelper
import com.sosmartlabs.momotabletpadres.utils.ParseFileDownloader
import kotlinx.coroutines.runBlocking
import okhttp3.Call
import timber.log.Timber
import java.io.ByteArrayInputStream
import java.io.InputStream

/**
 * Glide DataFetcher that downloads encrypted ParseFile data and decrypts it.
 *
 * This fetcher:
 * 1. Downloads the encrypted bytes from the file's URL (NOT ParseFile.getData())
 * 2. Decrypts using EncryptionHelper (with auto-refresh on key mismatch)
 * 3. Returns an InputStream of the decrypted image data for Glide to decode
 *
 * IMPORTANT: download by URL via [ParseFileDownloader], never `model.parseFile.data`.
 * The blocking ParseFile.getData() runs the download on Bolts' Task.BACKGROUND_EXECUTOR
 * (only CPU+1 threads), the same pool that delivers every Parse query's result. These
 * encrypted images render in RecyclerView grids (screenshots/detections/avatars), so a
 * cold-cache device-detail page fires many concurrent loads at once — pinning that pool
 * froze the whole app on low-core devices until force-close. OkHttp keeps it off Bolts.
 */
class EncryptedParseFileDataFetcher(
    private val model: EncryptedParseFile,
    private val encryptionHelper: EncryptionHelper
) : DataFetcher<InputStream> {

    @Volatile
    private var isCancelled = false

    @Volatile
    private var call: Call? = null

    override fun loadData(priority: Priority, callback: DataFetcher.DataCallback<in InputStream>) {
        if (isCancelled) {
            callback.onLoadFailed(Exception("Request cancelled"))
            return
        }

        try {
            // Download encrypted bytes BY URL (off Bolts BACKGROUND_EXECUTOR).
            val url = model.parseFile.url
            if (url.isNullOrEmpty()) {
                Timber.w("EncryptedParseFileDataFetcher: encrypted file has no URL")
                callback.onLoadFailed(Exception("Encrypted file has no URL"))
                return
            }
            val encryptedBytes = ParseFileDownloader.newCall(url).also { call = it }.execute().use { resp ->
                if (resp.isSuccessful) resp.body.bytes() else null
            }
            if (encryptedBytes == null) {
                Timber.w("EncryptedParseFileDataFetcher: Failed to download encrypted file")
                callback.onLoadFailed(Exception("Failed to download encrypted file"))
                return
            }

            if (isCancelled) {
                callback.onLoadFailed(Exception("Request cancelled"))
                return
            }

            // Decrypt using EncryptionHelper with auto-refresh support
            // runBlocking is acceptable here since DataFetcher runs on Glide's background thread
            val decryptedBytes = runBlocking {
                encryptionHelper.decryptBytesWithAutoRefresh(encryptedBytes, model.metadata)
            }

            if (decryptedBytes == null) {
                Timber.w("EncryptedParseFileDataFetcher: Decryption failed for cacheKey=${model.cacheKey}")
                callback.onLoadFailed(Exception("Decryption failed"))
                return
            }

            if (isCancelled) {
                callback.onLoadFailed(Exception("Request cancelled"))
                return
            }

            // Return decrypted bytes as InputStream for Glide's decoders
            callback.onDataReady(ByteArrayInputStream(decryptedBytes))

        } catch (e: Exception) {
            Timber.e(e, "EncryptedParseFileDataFetcher: Error loading encrypted file")
            callback.onLoadFailed(e)
        }
    }

    override fun cleanup() {
        // No resources to cleanup - ByteArrayInputStream doesn't hold external resources
    }

    override fun cancel() {
        isCancelled = true
        call?.cancel()
    }

    override fun getDataClass(): Class<InputStream> = InputStream::class.java

    override fun getDataSource(): DataSource = DataSource.REMOTE
}
