package com.sosmartlabs.momo.chat.presentation.adapter

import android.view.View
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.bitmap.RoundedCorners
import com.bumptech.glide.request.RequestOptions
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.local.entity.*
import com.sosmartlabs.momo.chat.data.media.AudioWaveformExtractor
import com.sosmartlabs.momo.chat.presentation.share.ChatPhotoShareRequest
import com.sosmartlabs.momo.chat.presentation.common.ChatBindingAdapters
import com.sosmartlabs.momo.chat.presentation.view.AudioWaveformView
import com.sosmartlabs.momo.databinding.*
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.extensions.findAppCompatActivity
import com.stfalcon.imageviewer.StfalconImageViewer
import timber.log.Timber
import java.util.Locale
import androidx.core.view.isVisible
import com.google.android.material.floatingactionbutton.FloatingActionButton

sealed class ChatViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
    abstract var message: ChatEntity?
}

internal interface StatusPartialBindable {
    fun bindStatus(status: String?)
}

internal interface GroupSenderPartialBindable {
    fun bindGroupSender(name: String?, imageUrl: String?)
}

private fun bindGroupSenderAvatar(imageView: ImageView, imageUrl: String?, holderTag: String) {
    if (imageUrl.isNullOrBlank()) {
        imageView.setImageResource(R.drawable.ic_default_avatar)
        return
    }
    runCatching {
        Glide.with(imageView.context)
            .load(imageUrl)
            .apply(RequestOptions.bitmapTransform(RoundedCorners(8)))
            .into(imageView)
    }.onFailure { throwable ->
        Timber.e(throwable, "%s: Error loading group sender image: %s", holderTag, imageUrl)
        CrashlyticsLog.recordNonFatalError(
            throwable,
            "$holderTag: Error loading group sender image"
        )
        imageView.setImageResource(R.drawable.ic_default_avatar)
    }
}

private fun bindStatusIcon(statusIcon: ImageView, status: String?) {
    ChatBindingAdapters.showStatusIcon(statusIcon, status)
}

abstract class ImageViewHolder(
    itemView: View,
    private val messageImage: ImageView,
    private val shareButton: FloatingActionButton?,
    private val onShareClick: ((ChatPhotoShareRequest) -> Unit)? = null
) : ChatViewHolder(itemView) {

    init {
        shareButton?.isVisible = onShareClick != null
        shareButton?.setOnClickListener {
            val currentMessage = message ?: return@setOnClickListener
            val imageUrl = currentMessage.image ?: return@setOnClickListener
            onShareClick?.invoke(
                ChatPhotoShareRequest(
                    messageId = currentMessage.id,
                    imageUrl = imageUrl,
                    createdAt = currentMessage.createdAt
                )
            )
        }

        messageImage.setOnClickListener {
            Timber.d("ImageViewHolder: Image clicked. Attempting to show image viewer.")
            try {
                if (message != null) {
                    Timber.d("ImageViewHolder: Message is not null, showing image: ${message?.image}")
                    StfalconImageViewer.Builder<String>(itemView.context, arrayOf(message?.image)) { view, url ->
                        Timber.d("ImageViewHolder: Loading image into viewer: $url")
                        Glide.with(itemView.context).load(url).into(view)
                    }
                        .withTransitionFrom(messageImage)
                        .withHiddenStatusBar(false)
                        .withDismissListener {
                            Timber.d("ImageViewHolder: Image viewer dismissed, restoring navigation bar.")
                            try {
                                // Unwrap rather than cast: under a @AndroidEntryPoint fragment the
                                // View's context is Hilt's FragmentContextWrapper, not the Activity.
                                val activity = itemView.context.findAppCompatActivity()
                                    ?: throw IllegalStateException("No AppCompatActivity host for image viewer")
                                val window = activity.window
                                val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
                                windowInsetsController.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                                windowInsetsController.hide(WindowInsetsCompat.Type.navigationBars())
                            } catch (e: Exception) {
                                Timber.e(e, "ImageViewHolder: Error restoring navigation bar after image viewer dismiss.")
                                CrashlyticsLog.recordNonFatalError(e, "ImageViewHolder: Error restoring navigation bar after image viewer dismiss")
                            }
                        }
                        .show()
                    Timber.d("ImageViewHolder: Image viewer shown successfully.")
                } else {
                    Timber.w("ImageViewHolder: Tried to show image viewer but message is null.")
                }
            } catch (e: Exception) {
                Timber.e(e, "ImageViewHolder: Error showing image viewer.")
                CrashlyticsLog.recordNonFatalError(e, "ImageViewHolder: Error showing image viewer")
            }
        }
    }
}

abstract class AudioViewHolder(
    itemView: View,
    private val messageAudioControlButton: ImageButton,
    private val messageAudioProgressBar: ProgressBar,
    private val messageAudioTime: TextView,
    private val audioWaveformView: AudioWaveformView,
    private val contactImage: ImageView,
    private val isolatedAudioImage: ImageView
) : ChatViewHolder(itemView) {

    fun setPlaying() {
        Timber.d("AudioViewHolder: Setting audio to playing state.")
        messageAudioControlButton.setImageResource(R.drawable.ic_chat_audio_stop)
        messageAudioControlButton.visibility = View.VISIBLE
        audioWaveformView.visibility = View.VISIBLE
        messageAudioProgressBar.visibility = View.INVISIBLE
    }

    fun setReady() {
        Timber.d("AudioViewHolder: Setting audio to ready state.")
        messageAudioControlButton.setImageResource(R.drawable.ic_chat_audio_play)
        messageAudioControlButton.visibility = View.VISIBLE
        audioWaveformView.visibility = View.VISIBLE
        messageAudioProgressBar.visibility = View.INVISIBLE
    }

    fun setBuffering() {
        Timber.d("AudioViewHolder: Setting audio to buffering state.")
        messageAudioControlButton.visibility = View.INVISIBLE
        audioWaveformView.visibility = View.VISIBLE
        messageAudioProgressBar.visibility = View.VISIBLE
    }

    fun setAudioControlButtonOnClickListener(onClickListener: View.OnClickListener) {
        Timber.d("AudioViewHolder: Setting audio control button click listener.")
        messageAudioControlButton.setOnClickListener(onClickListener)
    }

    fun setTime(minutes: Int, seconds: Int) {
        Timber.d("AudioViewHolder: Setting audio time to %d:%02d", minutes, seconds)
        messageAudioTime.text = String.format(Locale.getDefault(), "%d:%02d", minutes, seconds)
    }

    fun clearTime() {
        Timber.d("AudioViewHolder: Clearing audio time display.")
        messageAudioTime.text = ""
    }

    fun setWaveform(waveformJson: String?) {
        val amplitudes = AudioWaveformExtractor.deserializeWaveform(waveformJson)
        if (amplitudes != null) {
            audioWaveformView.setAmplitudes(amplitudes)
        } else {
            audioWaveformView.setAmplitudes(IntArray(0))
        }
        audioWaveformView.setProgress(0f)
    }

    fun setProgress(progress: Float) {
        audioWaveformView.setProgress(progress)
    }

    fun setImage(imageUrl: String) {
        Timber.d("AudioViewHolder: Setting contact image from url: $imageUrl")
        try {
            Glide.with(itemView.context)
                .load(imageUrl)
                .apply(RequestOptions.bitmapTransform(RoundedCorners(8)))
                .into(contactImage)
            Timber.d("AudioViewHolder: Contact image loaded successfully.")
        } catch (e: Exception) {
            Timber.e(e, "AudioViewHolder: Error loading contact image from url: $imageUrl")
            CrashlyticsLog.recordNonFatalError(e, "AudioViewHolder: Error loading contact image from url: $imageUrl")
        }
    }

    fun setDefaultImage() {
        Timber.d("AudioViewHolder: Setting default contact image.")
        contactImage.setImageResource(R.drawable.ic_default_avatar)
    }

    fun setIsolatedAudioDialogListener(onClickListener: View.OnClickListener) {
        Timber.d("AudioViewHolder: Setting isolated audio dialog click listener.")
        isolatedAudioImage.setOnClickListener(onClickListener)
    }
}

abstract class VideoViewHolder(
    itemView: View,
    private val messageVideoThumbnail: ImageView,
    private val playButton: ImageView
) : ChatViewHolder(itemView) {

    fun setVideoOnClickListener(listener: View.OnClickListener) {
        Timber.d("VideoViewHolder: Setting video thumbnail and play button click listeners.")
        messageVideoThumbnail.setOnClickListener(listener)
        playButton.setOnClickListener(listener)
    }
}

class FromTextViewHolder(
    private val binding: ChatItemMessageFromTextBinding
) : ChatViewHolder(binding.root) {
    override var message: ChatEntity?
        get() = binding.message
        set(value) {
            Timber.d("FromTextViewHolder: Setting message: $value")
            binding.message = value
        }
}

class GroupFromTextViewHolder(
    private val binding: ChatItemGroupMessageFromTextBinding
) : ChatViewHolder(binding.root), GroupSenderPartialBindable {
    override fun bindGroupSender(name: String?, imageUrl: String?) {
        binding.groupFromUserName.text = name.orEmpty()
        bindGroupSenderAvatar(binding.groupFromUserImage, imageUrl, "GroupFromTextViewHolder")
    }

    override var message: ChatEntity?
        get() = binding.message
        set(value) {
            Timber.d("GroupFromTextViewHolder: Setting message: $value")
            binding.message = value
            bindGroupSender(value?.groupSenderName, value?.groupSenderImage)
        }
}

class GroupFromAudioViewHolder(
    private val binding: ChatItemGroupMessageFromAudioBinding
) : AudioViewHolder(
    binding.root,
    binding.messageAudioControlButton,
    binding.messageAudioProgressBar,
    binding.audioTime,
    binding.audioWaveform,
    binding.contactImage,
    binding.isolatedAudioImage
), GroupSenderPartialBindable {
    override fun bindGroupSender(name: String?, imageUrl: String?) {
        binding.groupFromUserName.text = name.orEmpty()
        bindGroupSenderAvatar(binding.groupFromUserImage, imageUrl, "GroupFromAudioViewHolder")
        if (imageUrl.isNullOrBlank()) {
            setDefaultImage()
            return
        }
        setImage(imageUrl)
    }

    override var message: ChatEntity?
        get() = binding.message
        set(value) {
            Timber.d("GroupFromAudioViewHolder: Setting message: $value")
            binding.message = value
            bindGroupSender(value?.groupSenderName, value?.groupSenderImage)
        }
}

class GroupFromImageViewHolder(
    private val binding: ChatItemGroupMessageFromImageBinding,
    onShareClick: ((ChatPhotoShareRequest) -> Unit)?
) : ImageViewHolder(binding.root, binding.messageImage, binding.shareButton, onShareClick), GroupSenderPartialBindable {
    override fun bindGroupSender(name: String?, imageUrl: String?) {
        binding.groupFromUserName.text = name.orEmpty()
        bindGroupSenderAvatar(binding.groupFromUserImage, imageUrl, "GroupFromImageViewHolder")
    }

    override var message: ChatEntity?
        get() = binding.message
        set(value) {
            Timber.d("GroupFromImageViewHolder: Setting message: $value")
            binding.message = value
            bindGroupSender(value?.groupSenderName, value?.groupSenderImage)
        }
}

class GroupFromVideoViewHolder(
    private val binding: ChatItemGroupMessageFromVideoBinding
) : VideoViewHolder(binding.root, binding.messageVideoThumbnail, binding.playButton), GroupSenderPartialBindable {
    override fun bindGroupSender(name: String?, imageUrl: String?) {
        binding.groupFromUserName.text = name.orEmpty()
        bindGroupSenderAvatar(binding.groupFromUserImage, imageUrl, "GroupFromVideoViewHolder")
    }

    override var message: ChatEntity?
        get() = binding.message
        set(value) {
            Timber.d("GroupFromVideoViewHolder: Setting message: $value")
            binding.message = value
            bindGroupSender(value?.groupSenderName, value?.groupSenderImage)
        }
}

class FromImageViewHolder(
    private val binding: ChatItemMessageFromImageBinding,
    onShareClick: ((ChatPhotoShareRequest) -> Unit)?
) : ImageViewHolder(binding.root, binding.messageImage, binding.shareButton, onShareClick) {
    override var message: ChatEntity?
        get() = binding.message
        set(value) {
            Timber.d("FromImageViewHolder: Setting message: $value")
            binding.message = value
        }
}

class FromAudioViewHolder(
    private val binding: ChatItemMessageFromAudioBinding
) : AudioViewHolder(
    binding.root,
    binding.messageAudioControlButton,
    binding.messageAudioProgressBar,
    binding.audioTime,
    binding.audioWaveform,
    binding.contactImage,
    binding.isolatedAudioImage
) {
    override var message: ChatEntity?
        get() = binding.message
        set(value) {
            Timber.d("FromAudioViewHolder: Setting message: $value")
            binding.message = value
        }
}

class FromVideoViewHolder(
    private val binding: ChatItemMessageFromVideoBinding
) : VideoViewHolder(binding.root, binding.messageVideoThumbnail, binding.playButton) {
    override var message: ChatEntity?
        get() = binding.message
        set(value) {
            Timber.d("FromVideoViewHolder: Setting message: $value")
            binding.message = value
        }
}

class ToTextViewHolder(
    private val binding: ChatItemMessageToTextBinding
) : ChatViewHolder(binding.root), StatusPartialBindable {
    override fun bindStatus(status: String?) {
        bindStatusIcon(binding.messageStateIcon, status)
    }

    override var message: ChatEntity?
        get() = binding.message
        set(value) {
            Timber.d("ToTextViewHolder: Setting message: $value")
            binding.message = value
            bindStatus(value?.status)
        }
}

class ToImageViewHolder(
    private val binding: ChatItemMessageToImageBinding
) : ImageViewHolder(binding.root, binding.messageImage, null), StatusPartialBindable {
    override fun bindStatus(status: String?) {
        bindStatusIcon(binding.messageStateIcon, status)
    }

    override var message: ChatEntity?
        get() = binding.message
        set(value) {
            Timber.d("ToImageViewHolder: Setting message: $value")
            binding.message = value
            bindStatus(value?.status)
        }
}

class ToAudioViewHolder(
    private val binding: ChatItemMessageToAudioBinding
) : AudioViewHolder(
    binding.root,
    binding.messageAudioControlButton,
    binding.messageAudioProgressBar,
    binding.audioTime,
    binding.audioWaveform,
    binding.contactImage,
    binding.isolatedAudioImage
), StatusPartialBindable {
    override fun bindStatus(status: String?) {
        bindStatusIcon(binding.messageStateIcon, status)
    }

    override var message: ChatEntity?
        get() = binding.message
        set(value) {
            Timber.d("ToAudioViewHolder: Setting message: $value")
            binding.message = value
            bindStatus(value?.status)
        }
}

class ToVideoViewHolder(
    private val binding: ChatItemMessageToVideoBinding
) : VideoViewHolder(binding.root, binding.messageVideoThumbnail, binding.playButton), StatusPartialBindable {
    override fun bindStatus(status: String?) {
        bindStatusIcon(binding.messageStateIcon, status)
    }

    override var message: ChatEntity?
        get() = binding.message
        set(value) {
            Timber.d("ToVideoViewHolder: Setting message: $value")
            binding.message = value
            bindStatus(value?.status)
        }
}

class SeparatorViewHolder(
    private val binding: ChatItemMessageSeparatorDayBinding
) : ChatViewHolder(binding.root) {
    override var message: ChatEntity?
        get() = binding.message
        set(value) {
            Timber.d("SeparatorViewHolder: Setting message: $value")
            binding.message = value
        }
}
