package com.sosmartlabs.momo.chat.presentation.common

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.Vibrator
import android.widget.TextView
import android.widget.ViewSwitcher
import timber.log.Timber
import java.io.File

class ChatAudioRecordingController(
    private val context: Context,
    private val vibrator: Vibrator,
    private val lengthView: TextView,
    private val viewSwitcher: ViewSwitcher,
    private val recordingIdProvider: () -> String,
    private val onSendRecording: (String) -> Unit,
    private val onRecordingError: () -> Unit
) {
    private var recorder: MediaRecorder? = null
    private var lastFileRecorded: String? = null
    private var audioTime = 0
    private val audioHandler = Handler(Looper.getMainLooper())

    var isRecording: Boolean = false
        private set

    private val audioRunnable = object : Runnable {
        override fun run() {
            audioTime++
            lengthView.text = ChatInputUiHelper.recordingTimeText(audioTime)
            audioHandler.postDelayed(this, 1000)
        }
    }

    fun startRecording() {
        if (recorder == null) {
            recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                MediaRecorder()
            }
        } else {
            recorder?.reset()
        }

        recorder?.apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            val appFolder = File(context.cacheDir.absolutePath)
            if (!appFolder.exists()) appFolder.mkdirs()
            lastFileRecorded =
                appFolder.absolutePath + "/" + recordingIdProvider() + System.currentTimeMillis() + ".m4a"
            setOutputFile(lastFileRecorded)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setAudioChannels(1)
            setAudioSamplingRate(44100)
            setAudioEncodingBitRate(96000)
            isRecording = true

            try {
                prepare()
                start()
            } catch (e: Exception) {
                Timber.e(e, "ChatAudioRecordingController: Error starting audio recording")
                isRecording = false
                onRecordingError()
                return
            }

            lengthView.text = ChatInputUiHelper.recordingTimeText(0)
            if (ChatInputUiHelper.shouldShowRecordingLayout(viewSwitcher.nextView.id)) {
                viewSwitcher.showNext()
            }
            audioHandler.postDelayed(audioRunnable, 1000)
        }
    }

    fun stopRecording(cancel: Boolean) {
        var stoppedWithError = false
        try {
            recorder?.stop()
        } catch (e: RuntimeException) {
            stoppedWithError = true
            Timber.e(e, "ChatAudioRecordingController: Error stopping audio recording")
        } finally {
            recorder?.release()
            recorder = null
        }

        audioHandler.removeCallbacks(audioRunnable)
        isRecording = false

        if (audioTime < 1 || cancel || stoppedWithError) {
            if (audioTime < 1 || stoppedWithError) {
                onRecordingError()
            }
            if (cancel) {
                runCatching { vibrator.vibrate(100) }
            }
            lastFileRecorded?.let { File(it).delete() }
        } else {
            lastFileRecorded?.let(onSendRecording)
        }

        if (ChatInputUiHelper.shouldShowTextLayout(viewSwitcher.nextView.id)) {
            viewSwitcher.showNext()
        }
        audioTime = 0
    }

    fun onPauseCleanup() {
        if (isRecording) {
            runCatching { recorder?.stop() }
            lastFileRecorded?.let { File(it).delete() }
        }
        recorder?.release()
        recorder = null
        audioHandler.removeCallbacks(audioRunnable)
        isRecording = false
    }
}
