package com.sosmartlabs.momo.chat.data.media

import android.content.Context
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.nio.ByteBuffer
import java.nio.ByteOrder
import javax.inject.Inject
import kotlin.math.abs
import kotlin.math.min

class AudioWaveformExtractor @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val mutex = Mutex()

    /**
     * Extracts waveform amplitudes from an audio URL.
     * Downloads the file first, then decodes to PCM to compute amplitude samples.
     *
     * @param audioUrl URL of the audio file
     * @param sampleCount Number of amplitude samples to produce (default 64, matching WhatsApp convention)
     * @return IntArray of amplitude values (0-127), or null on failure
     */
    suspend fun extractWaveform(audioUrl: String, sampleCount: Int = 64): IntArray? {
        Timber.i("AudioWaveformExtractor: extractWaveform() - Start for URL: $audioUrl")
        val audioFile = downloadAudioFile(audioUrl) ?: run {
            Timber.e("AudioWaveformExtractor: extractWaveform() - Failed to download audio from $audioUrl")
            return null
        }
        return try {
            extractWaveformFromFile(audioFile.absolutePath, sampleCount)
        } finally {
            val deleted = audioFile.delete()
            if (!deleted) {
                Timber.w("AudioWaveformExtractor: Failed to delete temp file: ${audioFile.absolutePath}")
            }
        }
    }

    /**
     * Extracts waveform amplitudes from a local audio file.
     * Useful for computing waveform at send time from the recorded file.
     *
     * @param filePath Absolute path to the local audio file
     * @param sampleCount Number of amplitude samples to produce
     * @return IntArray of amplitude values (0-127), or null on failure
     */
    suspend fun extractWaveformFromFile(filePath: String, sampleCount: Int = 64): IntArray? =
        withContext(Dispatchers.Default) {
            mutex.withLock {
                try {
                    Timber.d("AudioWaveformExtractor: Decoding PCM from file: $filePath")
                    val pcmSamples = decodeToPcm(filePath) ?: return@withLock null
                    Timber.d("AudioWaveformExtractor: Decoded ${pcmSamples.size} PCM samples, computing $sampleCount amplitude blocks")
                    computeAmplitudes(pcmSamples, sampleCount)
                } catch (e: Exception) {
                    Timber.e(e, "AudioWaveformExtractor: Error extracting waveform from $filePath")
                    CrashlyticsLog.recordNonFatalError(e, "AudioWaveformExtractor: Error extracting waveform from $filePath")
                    null
                }
            }
        }

    private fun decodeToPcm(filePath: String): ShortArray? {
        val extractor = MediaExtractor()
        var codec: MediaCodec? = null
        try {
            extractor.setDataSource(filePath)

            val audioTrackIndex = findAudioTrack(extractor) ?: return null
            extractor.selectTrack(audioTrackIndex)
            val format = extractor.getTrackFormat(audioTrackIndex)
            val mime = format.getString(MediaFormat.KEY_MIME) ?: return null

            codec = MediaCodec.createDecoderByType(mime)
            codec.configure(format, null, null, 0)
            codec.start()

            val samples = mutableListOf<Short>()
            val bufferInfo = MediaCodec.BufferInfo()
            var sawInputEOS = false
            var sawOutputEOS = false
            val timeoutUs = 10_000L

            while (!sawOutputEOS) {
                if (!sawInputEOS) {
                    val inputIndex = codec.dequeueInputBuffer(timeoutUs)
                    if (inputIndex >= 0) {
                        val inputBuffer = codec.getInputBuffer(inputIndex) ?: continue
                        val sampleSize = extractor.readSampleData(inputBuffer, 0)
                        if (sampleSize < 0) {
                            codec.queueInputBuffer(inputIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                            sawInputEOS = true
                        } else {
                            codec.queueInputBuffer(inputIndex, 0, sampleSize, extractor.sampleTime, 0)
                            extractor.advance()
                        }
                    }
                }

                val outputIndex = codec.dequeueOutputBuffer(bufferInfo, timeoutUs)
                if (outputIndex >= 0) {
                    if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                        sawOutputEOS = true
                    }

                    val outputBuffer = codec.getOutputBuffer(outputIndex)
                    if (outputBuffer != null && bufferInfo.size > 0) {
                        outputBuffer.order(ByteOrder.nativeOrder())
                        outputBuffer.position(bufferInfo.offset)
                        val shortBuffer = outputBuffer.asShortBuffer()
                        val shortCount = bufferInfo.size / 2
                        for (i in 0 until shortCount) {
                            samples.add(shortBuffer.get(i))
                        }
                    }
                    codec.releaseOutputBuffer(outputIndex, false)
                }
            }

            return samples.toShortArray()
        } catch (e: Exception) {
            Timber.e(e, "AudioWaveformExtractor: Error decoding PCM")
            CrashlyticsLog.recordNonFatalError(e, "AudioWaveformExtractor: Error decoding PCM")
            return null
        } finally {
            runCatching { codec?.stop() }
            runCatching { codec?.release() }
            extractor.release()
        }
    }

    private fun findAudioTrack(extractor: MediaExtractor): Int? {
        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME)
            if (mime != null && mime.startsWith("audio/")) {
                return i
            }
        }
        Timber.w("AudioWaveformExtractor: No audio track found")
        return null
    }

    private fun computeAmplitudes(pcmSamples: ShortArray, sampleCount: Int): IntArray {
        if (pcmSamples.isEmpty()) return IntArray(sampleCount)

        val blockSize = pcmSamples.size / sampleCount
        if (blockSize == 0) return IntArray(sampleCount)

        val amplitudes = IntArray(sampleCount)
        var maxAmplitude = 0L

        // First pass: compute raw average amplitudes per block
        val rawAmplitudes = LongArray(sampleCount)
        for (i in 0 until sampleCount) {
            val start = i * blockSize
            val end = min(start + blockSize, pcmSamples.size)
            var sum = 0L
            for (j in start until end) {
                sum += abs(pcmSamples[j].toInt())
            }
            rawAmplitudes[i] = sum / (end - start)
            if (rawAmplitudes[i] > maxAmplitude) {
                maxAmplitude = rawAmplitudes[i]
            }
        }

        // Second pass: normalize to 0-127
        if (maxAmplitude > 0) {
            for (i in 0 until sampleCount) {
                amplitudes[i] = (rawAmplitudes[i] * 127 / maxAmplitude).toInt()
            }
        }

        return amplitudes
    }

    private suspend fun downloadAudioFile(audioUrl: String): File? = withContext(Dispatchers.IO) {
        var tempFile: File? = null
        try {
            val url = URL(audioUrl)
            val connection = url.openConnection()
            connection.connect()
            tempFile = File(context.cacheDir, "temp_waveform_${System.nanoTime()}.tmp")
            connection.getInputStream().use { input ->
                FileOutputStream(tempFile).use { output ->
                    input.copyTo(output)
                }
            }
            Timber.d("AudioWaveformExtractor: Downloaded audio to ${tempFile.absolutePath}")
            tempFile
        } catch (e: Exception) {
            Timber.e(e, "AudioWaveformExtractor: Failed to download audio from $audioUrl")
            CrashlyticsLog.recordNonFatalError(e, "AudioWaveformExtractor: Failed to download audio from $audioUrl")
            runCatching { tempFile?.delete() }
            null
        }
    }

    companion object {
        /**
         * Serializes waveform amplitudes to a JSON array string for storage.
         */
        fun serializeWaveform(amplitudes: IntArray): String {
            return amplitudes.joinToString(",", "[", "]")
        }

        /**
         * Deserializes a JSON array string back to an IntArray of amplitudes.
         */
        fun deserializeWaveform(json: String?): IntArray? {
            if (json.isNullOrBlank()) return null
            return try {
                json.trim().removeSurrounding("[", "]")
                    .split(",")
                    .map { it.trim().toInt() }
                    .toIntArray()
            } catch (e: Exception) {
                Timber.e(e, "AudioWaveformExtractor: Failed to deserialize waveform: $json")
                null
            }
        }
    }
}
