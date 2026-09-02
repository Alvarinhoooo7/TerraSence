package com.sosmartlabs.momo.chat.data.media

import android.content.Context
import android.media.MediaMetadataRetriever
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import javax.inject.Inject
import timber.log.Timber
import java.io.File
import java.io.FileOutputStream
import java.net.URL

/**
 * Class for obtaining audio metadata from URLs, with support for both direct streaming and downloading.
 */
class AudioMetadataRetriever @Inject constructor(@ApplicationContext private val context: Context) {

    private val mutex = Mutex()

    /**
     * Gets the metadata of an audio file including duration, bitrate, mime type etc.
     * Attempts to stream the audio file directly without downloading.
     *
     * @param audioUrl URL for the audio
     * @return Duration in millis of the audio file. Returns null if data can't be retrieved.
     */
    suspend fun getAudioDuration(audioUrl: String): Long? {
        Timber.i("AudioMetadataRetriever: getAudioDuration() - Start for URL: $audioUrl")
        var duration: Long? = null

        mutex.withLock {
            Timber.v("AudioMetadataRetriever: getAudioDuration() - Acquired mutex lock for audio metadata retrieval")
            val retriever = MediaMetadataRetriever()
            try {
                Timber.v("AudioMetadataRetriever: getAudioDuration() - Setting data source for URL: $audioUrl")
                retriever.setDataSource(audioUrl, HashMap<String, String>())
                Timber.v("AudioMetadataRetriever: getAudioDuration() - Successfully set data source, extracting metadata")

                val rawDuration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                // Keep the unknown-duration default instead of throwing when the value is not a
                // number: callers treat null as "not backfilled yet" and the bubble shows no timer.
                duration = rawDuration?.toLongOrNull()
                if (rawDuration != null && duration == null) {
                    Timber.e("AudioMetadataRetriever: getAudioDuration() - Malformed duration metadata \"$rawDuration\" for URL: $audioUrl")
                    CrashlyticsLog.log("AudioMetadataRetriever: Malformed duration metadata \"$rawDuration\" for $audioUrl")
                }

                val metadata = mapOf(
                    "Duration" to duration,
                    "Bitrate" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE),
                    "Mime Type" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_MIMETYPE),
                    "Title" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE),
                    "Artist" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST),
                    "Album" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM),
                    "Year" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_YEAR),
                    "Composer" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_COMPOSER)
                )
                Timber.d(
                    "AudioMetadataRetriever: getAudioDuration() - Retrieved metadata:\n" +
                        metadata.entries.joinToString("\n") { "${it.key}: ${it.value}" }
                )
            } catch (e: Exception) {
                // Covers the whole read, not just setDataSource: extractMetadata throws on a
                // retriever the native layer left in a bad state.
                Timber.e(e, "AudioMetadataRetriever: getAudioDuration() - Failed to retrieve metadata for URL: $audioUrl")
                CrashlyticsLog.recordNonFatalError(e, "AudioMetadataRetriever: Error retrieving metadata for $audioUrl")
                return null
            } finally {
                runCatching { retriever.release() }
            }
        }

        if (duration == null) {
            Timber.e("AudioMetadataRetriever: getAudioDuration() - Failed to retrieve audio duration for URL: $audioUrl")
            CrashlyticsLog.recordNonFatalError(
                NullPointerException("AudioMetadataRetriever: Duration is null"),
                "AudioMetadataRetriever: Couldn't retrieve audio duration for audio file $audioUrl"
            )
        } else {
            Timber.i("AudioMetadataRetriever: getAudioDuration() - Successfully retrieved duration: $duration ms for URL: $audioUrl")
        }
        return duration
    }

    /**
     * Retrieves the duration of the audio file by first downloading it locally.
     * Use this as a fallback when streaming fails.
     *
     * @param audioUrl URL of the audio file
     * @return Duration in milliseconds or null if retrieval fails
     */
    suspend fun getAudioDurationWithDownload(audioUrl: String): Long? {
        Timber.i("AudioMetadataRetriever: getAudioDurationWithDownload() - Start for URL: $audioUrl")
        val audioFile = downloadAudioFile(audioUrl)
        if (audioFile == null) {
            Timber.e("AudioMetadataRetriever: getAudioDurationWithDownload() - Failed to download audio file from $audioUrl")
            CrashlyticsLog.recordNonFatalError(
                NullPointerException("AudioMetadataRetriever: Downloaded file is null"),
                "AudioMetadataRetriever: Failed to download audio file from $audioUrl"
            )
            return null
        }
        return try {
            getAudioDurationFromFile(audioFile.absolutePath)
        } finally {
            // A throw here would mask whatever the try block was returning or throwing.
            val deleted = runCatching { audioFile.delete() }.getOrDefault(false)
            if (deleted) {
                Timber.d("AudioMetadataRetriever: getAudioDurationWithDownload() - Temporary file deleted: ${audioFile.absolutePath}")
            } else {
                Timber.w("AudioMetadataRetriever: getAudioDurationWithDownload() - Failed to delete temporary file: ${audioFile.absolutePath}")
                CrashlyticsLog.log("AudioMetadataRetriever: Failed to delete temporary audio file: ${audioFile.absolutePath}")
            }
        }
    }

    suspend fun getAudioDurationFromFile(filePath: String): Long? {
        val retriever = MediaMetadataRetriever()
        try {
            Timber.v("AudioMetadataRetriever: getAudioDurationFromFile() - Setting data source to local file: $filePath")
            retriever.setDataSource(filePath)
            val duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
            Timber.i("AudioMetadataRetriever: getAudioDurationFromFile() - Retrieved duration: $duration ms from file: $filePath")
            if (duration == null) {
                Timber.e("AudioMetadataRetriever: getAudioDurationFromFile() - Duration is null for file: $filePath")
                CrashlyticsLog.recordNonFatalError(
                    NullPointerException("AudioMetadataRetriever: Duration is null after local file read"),
                    "AudioMetadataRetriever: Couldn't retrieve audio duration from local file $filePath"
                )
            }
            return duration
        } catch (e: Exception) {
            Timber.e(e, "AudioMetadataRetriever: getAudioDurationFromFile() - Failed to extract metadata from $filePath")
            CrashlyticsLog.recordNonFatalError(
                e,
                "AudioMetadataRetriever: Error extracting metadata from local file $filePath"
            )
            return null
        } finally {
            runCatching { retriever.release() }
        }
    }

    /**
     * Downloads the audio file from the given URL and saves it locally.
     *
     * @param audioUrl URL of the audio file
     * @return The local file reference or null if the download fails
     */
    private suspend fun downloadAudioFile(audioUrl: String): File? = withContext(Dispatchers.IO) {
        Timber.i("AudioMetadataRetriever: downloadAudioFile() - Start downloading from $audioUrl")
        var tempFile: File? = null
        return@withContext try {
            val url = URL(audioUrl)
            val connection = url.openConnection()
            connection.connect()
            // Unique per download: concurrent backfills would otherwise interleave into a
            // single shared file and produce wrong durations (or delete each other's file).
            tempFile = File(context.cacheDir, "temp_audio_${System.nanoTime()}.mp3")
            Timber.v("AudioMetadataRetriever: downloadAudioFile() - Writing to temp file: ${tempFile.absolutePath}")
            connection.getInputStream().use { input ->
                FileOutputStream(tempFile).use { output ->
                    input.copyTo(output)
                }
            }
            Timber.i("AudioMetadataRetriever: downloadAudioFile() - Audio file downloaded successfully to ${tempFile.absolutePath}")
            tempFile
        } catch (e: Exception) {
            Timber.e(e, "AudioMetadataRetriever: downloadAudioFile() - Failed to download audio file from $audioUrl")
            CrashlyticsLog.recordNonFatalError(
                e,
                "AudioMetadataRetriever: Error downloading audio file from $audioUrl"
            )
            runCatching { tempFile?.delete() }
            null
        }
    }
}
