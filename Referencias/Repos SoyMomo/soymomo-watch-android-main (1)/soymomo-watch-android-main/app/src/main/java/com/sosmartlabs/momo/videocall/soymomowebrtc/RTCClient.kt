package com.sosmartlabs.momo.videocall.soymomowebrtc

import android.content.Context
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.videocall.soymomowebrtc.utils.CameraUtils
import org.webrtc.*
import timber.log.Timber
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.atomic.AtomicBoolean

class RTCClient(
    private val context: Context,
    private var iceServerList: List<PeerConnection.IceServer>,
    observer: PeerConnection.Observer
) {
    companion object {
        private const val LOCAL_STREAM_ID = "ARDAMS"
        private const val VIDEO_TRACK_ID = "ARDAMSv0"
        private const val AUDIO_TRACK_ID = "ARDAMSa0"
    }

    private val rootEglBase: EglBase = EglBase.create()

    private val peerConnectionFactory: PeerConnectionFactory by lazy {
        Timber.d("RTCClient: Initializing PeerConnectionFactory")
        CrashlyticsLog.log("RTCClient: Initializing PeerConnectionFactory")
        PeerConnectionFactory.builder()
            .setOptions(PeerConnectionFactory.Options())
            .setVideoDecoderFactory(DefaultVideoDecoderFactory(rootEglBase.eglBaseContext))
            .setVideoEncoderFactory(DefaultVideoEncoderFactory(rootEglBase.eglBaseContext, true, true))
            .createPeerConnectionFactory()
    }

    val peerConnection: PeerConnection? by lazy {
        Timber.d("RTCClient: Creating PeerConnection with ICE servers: $iceServerList")
        CrashlyticsLog.log("RTCClient: Creating PeerConnection with ICE servers: $iceServerList")
        val rtcConfig = PeerConnection.RTCConfiguration(iceServerList).apply {
            tcpCandidatePolicy = PeerConnection.TcpCandidatePolicy.DISABLED
            bundlePolicy = PeerConnection.BundlePolicy.MAXBUNDLE
            rtcpMuxPolicy = PeerConnection.RtcpMuxPolicy.REQUIRE
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
        }
        peerConnectionFactory.createPeerConnection(rtcConfig, observer).also {
            if (it == null) {
                Timber.e("RTCClient: Failed to create PeerConnection")
                CrashlyticsLog.log("RTCClient: Failed to create PeerConnection")
            }
        }
    }

    private val localAudioSource: AudioSource by lazy {
        Timber.d("RTCClient: Creating local AudioSource")
        CrashlyticsLog.log("RTCClient: Creating local AudioSource")
        peerConnectionFactory.createAudioSource(MediaConstraints())
    }

    private val localAudioTrack: AudioTrack? by lazy {
        Timber.d("RTCClient: Creating local AudioTrack")
        CrashlyticsLog.log("RTCClient: Creating local AudioTrack")
        peerConnectionFactory.createAudioTrack(AUDIO_TRACK_ID, localAudioSource).apply {
            setEnabled(true)
        }
    }

    private val localVideoSource: VideoSource by lazy {
        Timber.d("RTCClient: Creating local VideoSource")
        CrashlyticsLog.log("RTCClient: Creating local VideoSource")
        peerConnectionFactory.createVideoSource(false)
    }

    private val localVideoTrack: VideoTrack? by lazy {
        Timber.d("RTCClient: Creating local VideoTrack")
        CrashlyticsLog.log("RTCClient: Creating local VideoTrack")
        peerConnectionFactory.createVideoTrack(VIDEO_TRACK_ID, localVideoSource).apply {
            setEnabled(true)
        }
    }

    // Delegate kept separately so teardown can ask isInitialized(): touching `videoCapturer`
    // CREATES a capturer, so terminating a client that never captured would enumerate cameras
    // (and throw "No back-facing camera found" on a device with none) purely in order to stop it.
    private val videoCapturerDelegate = lazy {
        Timber.d("RTCClient: Initializing VideoCapturer")
        CrashlyticsLog.log("RTCClient: Initializing VideoCapturer")
        getVideoCapturer(context)
    }

    val videoCapturer by videoCapturerDelegate

    /**
     * Single thread for every camera teardown step, so [terminate] and [stopCapturingAsync] can
     * never touch the capturer concurrently (stop racing dispose is a native crash).
     *
     * Camera teardown must not run on the caller's thread: `CameraCapturer.stopCapture()` parks on
     * an UNTIMED `Object.wait()` until the pending camera session finishes opening. WebRTC's own
     * 10s rescue does not apply here — its timeout runnable is posted to the main looper (the very
     * thread that would be blocked) and its only action is to notify an events handler, which this
     * client passes as null. On the main thread that is an unbounded freeze, and it is how
     * Crashlytics f22114c6 was produced.
     */
    private val teardownExecutor = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "rtc-teardown").apply { isDaemon = true }
    }

    private val terminated = AtomicBoolean(false)

    private fun submitTeardown(what: String, block: () -> Unit) {
        try {
            teardownExecutor.execute {
                runCatching(block).onFailure {
                    Timber.e(it, "RTCClient: Error during $what")
                    CrashlyticsLog.recordNonFatalError(it, "RTCClient: Error during $what")
                }
            }
        } catch (e: RejectedExecutionException) {
            Timber.d("RTCClient: $what skipped, teardown already finished")
        }
    }

    init {
        Timber.d("RTCClient: Initializing PeerConnectionFactory (static)")
        CrashlyticsLog.log("RTCClient: Initializing PeerConnectionFactory (static)")
        val options = PeerConnectionFactory.InitializationOptions.builder(context)
            .setEnableInternalTracer(true)
            .setFieldTrials("WebRTC-SignalProcessing/Enabled/")
            .createInitializationOptions()
        PeerConnectionFactory.initialize(options)
    }

    private fun getVideoCapturer(context: Context): CameraVideoCapturer? {
        Timber.d("RTCClient: Attempting to get back-facing camera for VideoCapturer")
        CrashlyticsLog.log("RTCClient: Attempting to get back-facing camera for VideoCapturer")
        val enumerator = CameraUtils.getCameraEnumerator(context)
        if (enumerator == null) {
            Timber.e("RTCClient: CameraEnumerator is null")
            CrashlyticsLog.log("RTCClient: CameraEnumerator is null")
            return null
        }
        val deviceName = enumerator.deviceNames.find { enumerator.isBackFacing(it) }
        if (deviceName == null) {
            Timber.e("RTCClient: No back-facing camera found.")
            CrashlyticsLog.log("RTCClient: No back-facing camera found.")
            throw IllegalStateException("No back-facing camera found.")
        }
        Timber.d("RTCClient: Using camera: $deviceName")
        return enumerator.createCapturer(deviceName, null)
    }

    fun initSurfaceView(view: SurfaceViewRenderer) {
        Timber.d("RTCClient: Initializing SurfaceViewRenderer")
        CrashlyticsLog.log("RTCClient: Initializing SurfaceViewRenderer")
        view.run {
            setMirror(true)
            setEnableHardwareScaler(true)
            init(rootEglBase.eglBaseContext, null)
        }
    }

    fun startLocalVideoCapture(localVideoOutput: SurfaceViewRenderer) {
        Timber.d("RTCClient: Starting local video capture")
        CrashlyticsLog.log("RTCClient: Starting local video capture")
        val surfaceTextureHelper = SurfaceTextureHelper.create(Thread.currentThread().name, rootEglBase.eglBaseContext)
        if (videoCapturer == null) {
            Timber.e("RTCClient: VideoCapturer is null, cannot start capture")
            CrashlyticsLog.log("RTCClient: VideoCapturer is null, cannot start capture")
            return
        }
        videoCapturer?.initialize(surfaceTextureHelper, localVideoOutput.context, localVideoSource.capturerObserver)
        if (CameraUtils.isSwitchCameraSupported(context)) {
            Timber.d("RTCClient: Switch camera supported, switching camera")
            videoCapturer?.switchCamera(null)
        }
        try {
            videoCapturer?.startCapture(320, 240, 30)
            Timber.d("RTCClient: Video capture started (320x240@30fps)")
        } catch (e: Exception) {
            Timber.e(e, "RTCClient: Error starting video capture")
            CrashlyticsLog.recordNonFatalError(e, "RTCClient: Error starting video capture")
        }
        peerConnection?.apply {
            Timber.d("RTCClient: Adding local audio and video tracks to PeerConnection")
            addTrack(localAudioTrack, listOf(LOCAL_STREAM_ID))
            addTrack(localVideoTrack, listOf(LOCAL_STREAM_ID))
        } ?: run {
            Timber.e("RTCClient: PeerConnection is null, cannot add tracks")
            CrashlyticsLog.log("RTCClient: PeerConnection is null, cannot add tracks")
        }
        localVideoTrack?.addSink(localVideoOutput)
    }

    private fun PeerConnection.call(sdpObserver: SdpObserver) {
        Timber.d("RTCClient: Creating offer SDP")
        CrashlyticsLog.log("RTCClient: Creating offer SDP")
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googEchoCancellation", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googAutoGainControl", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googHighpassFilter", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googNoiseSuppression", "true"))
        }

        createOffer(object : SdpObserver by sdpObserver {
            override fun onCreateSuccess(desc: SessionDescription?) {
                Timber.d("RTCClient: SDP offer created: ${desc?.description}")
                CrashlyticsLog.log("RTCClient: SDP offer created: ${desc?.description}")
                setLocalDescription(object : SdpObserver {
                    override fun onSetFailure(p0: String?) {
                        Timber.e("RTCClient: createOffer- onSetFailure: $p0")
                        CrashlyticsLog.log("RTCClient: createOffer- onSetFailure: $p0")
                    }

                    override fun onSetSuccess() {
                        Timber.d("RTCClient: createOffer- onSetSuccess")
                        CrashlyticsLog.log("RTCClient: createOffer- onSetSuccess")
                    }

                    override fun onCreateSuccess(p0: SessionDescription?) {
                        Timber.d("RTCClient: createOffer- onCreateSuccess: ${p0?.type}, ${p0?.description}")
                        CrashlyticsLog.log("RTCClient: createOffer- onCreateSuccess: ${p0?.type}, ${p0?.description}")
                    }

                    override fun onCreateFailure(p0: String?) {
                        Timber.e("RTCClient: createOffer- onCreateFailure: $p0")
                        CrashlyticsLog.log("RTCClient: createOffer- onCreateFailure: $p0")
                    }
                }, desc)
                sdpObserver.onCreateSuccess(desc)
            }

            override fun onCreateFailure(error: String?) {
                Timber.e("RTCClient: createOffer- onCreateFailure: $error")
                CrashlyticsLog.log("RTCClient: createOffer- onCreateFailure: $error")
                sdpObserver.onCreateFailure(error)
            }
        }, constraints)
    }

    private fun PeerConnection.answer(sdpObserver: SdpObserver) {
        Timber.d("RTCClient: Creating answer SDP")
        CrashlyticsLog.log("RTCClient: Creating answer SDP")
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googEchoCancellation", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googAutoGainControl", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googHighpassFilter", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googNoiseSuppression", "true"))
        }

        createAnswer(object : SdpObserver by sdpObserver {
            override fun onCreateSuccess(desc: SessionDescription?) {
                Timber.d("RTCClient: SDP answer created: ${desc?.description}")
                CrashlyticsLog.log("RTCClient: SDP answer created: ${desc?.description}")
                setLocalDescription(object : SdpObserver {
                    override fun onSetFailure(p0: String?) {
                        Timber.e("RTCClient: createAnswer- onSetFailure: $p0")
                        CrashlyticsLog.log("RTCClient: createAnswer- onSetFailure: $p0")
                    }

                    override fun onSetSuccess() {
                        Timber.d("RTCClient: createAnswer- onSetSuccess")
                        CrashlyticsLog.log("RTCClient: createAnswer- onSetSuccess")
                    }

                    override fun onCreateSuccess(p0: SessionDescription?) {
                        Timber.d("RTCClient: createAnswer- onCreateSuccess: ${p0?.type}, ${p0?.description}")
                        CrashlyticsLog.log("RTCClient: createAnswer- onCreateSuccess: ${p0?.type}, ${p0?.description}")
                    }

                    override fun onCreateFailure(p0: String?) {
                        Timber.e("RTCClient: createAnswer- onCreateFailure: $p0")
                        CrashlyticsLog.log("RTCClient: createAnswer- onCreateFailure: $p0")
                    }
                }, desc)
                sdpObserver.onCreateSuccess(desc)
            }

            override fun onCreateFailure(error: String?) {
                Timber.e("RTCClient: createAnswer- onCreateFailure: $error")
                CrashlyticsLog.log("RTCClient: createAnswer- onCreateFailure: $error")
                sdpObserver.onCreateFailure(error)
            }
        }, constraints)
    }

    fun call(sdpObserver: SdpObserver) {
        Timber.d("RTCClient: call() invoked")
        CrashlyticsLog.log("RTCClient: call() invoked")
        peerConnection?.call(sdpObserver) ?: run {
            Timber.e("RTCClient: call() failed, PeerConnection is null")
            CrashlyticsLog.log("RTCClient: call() failed, PeerConnection is null")
        }
    }

    fun answer(sdpObserver: SdpObserver) {
        Timber.d("RTCClient: answer() invoked")
        CrashlyticsLog.log("RTCClient: answer() invoked")
        peerConnection?.answer(sdpObserver) ?: run {
            Timber.e("RTCClient: answer() failed, PeerConnection is null")
            CrashlyticsLog.log("RTCClient: answer() failed, PeerConnection is null")
        }
    }

    fun onRemoteSessionReceived(sessionDescription: SessionDescription) {
        Timber.d("RTCClient: onRemoteSessionReceived() called with sessionDescription: ${sessionDescription.type}, ${sessionDescription.description}")
        CrashlyticsLog.log("RTCClient: onRemoteSessionReceived() called with sessionDescription: ${sessionDescription.type}, ${sessionDescription.description}")
        peerConnection?.setRemoteDescription(object : SdpObserver {
            override fun onSetFailure(p0: String?) {
                Timber.e("RTCClient: onRemoteSessionReceived- onSetFailure: $p0")
                CrashlyticsLog.log("RTCClient: onRemoteSessionReceived- onSetFailure: $p0")
            }

            override fun onSetSuccess() {
                Timber.d("RTCClient: onRemoteSessionReceived- onSetSuccess")
                CrashlyticsLog.log("RTCClient: onRemoteSessionReceived- onSetSuccess")
            }

            override fun onCreateSuccess(p0: SessionDescription?) {
                Timber.d("RTCClient: onRemoteSessionReceived- onCreateSuccess: ${p0?.type}, ${p0?.description}")
                CrashlyticsLog.log("RTCClient: onRemoteSessionReceived- onCreateSuccess: ${p0?.type}, ${p0?.description}")
            }

            override fun onCreateFailure(p0: String?) {
                Timber.e("RTCClient: onRemoteSessionReceived- onCreateFailure: $p0")
                CrashlyticsLog.log("RTCClient: onRemoteSessionReceived- onCreateFailure: $p0")
            }
        }, sessionDescription) ?: run {
            Timber.e("RTCClient: setRemoteDescription failed, PeerConnection is null")
            CrashlyticsLog.log("RTCClient: setRemoteDescription failed, PeerConnection is null")
        }
    }

    fun addIceCandidate(iceCandidate: IceCandidate?) {
        Timber.d("RTCClient: addIceCandidate() called with: $iceCandidate")
        CrashlyticsLog.log("RTCClient: addIceCandidate() called with: $iceCandidate")
        if (iceCandidate == null) {
            Timber.e("RTCClient: addIceCandidate() failed, iceCandidate is null")
            CrashlyticsLog.log("RTCClient: addIceCandidate() failed, iceCandidate is null")
            return
        }
        peerConnection?.addIceCandidate(iceCandidate) ?: run {
            Timber.e("RTCClient: addIceCandidate() failed, PeerConnection is null")
            CrashlyticsLog.log("RTCClient: addIceCandidate() failed, PeerConnection is null")
        }
    }

    fun switchCamera(context: Context) {
        Timber.d("RTCClient: switchCamera() called")
        CrashlyticsLog.log("RTCClient: switchCamera() called")
        if (CameraUtils.isSwitchCameraSupported(context)) {
            Timber.d("RTCClient: Switch camera supported, switching camera")
            videoCapturer?.switchCamera(null)
        } else {
            Timber.d("RTCClient: Switch camera not supported on this device")
            CrashlyticsLog.log("RTCClient: Switch camera not supported on this device")
        }
    }

    fun isVideoMuted(): Boolean {
        val enabled = localVideoTrack?.enabled()
        Timber.d("RTCClient: isVideoMuted() = ${enabled != true}")
        return enabled != true
    }

    fun muteVideo(mute: Boolean) {
        Timber.d("RTCClient: muteVideo() called with mute=$mute")
        CrashlyticsLog.log("RTCClient: muteVideo() called with mute=$mute")
        localVideoTrack?.setEnabled(!mute)
    }

    fun isAudioMuted(): Boolean {
        val enabled = localAudioTrack?.enabled()
        Timber.d("RTCClient: isAudioMuted() = ${enabled != true}")
        return enabled != true
    }

    fun muteAudio(mute: Boolean) {
        Timber.d("RTCClient: muteAudio() called with mute=$mute")
        CrashlyticsLog.log("RTCClient: muteAudio() called with mute=$mute")
        localAudioTrack?.setEnabled(!mute)
    }

    /**
     * Stops camera capture without blocking the caller. Used from `Activity.onPause`, which is a
     * main-thread lifecycle callback and must never park on the camera.
     *
     * No-op once [terminate] has run, and no-op if capture was never started.
     */
    fun stopCapturingAsync() {
        if (terminated.get()) return
        if (!videoCapturerDelegate.isInitialized()) {
            Timber.d("RTCClient: stopCapturing skipped, capturer was never started")
            return
        }
        submitTeardown("stopCapture") {
            videoCapturer?.stopCapture()
            Timber.d("RTCClient: VideoCapturer stopped")
        }
    }

    /**
     * Releases every WebRTC resource. Returns immediately — the work runs on [teardownExecutor].
     *
     * Idempotent: a second call is ignored rather than double-releasing native objects.
     */
    fun terminate() {
        if (!terminated.compareAndSet(false, true)) {
            Timber.d("RTCClient: terminate() ignored, already terminated")
            return
        }
        Timber.d("RTCClient: Terminating RTCClient and releasing resources")
        CrashlyticsLog.log("RTCClient: Terminating RTCClient and releasing resources")
        submitTeardown("terminate") {
            releaseResources()
            // Nothing else may be scheduled after this; the client is spent.
            teardownExecutor.shutdown()
        }
    }

    private fun releaseResources() {
        try {
            localAudioSource.dispose()
            Timber.d("RTCClient: localAudioSource disposed")
        } catch (e: Exception) {
            Timber.e(e, "RTCClient: Error disposing localAudioSource")
            CrashlyticsLog.recordNonFatalError(e, "RTCClient: Error disposing localAudioSource")
        }
        // isInitialized() so we never create a capturer just to tear it down.
        if (videoCapturerDelegate.isInitialized()) videoCapturer?.let {
            try {
                it.stopCapture()
                Timber.d("RTCClient: VideoCapturer stopped")
            } catch (e: InterruptedException) {
                // Deliberately NOT rethrown. This used to `throw RuntimeException(e)`, which
                // skipped every release below — capturer, video source, peer connection and EGL
                // base — leaving the camera and microphone live while the Activity finished.
                Timber.e(e, "RTCClient: InterruptedException stopping VideoCapturer")
                CrashlyticsLog.recordNonFatalError(e, "RTCClient: InterruptedException stopping VideoCapturer")
                Thread.currentThread().interrupt()
            } catch (e: Exception) {
                Timber.e(e, "RTCClient: Error stopping VideoCapturer")
                CrashlyticsLog.recordNonFatalError(e, "RTCClient: Error stopping VideoCapturer")
            }
            try {
                it.dispose()
                Timber.d("RTCClient: VideoCapturer disposed")
            } catch (e: Exception) {
                Timber.e(e, "RTCClient: Error disposing VideoCapturer")
                CrashlyticsLog.recordNonFatalError(e, "RTCClient: Error disposing VideoCapturer")
            }
        }
        try {
            localVideoSource.dispose()
            Timber.d("RTCClient: localVideoSource disposed")
        } catch (e: Exception) {
            Timber.e(e, "RTCClient: Error disposing localVideoSource")
            CrashlyticsLog.recordNonFatalError(e, "RTCClient: Error disposing localVideoSource")
        }
        try {
            peerConnection?.close()
            Timber.d("RTCClient: PeerConnection closed")
        } catch (e: Exception) {
            Timber.e(e, "RTCClient: Error closing PeerConnection")
            CrashlyticsLog.recordNonFatalError(e, "RTCClient: Error closing PeerConnection")
        }
        try {
            rootEglBase.release()
            Timber.d("RTCClient: rootEglBase released")
        } catch (e: Exception) {
            Timber.e(e, "RTCClient: Error releasing rootEglBase")
            CrashlyticsLog.recordNonFatalError(e, "RTCClient: Error releasing rootEglBase")
        }
    }
}