package com.sosmartlabs.momo.chat.presentation.common

import android.content.res.Resources
import android.util.TypedValue
import android.view.View
import com.sosmartlabs.momo.R
import androidx.core.view.isVisible
import java.util.Locale

object ChatInputUiHelper {

    fun applyMessageTypeUi(
        isTextMode: Boolean,
        sendButton: View,
        audioButton: View
    ) {
        if (isTextMode) {
            sendButton.visibility = View.VISIBLE
            sendButton.isClickable = true
            audioButton.visibility = View.INVISIBLE
            audioButton.isClickable = false
        } else {
            sendButton.visibility = View.INVISIBLE
            sendButton.isClickable = false
            audioButton.visibility = View.VISIBLE
            audioButton.isClickable = true
        }
    }

    fun animateChatSendImage(
        sendImageButton: View,
        hide: Boolean,
        canShowImageButton: Boolean,
        resources: Resources
    ) {
        val slideDistance = sendImageButton.width +
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                16f,
                resources.displayMetrics
            ).toInt()

        if (hide && sendImageButton.isVisible) {
            sendImageButton.animate()
                .translationX(slideDistance.toFloat())
                .alpha(0f)
                .setDuration(200)
                .withEndAction {
                    sendImageButton.visibility = View.INVISIBLE
                    sendImageButton.translationX = 0f
                    sendImageButton.alpha = 1f
                }
                .start()
            return
        }

        if (!hide && sendImageButton.visibility != View.VISIBLE && canShowImageButton) {
            sendImageButton.apply {
                translationX = slideDistance.toFloat()
                alpha = 0f
                visibility = View.VISIBLE
            }
            sendImageButton.animate()
                .translationX(0f)
                .alpha(1f)
                .setDuration(200)
                .start()
        }
    }

    fun setViewForSendingImage(
        isSendingImage: Boolean,
        sendImageButton: View,
        sendFromCameraFab: View,
        sendFromGalleryFab: View,
        overlay: View,
        closeArrow: View,
        resources: Resources
    ) {
        val hideDistance = sendImageButton.width +
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                16f,
                resources.displayMetrics
            ).toInt()

        if (isSendingImage) {
            sendImageButton.animate()
                .translationX(hideDistance.toFloat())
                .alpha(0f)
                .setDuration(200)
                .withEndAction {
                    sendImageButton.visibility = View.INVISIBLE
                    sendImageButton.translationX = 0f
                    sendImageButton.alpha = 1f
                }
        } else {
            sendImageButton.apply {
                translationX = hideDistance.toFloat()
                alpha = 0f
                visibility = View.VISIBLE
            }
            sendImageButton.animate()
                .translationX(0f)
                .alpha(1f)
                .setDuration(200)
                .start()
        }

        sendFromCameraFab.visibility = if (isSendingImage) View.VISIBLE else View.GONE
        sendFromGalleryFab.visibility = if (isSendingImage) View.VISIBLE else View.GONE
        overlay.visibility = if (isSendingImage) View.VISIBLE else View.GONE
        closeArrow.visibility = if (isSendingImage) View.VISIBLE else View.GONE
    }

    fun recordingTimeText(totalSeconds: Int): String {
        val seconds = totalSeconds % 60
        val minutes = totalSeconds / 60
        return String.format(Locale.getDefault(),"%02d:%02d", minutes, seconds)
    }

    fun shouldShowRecordingLayout(nextViewId: Int): Boolean = nextViewId == R.id.chatLayoutAudio

    fun shouldShowTextLayout(nextViewId: Int): Boolean = nextViewId == R.id.chatLayoutMessageText
}
