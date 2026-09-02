package com.sosmartlabs.momo.chat.presentation.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem
import com.google.android.exoplayer2.Player
import com.sosmartlabs.momo.chat.data.local.entity.*
import com.sosmartlabs.momo.chat.presentation.dialog.ShowVideoDialog
import com.sosmartlabs.momo.chat.presentation.share.ChatPhotoShareRequest
import com.sosmartlabs.momo.databinding.*
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.extensions.findAppCompatActivity
import kotlinx.coroutines.*
import java.util.concurrent.TimeUnit
import android.app.AlertDialog
import android.view.Choreographer
import android.view.View
import com.sosmartlabs.momo.R
import timber.log.Timber
import kotlin.math.abs

class ChatAdapter(
    private val exoPlayer: ExoPlayer,
    private val userImage: String?,
    private val wearerImage: String?,
    private val coroutineScope: CoroutineScope,
    private val onIncomingImageShareClick: ((ChatPhotoShareRequest) -> Unit)? = null
) : ListAdapter<ChatEntity, ChatViewHolder>(DiffCallback()) {

    companion object {
        private const val TYPE_FROM_TEXT = 0
        private const val TYPE_FROM_IMAGE = 1
        private const val TYPE_FROM_AUDIO = 2
        private const val TYPE_FROM_VIDEO = 3
        private const val TYPE_TO_TEXT = 4
        private const val TYPE_TO_IMAGE = 5
        private const val TYPE_TO_AUDIO = 6
        private const val TYPE_TO_VIDEO = 7
        private const val TYPE_SEPARATOR = 8
        private const val TYPE_GROUP_FROM_TEXT = 9
        private const val TYPE_GROUP_FROM_AUDIO = 10
        private const val TYPE_GROUP_FROM_IMAGE = 11
        private const val TYPE_GROUP_FROM_VIDEO = 12
    }

    private var playingViewHolder: AudioViewHolder? = null
    private var playingMessageId: String? = null
    private var isProgressCallbackActive = false
    private var lastDisplayedSeconds = -1L
    private var isGroupChatSession: Boolean = false

    internal data class MessageChangePayload(
        val statusChanged: Boolean = false,
        val groupSenderNameChanged: Boolean = false,
        val groupSenderImageChanged: Boolean = false
    ) {
        fun merge(other: MessageChangePayload): MessageChangePayload = MessageChangePayload(
            statusChanged = statusChanged || other.statusChanged,
            groupSenderNameChanged = groupSenderNameChanged || other.groupSenderNameChanged,
            groupSenderImageChanged = groupSenderImageChanged || other.groupSenderImageChanged
        )
    }

    private object MessageSpacingChangePayload

    fun stopPlaybackAndCleanup() {
        if (playingMessageId != null) {
            exoPlayer.stop()
            cleanupPlayback(resetToReady = true)
        }
    }

    fun setIsGroupChatSession(value: Boolean) {
        if (isGroupChatSession == value) {
            return
        }
        isGroupChatSession = value
        notifySessionSensitiveRowsChanged()
    }

    private fun notifySessionSensitiveRowsChanged() {
        if (currentList.isEmpty()) {
            return
        }

        var rangeStart = -1
        var rangeCount = 0

        currentList.forEachIndexed { index, message ->
            if (isSessionSensitiveIncomingMessage(message)) {
                if (rangeStart == -1) {
                    rangeStart = index
                    rangeCount = 1
                } else {
                    rangeCount += 1
                }
            } else if (rangeStart != -1) {
                notifyItemRangeChanged(rangeStart, rangeCount)
                rangeStart = -1
                rangeCount = 0
            }
        }

        if (rangeStart != -1) {
            notifyItemRangeChanged(rangeStart, rangeCount)
        }
    }

    private fun isSessionSensitiveIncomingMessage(message: ChatEntity): Boolean {
        if (message.sender != ChatEntity.SENDER_WATCH) {
            return false
        }

        return when (message.type) {
            ChatEntity.TYPE_TEXT,
            ChatEntity.TYPE_AUDIO,
            ChatEntity.TYPE_IMAGE,
            ChatEntity.TYPE_VIDEO -> true

            else -> false
        }
    }

    private val audioPlayerListener = object : Player.Listener {
        override fun onPlaybackStateChanged(playbackState: Int) {
            Timber.d("ChatAdapter: onPlaybackStateChanged called with state: $playbackState")
            when (playbackState) {
                Player.STATE_BUFFERING -> {
                    Timber.d("ChatAdapter: Audio is buffering")
                    playingViewHolder?.setBuffering()
                }
                Player.STATE_READY -> {
                    Timber.d("ChatAdapter: Audio is ready, start playing and updating time")
                    playingViewHolder?.setPlaying()
                    if (playingViewHolder != null) {
                        startProgressUpdates()
                    }
                }
                Player.STATE_ENDED -> {
                    Timber.d("ChatAdapter: Audio playback ended")
                    cleanupPlayback(resetToReady = true)
                }
                else -> {
                    Timber.d("ChatAdapter: Audio playback state changed to $playbackState (ignored)")
                }
            }
        }
    }

    override fun getItemViewType(position: Int): Int {
        val message = getItem(position)
        val type = when (message.sender) {
            ChatEntity.SENDER_WATCH -> when (message.type) {
                ChatEntity.TYPE_TEXT -> if (isGroupChatSession) TYPE_GROUP_FROM_TEXT else TYPE_FROM_TEXT
                ChatEntity.TYPE_AUDIO -> if (isGroupChatSession) TYPE_GROUP_FROM_AUDIO else TYPE_FROM_AUDIO
                ChatEntity.TYPE_IMAGE -> if (isGroupChatSession) TYPE_GROUP_FROM_IMAGE else TYPE_FROM_IMAGE
                ChatEntity.TYPE_VIDEO -> if (isGroupChatSession) TYPE_GROUP_FROM_VIDEO else TYPE_FROM_VIDEO
                ChatEntity.TYPE_SEPARATOR -> TYPE_SEPARATOR
                else -> TYPE_FROM_TEXT
            }
            else -> when (message.type) {
                ChatEntity.TYPE_TEXT -> TYPE_TO_TEXT
                ChatEntity.TYPE_IMAGE -> TYPE_TO_IMAGE
                ChatEntity.TYPE_AUDIO -> TYPE_TO_AUDIO
                ChatEntity.TYPE_VIDEO -> TYPE_TO_VIDEO
                ChatEntity.TYPE_SEPARATOR -> TYPE_SEPARATOR
                else -> TYPE_TO_TEXT
            }
        }
        Timber.v("ChatAdapter: getItemViewType for position $position, message id=${message.id}, type=$type")
        return type
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChatViewHolder {
        Timber.d("ChatAdapter: onCreateViewHolder called with viewType=$viewType")
        return when (viewType) {
            TYPE_FROM_TEXT -> {
                Timber.v("ChatAdapter: Creating FromTextViewHolder")
                FromTextViewHolder(
                    ChatItemMessageFromTextBinding.inflate(LayoutInflater.from(parent.context), parent, false)
                )
            }
            TYPE_GROUP_FROM_TEXT -> {
                Timber.v("ChatAdapter: Creating GroupFromTextViewHolder")
                GroupFromTextViewHolder(
                    ChatItemGroupMessageFromTextBinding.inflate(LayoutInflater.from(parent.context), parent, false)
                )
            }
            TYPE_GROUP_FROM_AUDIO -> {
                Timber.v("ChatAdapter: Creating GroupFromAudioViewHolder")
                GroupFromAudioViewHolder(
                    ChatItemGroupMessageFromAudioBinding.inflate(LayoutInflater.from(parent.context), parent, false)
                )
            }
            TYPE_GROUP_FROM_IMAGE -> {
                Timber.v("ChatAdapter: Creating GroupFromImageViewHolder")
                GroupFromImageViewHolder(
                    ChatItemGroupMessageFromImageBinding.inflate(LayoutInflater.from(parent.context), parent, false),
                    onIncomingImageShareClick
                )
            }
            TYPE_GROUP_FROM_VIDEO -> {
                Timber.v("ChatAdapter: Creating GroupFromVideoViewHolder")
                GroupFromVideoViewHolder(
                    ChatItemGroupMessageFromVideoBinding.inflate(LayoutInflater.from(parent.context), parent, false)
                )
            }
            TYPE_FROM_IMAGE -> {
                Timber.v("ChatAdapter: Creating FromImageViewHolder")
                FromImageViewHolder(
                    ChatItemMessageFromImageBinding.inflate(LayoutInflater.from(parent.context), parent, false),
                    onIncomingImageShareClick
                )
            }
            TYPE_FROM_AUDIO -> {
                Timber.v("ChatAdapter: Creating FromAudioViewHolder")
                val holder = FromAudioViewHolder(
                    ChatItemMessageFromAudioBinding.inflate(LayoutInflater.from(parent.context), parent, false)
                )
                try {
                    if (wearerImage != null) {
                        Timber.d("ChatAdapter: Setting wearer image for FromAudioViewHolder")
                        holder.setImage(wearerImage)
                    } else {
                        Timber.d("ChatAdapter: Setting default image for FromAudioViewHolder")
                        holder.setDefaultImage()
                    }
                } catch (e: Exception) {
                    Timber.e(e, "ChatAdapter: Error setting image for FromAudioViewHolder")
                    CrashlyticsLog.recordNonFatalError(e, "ChatAdapter: Error setting image for FromAudioViewHolder")
                }
                holder
            }
            TYPE_FROM_VIDEO -> {
                Timber.v("ChatAdapter: Creating FromVideoViewHolder")
                FromVideoViewHolder(
                    ChatItemMessageFromVideoBinding.inflate(LayoutInflater.from(parent.context), parent, false)
                )
            }
            TYPE_TO_TEXT -> {
                Timber.v("ChatAdapter: Creating ToTextViewHolder")
                ToTextViewHolder(
                    ChatItemMessageToTextBinding.inflate(LayoutInflater.from(parent.context), parent, false)
                )
            }
            TYPE_TO_IMAGE -> {
                Timber.v("ChatAdapter: Creating ToImageViewHolder")
                ToImageViewHolder(
                    ChatItemMessageToImageBinding.inflate(LayoutInflater.from(parent.context), parent, false)
                )
            }
            TYPE_TO_AUDIO -> {
                Timber.v("ChatAdapter: Creating ToAudioViewHolder")
                val holder = ToAudioViewHolder(
                    ChatItemMessageToAudioBinding.inflate(LayoutInflater.from(parent.context), parent, false)
                )
                try {
                    if (userImage != null) {
                        Timber.d("ChatAdapter: Setting user image for ToAudioViewHolder")
                        holder.setImage(userImage)
                    } else {
                        Timber.d("ChatAdapter: Setting default image for ToAudioViewHolder")
                        holder.setDefaultImage()
                    }
                } catch (e: Exception) {
                    Timber.e(e, "ChatAdapter: Error setting image for ToAudioViewHolder")
                    CrashlyticsLog.recordNonFatalError(e, "ChatAdapter: Error setting image for ToAudioViewHolder")
                }
                holder
            }
            TYPE_TO_VIDEO -> {
                Timber.v("ChatAdapter: Creating ToVideoViewHolder")
                ToVideoViewHolder(
                    ChatItemMessageToVideoBinding.inflate(LayoutInflater.from(parent.context), parent, false)
                )
            }
            TYPE_SEPARATOR -> {
                Timber.v("ChatAdapter: Creating SeparatorViewHolder")
                SeparatorViewHolder(
                    ChatItemMessageSeparatorDayBinding.inflate(LayoutInflater.from(parent.context), parent, false)
                )
            }
            else -> {
                Timber.w("ChatAdapter: Unknown viewType $viewType, defaulting to FromTextViewHolder")
                FromTextViewHolder(
                    ChatItemMessageFromTextBinding.inflate(LayoutInflater.from(parent.context), parent, false)
                )
            }
        }
    }

    override fun onBindViewHolder(holder: ChatViewHolder, position: Int) {
        val message = getItem(position)
        Timber.d("ChatAdapter: onBindViewHolder for position $position, message id=${message.id}, type=${message.type}")
        holder.message = message
        applyMessageSpacing(holder, position)

        when (holder) {
            is AudioViewHolder -> {
                Timber.v("ChatAdapter: Binding AudioViewHolder at position $position")
                loadAudio(holder, message)
            }
            is VideoViewHolder -> {
                Timber.v("ChatAdapter: Binding VideoViewHolder at position $position")
                loadVideo(holder, message)
            }
            else -> {
                Timber.v("ChatAdapter: Binding generic ChatViewHolder at position $position")
            }
        }
    }

    override fun onViewRecycled(holder: ChatViewHolder) {
        super.onViewRecycled(holder)
        if (holder === playingViewHolder) {
            // Detach the ViewHolder but keep audio playing.
            // When the user scrolls back, onBindViewHolder will reassociate.
            stopProgressUpdates()
            playingViewHolder = null
        }
    }

    override fun onBindViewHolder(holder: ChatViewHolder, position: Int, payloads: MutableList<Any>) {
        if (payloads.isEmpty()) {
            onBindViewHolder(holder, position)
            return
        }

        val hasSpacingPayload = payloads.any { it === MessageSpacingChangePayload }
        val payload = payloads
            .filterIsInstance<MessageChangePayload>()
            .reduceOrNull { acc, next -> acc.merge(next) }

        if (payload == null) {
            if (hasSpacingPayload) {
                applyMessageSpacing(holder, position)
            } else {
                onBindViewHolder(holder, position)
            }
            return
        }

        val message = getItem(position)
        var handled = true

        if (payload.statusChanged) {
            val statusBindable = holder as? StatusPartialBindable
            if (statusBindable != null) {
                statusBindable.bindStatus(message.status)
            } else {
                handled = false
            }
        }

        if (payload.groupSenderNameChanged || payload.groupSenderImageChanged) {
            val groupSenderBindable = holder as? GroupSenderPartialBindable
            if (groupSenderBindable != null) {
                groupSenderBindable.bindGroupSender(message.groupSenderName, message.groupSenderImage)
            } else {
                handled = false
            }
        }

        if (!handled) {
            onBindViewHolder(holder, position)
        } else if (hasSpacingPayload) {
            applyMessageSpacing(holder, position)
        }
    }

    override fun onCurrentListChanged(
        previousList: MutableList<ChatEntity>,
        currentList: MutableList<ChatEntity>
    ) {
        super.onCurrentListChanged(previousList, currentList)
        if (currentList.isNotEmpty()) {
            notifyItemRangeChanged(0, currentList.size, MessageSpacingChangePayload)
        }
    }

    private fun applyMessageSpacing(holder: ChatViewHolder, position: Int) {
        val spacing = ChatMessageSpacing.calculate(position, currentList)
        val resources = holder.itemView.resources
        val normalMessageMargin = resources.getDimensionPixelSize(R.dimen.vertical_margin_smaller)
        val normalDateMargin = resources.getDimensionPixelSize(R.dimen.vertical_margin_small)
        val compactMargin = resources.getDimensionPixelSize(R.dimen.chat_grouped_message_vertical_margin)
        val compactMediaMargin = resources.getDimensionPixelSize(R.dimen.chat_grouped_media_message_vertical_margin)
        val compactTopMargin = if (spacing.useMediaTopMargin) compactMediaMargin else compactMargin
        val compactBottomMargin = if (spacing.useMediaBottomMargin) compactMediaMargin else compactMargin

        val messageBox = holder.itemView.findViewById<View>(R.id.messageBox)
        messageBox?.updateVerticalMargins(
            top = if (spacing.compactTop) compactTopMargin else normalMessageMargin,
            bottom = if (spacing.compactBottom) compactBottomMargin else normalMessageMargin
        )?.updateBubbleBackground(currentList.getOrNull(position), spacing)
        holder.itemView.findViewById<View>(R.id.messageDate)?.updateVerticalMargins(
            top = if (spacing.compactTop) compactTopMargin else normalDateMargin,
            bottom = if (spacing.compactBottom) compactBottomMargin else normalDateMargin
        )?.updateVisibility(if (spacing.showTimestamp) View.VISIBLE else View.GONE)

        holder.itemView.findViewById<View>(R.id.groupFromUserName)
            ?.updateVisibility(if (spacing.showGroupSenderHeader) View.VISIBLE else View.GONE)
        holder.itemView.findViewById<View>(R.id.groupFromUserImage)
            ?.updateVisibility(if (spacing.showGroupSenderHeader) View.VISIBLE else View.INVISIBLE)
    }

    @SuppressWarnings("deprecation")
    private fun loadAudio(holder: AudioViewHolder, message: ChatEntity) {
        Timber.d("ChatAdapter: loadAudio called for message id=${message.id}")
        try {
            holder.setWaveform(message.audioWaveform)

            // Check if this ViewHolder is being bound to the currently playing message
            if (playingMessageId == message.id) {
                Timber.d("ChatAdapter: Reassociating playing ViewHolder for message id=${message.id}")
                playingViewHolder = holder
                val playbackState = exoPlayer.playbackState
                if (playbackState == Player.STATE_BUFFERING) {
                    holder.setBuffering()
                } else if (exoPlayer.isPlaying) {
                    holder.setPlaying()
                    val duration = exoPlayer.duration
                    val position = exoPlayer.currentPosition
                    if (duration > 0) {
                        holder.setProgress(position.toFloat() / duration.toFloat())
                        setAudioTime(holder, position, force = true)
                    }
                    startProgressUpdates()
                }
            } else {
                // Reset to ready state (fixes stop button leaking to recycled ViewHolders)
                holder.setReady()
            }

            if (message.audioDuration != null && playingMessageId != message.id) {
                Timber.v("ChatAdapter: Setting audio time for message id=${message.id}, duration=${message.audioDuration}")
                setAudioTime(holder, message.audioDuration, force = true)
            } else if (message.audioDuration == null && playingMessageId != message.id) {
                Timber.v("ChatAdapter: Clearing audio time for message id=${message.id}")
                holder.clearTime()
            }

            if (message.isIsolatedAudio != null && message.isIsolatedAudio) {
                Timber.d("ChatAdapter: Setting isolated audio dialog listener for message id=${message.id}")
                holder.setIsolatedAudioDialogListener {
                    Timber.d("ChatAdapter: Showing isolated audio alert dialog for message id=${message.id}")
                    AlertDialog.Builder(holder.itemView.context)
                        .setTitle(R.string.dialog_chat_audio_isolation_alert_title)
                        .setMessage(R.string.dialog_chat_audio_isolation_alert_message)
                        .setPositiveButton(R.string.button_i_understand) { dialog, _ ->
                            dialog.dismiss()
                        }
                        .show()
                }
            }

            holder.setAudioControlButtonOnClickListener {
                Timber.d("ChatAdapter: Audio control button clicked for message id=${message.id}")
                if (playingMessageId == message.id) {
                    // Tapping stop on the currently playing message
                    Timber.d("ChatAdapter: Stopping playback for message id=${message.id}")
                    exoPlayer.stop()
                    cleanupPlayback(resetToReady = true)
                } else if (playingMessageId == null) {
                    Timber.d("ChatAdapter: No audio currently playing, starting playback for message id=${message.id}")
                    playingViewHolder = holder
                    playingMessageId = message.id
                    exoPlayer.addListener(audioPlayerListener)
                    try {
                        preparePlayer(message.audio!!)
                    } catch (e: Exception) {
                        Timber.e(e, "ChatAdapter: Error preparing player for audio message id=${message.id}")
                        CrashlyticsLog.recordNonFatalError(e, "ChatAdapter: Error preparing player for audio message id=${message.id}")
                    }
                } else {
                    // Different message tapped while another is playing — stop current, start new
                    Timber.d("ChatAdapter: Switching playback from message id=${playingMessageId} to message id=${message.id}")
                    exoPlayer.stop()
                    cleanupPlayback(resetToReady = true)
                    playingViewHolder = holder
                    playingMessageId = message.id
                    exoPlayer.addListener(audioPlayerListener)
                    try {
                        preparePlayer(message.audio!!)
                    } catch (e: Exception) {
                        Timber.e(e, "ChatAdapter: Error preparing player for audio message id=${message.id}")
                        CrashlyticsLog.recordNonFatalError(e, "ChatAdapter: Error preparing player for audio message id=${message.id}")
                    }
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "ChatAdapter: Error in loadAudio for message id=${message.id}")
            CrashlyticsLog.recordNonFatalError(e, "ChatAdapter: Error in loadAudio for message id=${message.id}")
        }
    }

    private val progressFrameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!isProgressCallbackActive) return
            runCatching {
                val holder = playingViewHolder ?: return
                val duration = exoPlayer.duration
                val position = exoPlayer.currentPosition
                if (duration > 0) {
                    holder.setProgress(position.toFloat() / duration.toFloat())
                    setAudioTime(holder, position)
                }
            }
            if (isProgressCallbackActive) {
                Choreographer.getInstance().postFrameCallback(this)
            }
        }
    }

    private fun startProgressUpdates() {
        if (isProgressCallbackActive) return
        isProgressCallbackActive = true
        Choreographer.getInstance().postFrameCallback(progressFrameCallback)
    }

    private fun stopProgressUpdates() {
        isProgressCallbackActive = false
    }

    private fun cleanupPlayback(resetToReady: Boolean) {
        stopProgressUpdates()
        lastDisplayedSeconds = -1L
        exoPlayer.removeListener(audioPlayerListener)
        if (playingViewHolder != null) {
            if (resetToReady) {
                val duration = exoPlayer.duration
                if (duration > 0) {
                    setAudioTime(playingViewHolder!!, duration, force = true)
                }
                playingViewHolder!!.setProgress(0f)
                playingViewHolder!!.setReady()
            }
            playingViewHolder = null
        }
        playingMessageId = null
    }

    private fun setAudioTime(holder: AudioViewHolder, millis: Long, force: Boolean = false) {
        val totalSeconds = TimeUnit.MILLISECONDS.toSeconds(millis)
        if (!force && totalSeconds == lastDisplayedSeconds) return
        lastDisplayedSeconds = totalSeconds
        val minutes = (totalSeconds / 60).toInt()
        val seconds = (totalSeconds % 60).toInt()
        holder.setTime(minutes, seconds)
    }

    private fun loadVideo(holder: VideoViewHolder, message: ChatEntity) {
        Timber.d("ChatAdapter: loadVideo called for message id=${message.id}")
        if (message.video == null) {
            Timber.w("ChatAdapter: No video url for message id=${message.id}, skipping loadVideo")
            return
        }

        holder.setVideoOnClickListener {
            Timber.d("ChatAdapter: Video thumbnail clicked for message id=${message.id}")
            // itemView.context is Hilt's FragmentContextWrapper (the chat fragment is a
            // @AndroidEntryPoint), not the Activity, so we must unwrap rather than cast.
            val activity = holder.itemView.context.findAppCompatActivity()
            if (activity == null) {
                Timber.e("ChatAdapter: Could not resolve host AppCompatActivity for video dialog, message id=${message.id}")
                CrashlyticsLog.recordNonFatalError(
                    IllegalStateException("No AppCompatActivity host for video dialog"),
                    "ChatAdapter: Could not resolve host AppCompatActivity for video dialog, message id=${message.id}"
                )
                return@setVideoOnClickListener
            }
            try {
                // Stop any playing audio and clean up before starting video
                if (playingMessageId != null) {
                    exoPlayer.stop()
                    cleanupPlayback(resetToReady = true)
                }
                val videoDialog = ShowVideoDialog(exoPlayer, message.video)
                // Show the dialog before starting playback so a failed show() never leaves
                // audio playing with no visible surface (the original silent-failure symptom).
                videoDialog.show(activity.supportFragmentManager, "video")
                preparePlayer(message.video)
                Timber.d("ChatAdapter: Video dialog shown for message id=${message.id}")
            } catch (e: Exception) {
                Timber.e(e, "ChatAdapter: Error showing video dialog for message id=${message.id}")
                CrashlyticsLog.recordNonFatalError(e, "ChatAdapter: Error showing video dialog for message id=${message.id}")
            }
        }
    }

    private fun preparePlayer(mediaUri: String) {
        Timber.d("ChatAdapter: preparePlayer called with mediaUri=$mediaUri")
        try {
            exoPlayer.apply {
                if (isPlaying) {
                    Timber.d("ChatAdapter: ExoPlayer is playing, stopping before preparing new media")
                    stop()
                }
                setMediaItem(MediaItem.fromUri(mediaUri))
                playWhenReady = true
                prepare()
                Timber.d("ChatAdapter: ExoPlayer prepared and ready to play")
            }
        } catch (e: Exception) {
            Timber.e(e, "ChatAdapter: Error preparing ExoPlayer with mediaUri=$mediaUri")
            CrashlyticsLog.recordNonFatalError(e, "ChatAdapter: Error preparing ExoPlayer with mediaUri=$mediaUri")
        }
    }
}

internal object ChatMessageSpacing {
    private const val GROUP_WINDOW_MS = 5 * 60 * 1000L

    fun calculate(position: Int, messages: List<ChatEntity>): MessageSpacing {
        val message = messages.getOrNull(position)
        if (message == null || !message.isDisplayMessage()) {
            return MessageSpacing()
        }
        val topNeighbor = messages.getOrNull(position + 1)
        val bottomNeighbor = messages.getOrNull(position - 1)
        val compactTop = message.canGroupWith(topNeighbor)
        val compactBottom = message.canGroupWith(bottomNeighbor)

        return MessageSpacing(
            compactTop = compactTop,
            compactBottom = compactBottom,
            useMediaTopMargin = compactTop && message.touchesMedia(topNeighbor),
            useMediaBottomMargin = compactBottom && message.touchesMedia(bottomNeighbor)
        )
    }

    private fun ChatEntity.canGroupWith(other: ChatEntity?): Boolean {
        if (other == null || !other.isDisplayMessage()) {
            return false
        }
        if (!hasSameVisualSender(other)) {
            return false
        }
        return abs(createdAt - other.createdAt) <= GROUP_WINDOW_MS
    }

    private fun ChatEntity.hasSameVisualSender(other: ChatEntity): Boolean {
        if (sender != other.sender) {
            return false
        }
        return if (sender == ChatEntity.SENDER_WATCH) {
            receiver == other.receiver
        } else {
            true
        }
    }

    private fun ChatEntity.touchesMedia(other: ChatEntity?): Boolean {
        return isMediaMessage() || other?.isMediaMessage() == true
    }
}

private fun ChatEntity.isDisplayMessage(): Boolean {
    return when (type) {
        ChatEntity.TYPE_AUDIO,
        ChatEntity.TYPE_IMAGE,
        ChatEntity.TYPE_TEXT,
        ChatEntity.TYPE_VIDEO -> true

        else -> false
    }
}

private fun ChatEntity.isMediaMessage(): Boolean {
    return type == ChatEntity.TYPE_IMAGE || type == ChatEntity.TYPE_VIDEO
}

private fun ChatEntity.bubbleBackgroundRes(showTail: Boolean): Int {
    val isIncoming = sender == ChatEntity.SENDER_WATCH
    return when (type) {
        ChatEntity.TYPE_TEXT,
        ChatEntity.TYPE_AUDIO -> when {
            isIncoming && showTail -> R.drawable.background_message_from
            isIncoming -> R.drawable.background_message_from_no_tail
            showTail -> R.drawable.background_message_to
            else -> R.drawable.background_message_to_no_tail
        }

        ChatEntity.TYPE_IMAGE,
        ChatEntity.TYPE_VIDEO -> if (isIncoming) {
            R.drawable.background_image_message_from
        } else {
            R.drawable.background_image_message_to
        }

        else -> 0
    }
}

internal data class MessageSpacing(
    val compactTop: Boolean = false,
    val compactBottom: Boolean = false,
    val useMediaTopMargin: Boolean = false,
    val useMediaBottomMargin: Boolean = false
) {
    val showTimestamp: Boolean = !compactBottom
    val showGroupSenderHeader: Boolean = !compactTop
    val showBubbleTail: Boolean = !compactTop
}

private fun View.updateVerticalMargins(top: Int, bottom: Int): View {
    val params = layoutParams as? ViewGroup.MarginLayoutParams ?: return this
    if (params.topMargin == top && params.bottomMargin == bottom) {
        return this
    }
    params.topMargin = top
    params.bottomMargin = bottom
    layoutParams = params
    return this
}

private fun View.updateVisibility(newVisibility: Int) {
    if (visibility != newVisibility) {
        visibility = newVisibility
    }
}

private fun View.updateBubbleBackground(message: ChatEntity?, spacing: MessageSpacing) {
    val backgroundRes = message?.bubbleBackgroundRes(spacing.showBubbleTail) ?: return
    if (backgroundRes != 0) {
        setBackgroundResource(backgroundRes)
    }
}

private class DiffCallback : DiffUtil.ItemCallback<ChatEntity>() {
    override fun areItemsTheSame(oldMessage: ChatEntity, newMessage: ChatEntity): Boolean {
        val same = oldMessage.id == newMessage.id
        Timber.v("ChatAdapter: areItemsTheSame: oldId=${oldMessage.id}, newId=${newMessage.id}, result=$same")
        return same
    }

    override fun areContentsTheSame(oldMessage: ChatEntity, newMessage: ChatEntity): Boolean {
        val same = oldMessage.createdAt == newMessage.createdAt
                && oldMessage.sender == newMessage.sender
                && oldMessage.type == newMessage.type
                && oldMessage.status == newMessage.status
                && oldMessage.text == newMessage.text
                && oldMessage.image == newMessage.image
                && oldMessage.audio == newMessage.audio
                && oldMessage.audioDuration == newMessage.audioDuration
                && oldMessage.audioWaveform == newMessage.audioWaveform
                && oldMessage.video == newMessage.video
                && oldMessage.groupSenderName == newMessage.groupSenderName
                && oldMessage.groupSenderImage == newMessage.groupSenderImage
        Timber.v("ChatAdapter: areContentsTheSame: oldId=${oldMessage.id}, newId=${newMessage.id}, result=$same")
        return same
    }

    override fun getChangePayload(oldMessage: ChatEntity, newMessage: ChatEntity): Any? {
        val statusChanged = oldMessage.status != newMessage.status
        val groupSenderNameChanged = oldMessage.groupSenderName != newMessage.groupSenderName
        val groupSenderImageChanged = oldMessage.groupSenderImage != newMessage.groupSenderImage

        val onlySupportedChanges =
            oldMessage.createdAt == newMessage.createdAt
                    && oldMessage.sender == newMessage.sender
                    && oldMessage.type == newMessage.type
                    && oldMessage.text == newMessage.text
                    && oldMessage.image == newMessage.image
                    && oldMessage.audio == newMessage.audio
                    && oldMessage.audioDuration == newMessage.audioDuration
                    && oldMessage.video == newMessage.video

        if (!onlySupportedChanges) {
            return null
        }

        if (!statusChanged && !groupSenderNameChanged && !groupSenderImageChanged) {
            return null
        }

        return ChatAdapter.MessageChangePayload(
            statusChanged = statusChanged,
            groupSenderNameChanged = groupSenderNameChanged,
            groupSenderImageChanged = groupSenderImageChanged
        )
    }
}
