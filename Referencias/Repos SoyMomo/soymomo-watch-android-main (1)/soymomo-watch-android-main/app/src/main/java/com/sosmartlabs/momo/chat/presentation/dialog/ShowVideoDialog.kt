package com.sosmartlabs.momo.chat.presentation.dialog

import android.annotation.SuppressLint
import android.app.Dialog
import android.os.Bundle
import android.view.GestureDetector
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.Window
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.core.view.marginTop
import androidx.core.view.updateLayoutParams
import androidx.core.view.updatePadding
import androidx.fragment.app.DialogFragment
import com.bumptech.glide.Glide
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.PlaybackException
import com.google.android.exoplayer2.Player
import com.google.android.exoplayer2.util.Util
import com.google.android.material.slider.Slider
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogShowVideoBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber
import java.util.Formatter
import java.util.Locale
import kotlin.math.abs

/**
 * Dialog intended for showing videos from chat in fullscreen.
 *
 * Uses a bespoke, Material 3 styled control overlay (a real [Slider] scrubber,
 * a centered play/pause/replay button and mm:ss time labels) rather than the stock
 * ExoPlayer controller, plus a thumbnail poster, an error/retry state, a mute toggle
 * and swipe-down-to-dismiss, so the experience stays in-tone with the rest of the app.
 *
 * The no-arg constructor exists only so the system can recreate the fragment after
 * process death; in that case there is no player to bind and the dialog dismisses
 * itself (see [onCreate]) instead of crashing on a missing constructor.
 */
class ShowVideoDialog() : DialogFragment() {

    private var boundPlayer: ExoPlayer? = null
    private var videoUrl: String? = null

    /**
     * @param exoPlayer Player for play the video
     * @param videoUrl Source used to show a thumbnail poster while the first frame loads
     */
    constructor(exoPlayer: ExoPlayer, videoUrl: String? = null) : this() {
        this.boundPlayer = exoPlayer
        this.videoUrl = videoUrl
    }

    /** Non-null player accessor; only valid after the [boundPlayer] null-guard. */
    private val exoPlayer: ExoPlayer get() = boundPlayer!!

    /**
     * ViewBinding for this dialog
     */
    private lateinit var binding: DialogShowVideoBinding

    private val formatBuilder = StringBuilder()
    private val formatter = Formatter(formatBuilder, Locale.getDefault())

    /** True while the user is dragging the scrubber, so periodic updates don't fight them. */
    private var isUserScrubbing = false

    /** True while the user is dragging the whole view down to dismiss. */
    private var isDismissDragging = false

    private var controlsVisible = true
    private var isMuted = false

    private lateinit var gestureDetector: GestureDetector

    private val controlViews by lazy {
        listOf(
            binding.closeButton,
            binding.muteButton,
            binding.playPauseButton,
            binding.topScrim,
            binding.bottomScrim,
            binding.bottomBar
        )
    }

    private val progressUpdater = object : Runnable {
        override fun run() {
            updateProgress()
            binding.videoSlider.postDelayed(this, PROGRESS_INTERVAL_MS)
        }
    }

    private val hideControlsRunnable = Runnable { setControlsVisible(false) }

    private val playerListener = object : Player.Listener {
        override fun onPlaybackStateChanged(playbackState: Int) {
            if (!binding.errorContainer.isVisible) {
                binding.buffering.isVisible = playbackState == Player.STATE_BUFFERING
            }
            when (playbackState) {
                Player.STATE_READY -> updateProgress()
                // Surface the controls (with a replay affordance) at the end.
                Player.STATE_ENDED -> setControlsVisible(visible = true, autoHide = false)
            }
            updatePlayPauseIcon()
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            updatePlayPauseIcon()
            binding.root.keepScreenOn = isPlaying
            if (isPlaying) scheduleAutoHide() else cancelAutoHide()
        }

        override fun onRenderedFirstFrame() {
            binding.poster.isVisible = false
        }

        override fun onPlayerError(error: PlaybackException) {
            Timber.e(error, "ShowVideoDialog: player error")
            CrashlyticsLog.recordNonFatalError(error, "ShowVideoDialog: player error")
            showError(true)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        Timber.d("ShowVideoDialog: onCreate called")
        super.onCreate(savedInstanceState)
        if (boundPlayer == null) {
            // Recreated by the system (e.g. after process death) without a player
            // reference; there is nothing to show, so dismiss instead of crashing.
            Timber.w("ShowVideoDialog: recreated without a player, dismissing")
            dismissAllowingStateLoss()
            return
        }
        setStyle(STYLE_NORMAL, R.style.AppTheme_FullScreenDialog)
        Timber.d("ShowVideoDialog: setStyle applied")
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("ShowVideoDialog: onCreateView called")
        if (boundPlayer == null) return View(inflater.context)
        binding = DialogShowVideoBinding.inflate(inflater, container, false)
        Timber.d("ShowVideoDialog: ViewBinding inflated successfully")
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("ShowVideoDialog: onViewCreated called")
        super.onViewCreated(view, savedInstanceState)
        if (boundPlayer == null) return
        binding.playerView.player = exoPlayer
        Timber.d("ShowVideoDialog: ExoPlayer set to playerView")

        setupPoster()
        applyWindowInsets()
        setupControls()
        setupGestures()

        exoPlayer.addListener(playerListener)
        isMuted = exoPlayer.volume == 0f
        updateMuteIcon()
        binding.buffering.isVisible = exoPlayer.playbackState == Player.STATE_BUFFERING
        binding.root.keepScreenOn = exoPlayer.isPlaying
        updatePlayPauseIcon()
        updateProgress()
        startProgressUpdates()
        setControlsVisible(visible = true)
    }

    private fun setupPoster() {
        if (videoUrl != null) {
            binding.poster.isVisible = true
            Glide.with(binding.poster).load(videoUrl).into(binding.poster)
        }
    }

    /**
     * Keep the controls clear of the system bars on any device: the close/mute buttons
     * below the status bar/notch, and the bottom control bar above the gesture bar so the
     * scrubber never fights the home indicator. The video stays full-bleed behind them.
     */
    private fun applyWindowInsets() {
        val baseTopMargin = binding.closeButton.marginTop
        val baseBottomPadding = binding.bottomBar.paddingBottom
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            binding.closeButton.updateLayoutParams<ViewGroup.MarginLayoutParams> {
                topMargin = baseTopMargin + systemBars.top
            }
            binding.muteButton.updateLayoutParams<ViewGroup.MarginLayoutParams> {
                topMargin = baseTopMargin + systemBars.top
            }
            binding.bottomBar.updatePadding(bottom = baseBottomPadding + systemBars.bottom)
            insets
        }
    }

    private fun setupControls() {
        binding.closeButton.setOnClickListener {
            Timber.d("ShowVideoDialog: Close button clicked, dismissing")
            dismiss()
        }

        binding.playPauseButton.setOnClickListener {
            togglePlayPause()
            scheduleAutoHide()
        }

        binding.muteButton.setOnClickListener {
            isMuted = !isMuted
            exoPlayer.volume = if (isMuted) 0f else 1f
            updateMuteIcon()
            scheduleAutoHide()
        }

        binding.retryButton.setOnClickListener {
            showError(false)
            // showError(true) hid the controls; bring them back on recovery like the
            // initial-load path so the user isn't left with a playing video and no close.
            setControlsVisible(true)
            exoPlayer.seekTo(0)
            exoPlayer.prepare()
            exoPlayer.playWhenReady = true
        }

        binding.videoSlider.addOnChangeListener { _, value, fromUser ->
            if (fromUser) {
                val duration = exoPlayer.duration
                if (duration > 0) {
                    binding.positionText.text = formatTime(sliderValueToMs(value, duration))
                }
            }
        }

        binding.videoSlider.addOnSliderTouchListener(object : Slider.OnSliderTouchListener {
            override fun onStartTrackingTouch(slider: Slider) {
                isUserScrubbing = true
                cancelAutoHide()
            }

            override fun onStopTrackingTouch(slider: Slider) {
                isUserScrubbing = false
                val duration = exoPlayer.duration
                if (duration > 0) {
                    exoPlayer.seekTo(sliderValueToMs(slider.value, duration))
                }
                scheduleAutoHide()
            }
        })
    }

    /**
     * Single tap toggles the controls, double tap on the left/right half seeks ±5s, and a
     * downward drag on the video slides the whole view away to dismiss.
     */
    @SuppressLint("ClickableViewAccessibility")
    private fun setupGestures() {
        gestureDetector = GestureDetector(requireContext(), object : GestureDetector.SimpleOnGestureListener() {
            override fun onSingleTapConfirmed(e: MotionEvent): Boolean {
                if (binding.errorContainer.isVisible) return false
                setControlsVisible(!controlsVisible)
                return true
            }

            override fun onDoubleTap(e: MotionEvent): Boolean {
                val duration = exoPlayer.duration
                if (binding.errorContainer.isVisible || duration <= 0) return false
                val forward = e.x > binding.root.width / 2f
                val target = (exoPlayer.currentPosition + if (forward) SEEK_STEP_MS else -SEEK_STEP_MS)
                    .coerceIn(0L, duration)
                exoPlayer.seekTo(target)
                updateProgress()
                setControlsVisible(true)
                return true
            }

            override fun onScroll(
                e1: MotionEvent?,
                e2: MotionEvent,
                distanceX: Float,
                distanceY: Float
            ): Boolean {
                if (e1 == null || binding.errorContainer.isVisible) return false
                // Use raw (screen) coordinates: we translate binding.root, and local
                // coordinates of a descendant are offset by that translation, which would
                // create a feedback loop (jitter / half-speed drag). Raw coords are immune.
                val dy = e2.rawY - e1.rawY
                val dx = e2.rawX - e1.rawX
                if (isDismissDragging || (dy > 0 && abs(dy) > abs(dx))) {
                    isDismissDragging = true
                    val clamped = dy.coerceAtLeast(0f)
                    binding.root.translationY = clamped
                    val fraction = (clamped / dismissThreshold()).coerceIn(0f, 1f)
                    binding.root.alpha = 1f - DISMISS_MAX_FADE * fraction
                    return true
                }
                return false
            }
        })

        binding.playerView.setOnTouchListener { _, event ->
            gestureDetector.onTouchEvent(event)
            if (event.actionMasked == MotionEvent.ACTION_UP ||
                event.actionMasked == MotionEvent.ACTION_CANCEL
            ) {
                if (isDismissDragging) finishDismissDrag()
            }
            true
        }
    }

    private fun dismissThreshold(): Float =
        (binding.root.height * DISMISS_FRACTION).coerceAtLeast(1f)

    private fun finishDismissDrag() {
        isDismissDragging = false
        val root = binding.root
        if (root.translationY > dismissThreshold()) {
            root.animate()
                .translationY(root.height.toFloat())
                .alpha(0f)
                .setDuration(DISMISS_ANIM_MS)
                .withEndAction { dismissAllowingStateLoss() }
                .start()
        } else {
            root.animate()
                .translationY(0f)
                .alpha(1f)
                .setDuration(DISMISS_ANIM_MS)
                .start()
        }
    }

    private fun togglePlayPause() {
        if (exoPlayer.playbackState == Player.STATE_ENDED) {
            exoPlayer.seekTo(0)
            exoPlayer.playWhenReady = true
        } else {
            exoPlayer.playWhenReady = !exoPlayer.playWhenReady
        }
    }

    private fun updatePlayPauseIcon() {
        val (icon, description) = when {
            exoPlayer.playbackState == Player.STATE_ENDED -> R.drawable.ic_replay to R.string.video_replay
            exoPlayer.isPlaying -> R.drawable.ic_pause to R.string.video_pause
            else -> R.drawable.ic_play_arrow to R.string.video_play
        }
        binding.playPauseButton.setImageResource(icon)
        binding.playPauseButton.contentDescription = getString(description)
    }

    private fun updateMuteIcon() {
        binding.muteButton.setImageResource(
            if (isMuted) R.drawable.ic_volume_off else R.drawable.ic_volume_up
        )
        binding.muteButton.contentDescription =
            getString(if (isMuted) R.string.video_unmute else R.string.video_mute)
    }

    private fun showError(show: Boolean) {
        binding.errorContainer.isVisible = show
        if (show) {
            binding.buffering.isVisible = false
            binding.poster.isVisible = false
            setControlsVisible(visible = false, autoHide = false)
        }
    }

    private fun updateProgress() {
        val duration = exoPlayer.duration
        val position = exoPlayer.currentPosition
        binding.durationText.text = formatTime(if (duration > 0) duration else 0L)
        if (!isUserScrubbing) {
            binding.positionText.text = formatTime(if (position > 0) position else 0L)
            binding.videoSlider.value = if (duration > 0) {
                (position.toFloat() / duration * SLIDER_MAX).coerceIn(0f, SLIDER_MAX)
            } else {
                0f
            }
        }
    }

    private fun sliderValueToMs(value: Float, duration: Long): Long =
        (value / SLIDER_MAX * duration).toLong()

    private fun formatTime(millis: Long): String =
        Util.getStringForTime(formatBuilder, formatter, millis)

    private fun startProgressUpdates() {
        binding.videoSlider.removeCallbacks(progressUpdater)
        binding.videoSlider.post(progressUpdater)
    }

    private fun stopProgressUpdates() {
        binding.videoSlider.removeCallbacks(progressUpdater)
    }

    private fun setControlsVisible(visible: Boolean, autoHide: Boolean = true) {
        controlsVisible = visible
        controlViews.forEach { view ->
            view.animate().cancel()
            if (visible) {
                view.visibility = View.VISIBLE
                view.animate().alpha(1f).setDuration(FADE_MS).start()
            } else {
                view.animate().alpha(0f).setDuration(FADE_MS)
                    .withEndAction { view.visibility = View.GONE }
                    .start()
            }
        }
        if (visible && autoHide) scheduleAutoHide() else cancelAutoHide()
    }

    private fun scheduleAutoHide() {
        cancelAutoHide()
        if (exoPlayer.isPlaying) {
            binding.root.postDelayed(hideControlsRunnable, CONTROLS_TIMEOUT_MS)
        }
    }

    private fun cancelAutoHide() {
        binding.root.removeCallbacks(hideControlsRunnable)
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        Timber.d("ShowVideoDialog: onCreateDialog called")
        val dialog = super.onCreateDialog(savedInstanceState)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        Timber.d("ShowVideoDialog: Window feature NO_TITLE requested")
        return dialog
    }

    override fun onPause() {
        Timber.d("ShowVideoDialog: onPause called")
        // Pause (do NOT stop()) so the video is resumable when the user returns after a
        // Home press / screen lock / incoming call. stop() drops the shared player to
        // STATE_IDLE with no re-prepare path here, which would freeze the video (the play
        // button is a no-op in IDLE) until the dialog is closed and reopened.
        if (boundPlayer != null && exoPlayer.isPlaying) {
            Timber.d("ShowVideoDialog: pausing playback")
            try {
                exoPlayer.playWhenReady = false
            } catch (e: Exception) {
                Timber.e("ShowVideoDialog: Error pausing ExoPlayer in onPause: $e")
                CrashlyticsLog.recordNonFatalError(e, "ShowVideoDialog: Error pausing ExoPlayer in onPause")
            }
        }
        super.onPause()
    }

    override fun onDestroyView() {
        Timber.d("ShowVideoDialog: onDestroyView called")
        if (boundPlayer != null) {
            stopProgressUpdates()
            cancelAutoHide()
            exoPlayer.removeListener(playerListener)
            // The player is shared with chat audio playback, so restore full volume:
            // muting the video must not leave later audio messages silent.
            exoPlayer.volume = 1f
            binding.root.keepScreenOn = false
            binding.playerView.player = null
        }
        super.onDestroyView()
    }

    companion object {
        /** Fixed slider range; the player position is mapped onto it as a fraction. */
        private const val SLIDER_MAX = 1000f
        private const val PROGRESS_INTERVAL_MS = 250L
        private const val CONTROLS_TIMEOUT_MS = 3000L
        private const val FADE_MS = 200L
        private const val SEEK_STEP_MS = 5000L
        private const val DISMISS_FRACTION = 0.18f
        private const val DISMISS_MAX_FADE = 0.5f
        private const val DISMISS_ANIM_MS = 180L
    }
}
