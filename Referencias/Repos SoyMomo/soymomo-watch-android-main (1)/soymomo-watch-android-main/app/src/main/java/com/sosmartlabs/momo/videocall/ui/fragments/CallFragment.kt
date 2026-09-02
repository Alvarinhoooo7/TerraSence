package com.sosmartlabs.momo.videocall.ui.fragments

import android.graphics.drawable.Drawable
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Bundle
import android.os.Handler
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.res.ResourcesCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.navArgs
import com.parse.ParseCloud
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentCallBinding
import com.sosmartlabs.momo.videocall.model.IceServerData
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.extensions.hide
import com.sosmartlabs.momo.utils.extensions.show
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momo.videocall.CallActivity
import com.sosmartlabs.momo.videocall.model.VideoDimensions
import com.sosmartlabs.momo.videocall.model.VideocallSignalState
import com.sosmartlabs.momo.videocall.soymomowebrtc.interfaces.VideocallState
import com.sosmartlabs.momo.videocall.soymomowebrtc.utils.CameraUtils
import com.sosmartlabs.momo.videocall.soymomowebrtc.utils.VideocallUtils
import com.sosmartlabs.momo.videocall.ui.VideocallStatsViewModel
import com.sosmartlabs.momo.videocall.ui.VideocallViewModel
import com.sosmartlabs.momo.videocall.utils.EdgeToEdgeHelper
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.webrtc.RendererCommon
import timber.log.Timber
import java.util.*

@ExperimentalCoroutinesApi
@AndroidEntryPoint
class CallFragment : Fragment(R.layout.fragment_call) {
    private lateinit var fragmentCallBinding: FragmentCallBinding
    private var type: String? = null
    private var typeId: String? = null
    private var isOutgoing: Boolean = true
    private var contactName: String? = null
    private var contactImage: String? = null
    private var iceServerData: IceServerData? = null
    private lateinit var wearerDeviceId: String
    private val hangupHandler: Handler = Handler()
    private val ringToneGenerator: ToneGenerator = ToneGenerator(AudioManager.STREAM_RING, Int.MAX_VALUE)
    private val args: CallFragmentArgs by navArgs()
    private val videocallViewModel: VideocallViewModel by activityViewModels()
    private val videocallStatsViewModel: VideocallStatsViewModel by activityViewModels()
    private var feedbackUuid: UUID? = null
    private val hangupRunnable = Runnable {
        Timber.i("CallFragment: RING_TIMEOUT reached, stopping ringtone and ending call as 'noAnswer'")
        ringToneGenerator.stopTone()
        try {
            (activity as CallActivity).endRTCCall(null, "00:00", "noAnswer")
        } catch (e: Exception) {
            Timber.e(e, "CallFragment: Error ending RTCCall after ring timeout")
            CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error ending RTCCall after ring timeout")
        }
    }
    
    /**
     * True once this fragment instance has dialled. [onViewCreated] runs again whenever the view
     * is re-created on the same instance — notably when `endCallFragment` is popped back to
     * `callFragment` — and without this the outgoing branch would re-send the `videocallUserToWatch`
     * push and start a second call the parent never asked for.
     */
    private var hasStartedCall = false

    private var isRemoteVideoVisible = false
    private val remoteVideoTimeoutHandler: Handler = Handler()
    private val remoteVideoTimeoutRunnable = Runnable {
        Timber.i("CallFragment: Remote video timeout (5s) reached, showing remote video view")
        showRemoteVideo()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.i("CallFragment: onCreate called")
        try {
            isOutgoing = args.isOutgoing
            type = args.type
            typeId = args.typeId
            contactName = args.contactName
            contactImage = args.contactImage
            iceServerData = args.iceServerData
            wearerDeviceId = args.wearerDeviceId
            Timber.d("CallFragment: Args loaded: isOutgoing=$isOutgoing, type=$type, typeId=$typeId, contactName=$contactName, wearerDeviceId=$wearerDeviceId")
        } catch (e: Exception) {
            Timber.e(e, "CallFragment: Error loading arguments in onCreate")
            CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error loading arguments in onCreate")
        }

        // Only creates a new Feedback if doesn't have one
        if (feedbackUuid == null) {
            Timber.i("CallFragment: Creating feedback if needed for wearerDeviceId=$wearerDeviceId, type=$type, typeId=$typeId")
            try {
                videocallViewModel.createFeedbackIfNeeded(wearerDeviceId, type!!, typeId!!)
            } catch (e: Exception) {
                Timber.e(e, "CallFragment: Error creating feedback in onCreate")
                CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error creating feedback in onCreate")
            }
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.i("CallFragment: onCreateView called")
        fragmentCallBinding = FragmentCallBinding.inflate(inflater, container, false).apply {
            declineButton.setOnClickListener {
                Timber.i("CallFragment: Decline button clicked")
                val durationString = callTime.text
                ringToneGenerator.stopTone()
                try {
                    (activity as CallActivity).endRTCCall(feedbackUuid, durationString.toString(), "decline")
                } catch (e: Exception) {
                    Timber.e(e, "CallFragment: Error ending RTCCall on decline")
                    CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error ending RTCCall on decline")
                }
            }
            localView.setZOrderMediaOverlay(true)
            localView.setZOrderOnTop(true)
            
            // Initially hide remote video until we receive dimensions or timeout
            remoteView.visibility = View.INVISIBLE
            Timber.d("CallFragment: Remote video initially hidden")

            contactName.text = this@CallFragment.contactName
            contactImage.loadImage(this@CallFragment.contactImage, fallback = DefaultIcons.PROFILE_MOMO_SPACE)

            muteButton.setOnClickListener {
                Timber.i("CallFragment: Mute button clicked")
                try {
                    val isMuted = (activity as CallActivity).isAudioMuted()
                    if (isMuted) {
                        muteButton.setImageResource(R.drawable.ic_vector_microphone_off)
                    } else {
                        muteButton.setImageResource(R.drawable.ic_vector_microphone)
                    }
                    (activity as CallActivity).muteAudio(!isMuted)
                } catch (e: Exception) {
                    Timber.e(e, "CallFragment: Error toggling mute")
                    CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error toggling mute")
                }
            }

            if (!CameraUtils.isSwitchCameraSupported(requireContext())) {
                Timber.i("CallFragment: Switch camera not supported, hiding button")
                switchCameraButton.visibility = View.INVISIBLE
            }
            switchCameraButton.setOnClickListener {
                Timber.i("CallFragment: Switch camera button clicked")
                try {
                    (activity as CallActivity).switchCamera()
                } catch (e: Exception) {
                    Timber.e(e, "CallFragment: Error switching camera")
                    CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error switching camera")
                }
            }
        }

        if (isOutgoing && videocallViewModel.isSpace3) {
            Timber.i("CallFragment: Outgoing call to Space3, showing connecting UI")
            fragmentCallBinding.videocallStatus.hide()
            fragmentCallBinding.videocallConnecting.visibility = View.VISIBLE
        } else {
            fragmentCallBinding.videocallConnecting.visibility = View.GONE
        }

        return fragmentCallBinding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.i("CallFragment: onViewCreated called")

        setupEdgeToEdge()

        videocallViewModel.currentFeedbackUUID.observe(viewLifecycleOwner) {
            Timber.d("CallFragment: Feedback UUID updated: $it")
            feedbackUuid = it
        }

        videocallViewModel.callConnected.observe(viewLifecycleOwner) { connected ->
            Timber.i("CallFragment: callConnected observed: $connected")
            if (connected) {
                fragmentCallBinding.videocallConnecting.text = getString(R.string.videocall_dialing)
            } else {
                fragmentCallBinding.videocallConnecting.text = getString(R.string.videocall_connecting_space3)
            }
        }

        Timber.d("CallFragment: Posting hangup handler for ring timeout (${VideocallUtils.RING_TIMEOUT_MS}ms)")
        hangupHandler.postDelayed(hangupRunnable, VideocallUtils.RING_TIMEOUT_MS.toLong())

        if (hasStartedCall) {
            // The view was re-created on an instance that has already dialled — e.g.
            // endCallFragment popped back to callFragment. Re-running this block would send a
            // second videocallUserToWatch push and ring the child's watch again.
            Timber.w("CallFragment: View re-created after dialling, not re-sending the call")
            CrashlyticsLog.log("CallFragment: Skipped re-dial on view re-creation")
        } else if (isOutgoing) {
            hasStartedCall = true
            Timber.i("CallFragment: Outgoing call, sending push notification to watch")
            CrashlyticsLog.log("CallFragment: Sending videocall push notification to watch")
            val params = HashMap<String, String?>()
            try {
                params["userId"] = ParseUser.getCurrentUser().objectId
                params["deviceId"] = wearerDeviceId
                params["timestamp"] = VideocallUtils.SDF_VIDEOCALL.format(Date())
            } catch (e: Exception) {
                Timber.e(e, "CallFragment: Error preparing push notification params")
                CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error preparing push notification params")
            }
            try {
                ParseCloud.callFunctionInBackground<Any>("videocallUserToWatch", params) { _, e ->
                    if (e != null) {
                        Timber.e(e, "CallFragment: Error in videocallUserToWatch cloud function")
                        CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error in videocallUserToWatch cloud function")
                    } else {
                        Timber.i("CallFragment: videocallUserToWatch cloud function sent successfully")
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "CallFragment: Exception sending push notification to watch")
                CrashlyticsLog.recordNonFatalError(e, "CallFragment: Exception sending push notification to watch")
            }

            Handler().postDelayed({
                if (isOutgoing) {
                    Timber.i("CallFragment: Starting ringtone for outgoing call")
                    ringToneGenerator.startTone(ToneGenerator.TONE_SUP_RINGTONE, VideocallUtils.RING_TIMEOUT_MS)
                }
            }, 1000)

            try {
                Timber.i("CallFragment: Initializing RTCClient for outgoing call (userId=${ParseUser.getCurrentUser().objectId})")
                (activity as CallActivity).initRTCClient(fragmentCallBinding, iceServerData!!, ParseUser.getCurrentUser().objectId)
            } catch (e: Exception) {
                Timber.e(e, "CallFragment: Error initializing RTCClient for outgoing call")
                CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error initializing RTCClient for outgoing call")
            }
        } else {
            hasStartedCall = true
            try {
                Timber.i("CallFragment: Initializing RTCClient for incoming call (typeId=$typeId)")
                (activity as CallActivity).initRTCClient(fragmentCallBinding, iceServerData!!, typeId!!)
            } catch (e: Exception) {
                Timber.e(e, "CallFragment: Error initializing RTCClient for incoming call")
                CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error initializing RTCClient for incoming call")
            }
        }

        videocallViewModel.elapsedCallTime.observe(viewLifecycleOwner) { time ->
            val seconds = time % 60
            val minutes = time / 60
            fragmentCallBinding.callTime.text = String.format(Locale.getDefault(),"%02d:%02d",minutes, seconds)
        }

        videocallViewModel.videocallStatus.observe(viewLifecycleOwner) {
            Timber.d("CallFragment: videocallStatus observed: $it")
            if (it == VideocallState.CONNECTED) {
                Timber.i("CallFragment: VideocallState.CONNECTED detected, initializing RTC call UI")
                initRTCCall()
                // Start 5-second timeout to show remote video if dimensions are not received
                startRemoteVideoTimeout()
            }
        }

        // Observe remote video dimensions and adjust aspect ratio
        videocallStatsViewModel.connectionMachine.remoteVideoDimensions.observe(viewLifecycleOwner) { dimensions ->
            Timber.w("CallFragment: Remote video dimensions received: $dimensions")
            dimensions?.let {
                if (it.isValid()) {
                    Timber.i("CallFragment: Remote video dimensions received: ${it.width}x${it.height}")
                    adjustRemoteVideoAspectRatio(it)
                    // Show remote video once we have valid dimensions
                    showRemoteVideo()
                } else {
                    Timber.w("CallFragment: Invalid video dimensions received: ${it.width}x${it.height}")
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        Timber.i("CallFragment: onDestroyView called, cleaning up resources")
        try {
            ringToneGenerator.stopTone()
        } catch (e: Exception) {
            Timber.e(e, "CallFragment: Error stopping ringtone in onDestroyView")
            CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error stopping ringtone in onDestroyView")
        }
        try {
            with(fragmentCallBinding) {
                localView.release()
                remoteView.release()
            }
        } catch (e: Exception) {
            Timber.e(e, "CallFragment: Error releasing video views in onDestroyView")
            CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error releasing video views in onDestroyView")
        }
        hangupHandler.removeCallbacksAndMessages(null)
        remoteVideoTimeoutHandler.removeCallbacksAndMessages(null)
    }

    fun setupEdgeToEdge() {
        EdgeToEdgeHelper.applyControlsInsets(
            view = fragmentCallBinding.topLayout,
            activity = (activity as CallActivity),
            applyTop = true,    // Keep content below status bar
            applyBottom = false  // Keep content above navigation bar (if button nav)
        ) { systemBars, cutout, navBars ->
            Timber.d("CallFragment: Controls insets applied to top layout - top: ${systemBars.top}")
        }

        EdgeToEdgeHelper.applyControlsInsets(
            view = fragmentCallBinding.bottomLayout,
            activity = (activity as CallActivity),
            applyTop = false,    // Keep content below status bar
            applyBottom = true  // Keep content above navigation bar (if button nav)
        ) { systemBars, cutout, navBars ->
            Timber.d("CallFragment: Controls insets applied to bottom layout - bottom: ${navBars.bottom}")
        }
    }

    private fun watchSignal() {
        Timber.i("CallFragment: watchSignal called, showing signal indicators")
        fragmentCallBinding.localSignal.show()
        fragmentCallBinding.remoteSignal.show()

        videocallStatsViewModel.connectionMachine.userReport.observe(viewLifecycleOwner) {
            val drawable = getSignalDrawable(it)
            fragmentCallBinding.localSignal.setImageDrawable(drawable)
            Timber.d("CallFragment: Updated local signal drawable: $it")
        }

        videocallStatsViewModel.connectionMachine.watchReport.observe(viewLifecycleOwner) {
            val drawable = getSignalDrawable(it)
            fragmentCallBinding.remoteSignal.setImageDrawable(drawable)
            Timber.d("CallFragment: Updated remote signal drawable: $it")
        }
    }

    private fun getSignalDrawable(signalState: VideocallSignalState?): Drawable? {
        return when (signalState) {
            VideocallSignalState.CONNECTION_LOW -> {
                Timber.d("CallFragment: Signal state CONNECTION_LOW")
                ResourcesCompat.getDrawable(resources, R.drawable.low_signal, null)
            }
            VideocallSignalState.CONNECTION_MID -> {
                Timber.d("CallFragment: Signal state CONNECTION_MID")
                ResourcesCompat.getDrawable(resources, R.drawable.mid_signal, null)
            }
            else -> {
                Timber.d("CallFragment: Signal state CONNECTION_HIGH or unknown")
                ResourcesCompat.getDrawable(resources, R.drawable.high_signal, null)
            }
        }
    }

    private fun adjustRemoteVideoAspectRatio(dimensions: VideoDimensions) {
        try {
            val remoteView = fragmentCallBinding.remoteView
            Timber.d("CallFragment: Adjusting remote video aspect ratio to ${dimensions.width}x${dimensions.height}")

            // Retrieve the display metrics to get screen dimensions
            val displayMetrics = resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels

            // Calculate the proportional height based on the aspect ratio
            val aspectRatio = dimensions.height.toFloat() / dimensions.width.toFloat()
            val calculatedHeight = (screenWidth * aspectRatio).toInt()

            // Set the layout parameters to adjust the size of the SurfaceViewRenderer
            val layoutParams = remoteView.layoutParams
            layoutParams.width = screenWidth
            layoutParams.height = calculatedHeight
            remoteView.layoutParams = layoutParams

            // Set the scaling type to maintain aspect ratio
            remoteView.setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FIT)
        } catch (e: Exception) {
            Timber.e(e, "CallFragment: Error adjusting remote video aspect ratio")
            CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error adjusting remote video aspect ratio")
        }
    }

    private fun initRTCCall() {
        Timber.i("CallFragment: initRTCCall called, updating UI for connected state")
        try {
            ringToneGenerator.stopTone()
        } catch (e: Exception) {
            Timber.e(e, "CallFragment: Error stopping ringtone in initRTCCall")
            CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error stopping ringtone in initRTCCall")
        }
        hangupHandler.removeCallbacksAndMessages(null)
        watchSignal()
        with(fragmentCallBinding) {
            ringingBackground.visibility = View.GONE
            watchAnimation.visibility = View.GONE
            videocallConnecting.visibility = View.GONE
            muteButton.visibility = View.VISIBLE
            switchCameraButton.visibility = View.VISIBLE
            callTime.visibility = View.VISIBLE
            videocallStatus.text = getString(R.string.videocall_connected)
        }
    }
    
    /**
     * Starts a 5-second timeout to show the remote video if dimensions are not received
     */
    private fun startRemoteVideoTimeout() {
        if (!isRemoteVideoVisible) {
            Timber.d("CallFragment: Starting 5-second timeout for remote video visibility")
            remoteVideoTimeoutHandler.postDelayed(remoteVideoTimeoutRunnable, 5000)
        }
    }
    
    /**
     * Shows the remote video view if it's not already visible
     */
    private fun showRemoteVideo() {
        if (!isRemoteVideoVisible) {
            Timber.i("CallFragment: Showing remote video view")
            try {
                fragmentCallBinding.remoteView.visibility = View.VISIBLE
                isRemoteVideoVisible = true
                // Cancel timeout since we're now showing the video
                remoteVideoTimeoutHandler.removeCallbacksAndMessages(null)
            } catch (e: Exception) {
                Timber.e(e, "CallFragment: Error showing remote video view")
                CrashlyticsLog.recordNonFatalError(e, "CallFragment: Error showing remote video view")
            }
        }
    }
}