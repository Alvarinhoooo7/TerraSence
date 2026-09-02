package com.sosmartlabs.momo.videocall

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.telephony.TelephonyManager
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.addCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.fragment.app.Fragment
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import androidx.navigation.NavController
import androidx.navigation.findNavController
import androidx.navigation.fragment.NavHostFragment
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityCallBinding
import com.sosmartlabs.momo.databinding.FragmentCallBinding
import com.sosmartlabs.momo.videocall.model.IceServerData
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.VibrationUtil
import com.sosmartlabs.momo.videocall.soymomowebrtc.RTCAudioManager
import com.sosmartlabs.momo.videocall.soymomowebrtc.RTCClient
import com.sosmartlabs.momo.videocall.soymomowebrtc.SignalingClient
import com.sosmartlabs.momo.videocall.soymomowebrtc.interfaces.PeerConnectionObserver
import com.sosmartlabs.momo.videocall.soymomowebrtc.interfaces.SDPObserver
import com.sosmartlabs.momo.videocall.soymomowebrtc.interfaces.SignalingClientListener
import com.sosmartlabs.momo.videocall.ui.VideocallStatsViewModel
import com.sosmartlabs.momo.videocall.ui.VideocallViewModel
import com.sosmartlabs.momo.videocall.ui.fragments.CallFragmentDirections
import com.sosmartlabs.momo.videocall.ui.fragments.RingingIncomingFragment
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.ExperimentalCoroutinesApi
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import org.webrtc.IceCandidate
import org.webrtc.MediaStream
import org.webrtc.SessionDescription
import timber.log.Timber
import java.io.IOException
import java.lang.NullPointerException
import java.util.*

@AndroidEntryPoint
@ExperimentalCoroutinesApi
class CallActivity : AppCompatActivity() {

    companion object {
        private const val PERMISSIONS_REQUEST_CODE = 1
        private val PERMISSIONS = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.MODIFY_AUDIO_SETTINGS,
            Manifest.permission.INTERNET) +
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
                    arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
                else arrayOf(Manifest.permission.BLUETOOTH, Manifest.permission.BLUETOOTH_ADMIN)
    }

    private lateinit var binding: ActivityCallBinding
    private val videocallViewModel: VideocallViewModel by viewModels()
    private val videocallStatsViewModel: VideocallStatsViewModel by viewModels()
    private var currentFeedbackUUID: UUID? = null
    private var currentCallTime = 0
    private var mediaPlayer: MediaPlayer? = null
    private var type: String? = null
    private var typeId: String? = null
    private var isOutgoing: Boolean = true
    private var contactName: String? = null
    private var contactImage: String? = null
    private var intentAction: String? = null
    private var wearerDeviceId: String? = null
    private var wearerModel: Int = 0
    private var rtcClient: RTCClient? = null
    private var signalingClient: SignalingClient? = null
    private var rtcAudioManager: RTCAudioManager? = null
    private var hasFinishedVideocall = false
    private var hasRequestedPermissions = false
    private val phonecallReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Timber.d("CallActivity: Phone call received")
            CrashlyticsLog.log("CallActivity: Phone call received. Current call time: $currentCallTime")
            val seconds = currentCallTime % 60
            val minutes = currentCallTime / 60
            endRTCCall(currentFeedbackUUID, String.format(Locale.getDefault(),"%02d:%02d", minutes, seconds), null)
        }
    }
    private val videocallHangupReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Timber.d("CallActivity: Videocall hangup received")
            CrashlyticsLog.log("CallActivity: Videocall hangup received. hasFinishedVideocall: $hasFinishedVideocall")
            if (!hasFinishedVideocall) {
                dispose()
                finish()
            }
        }
    }
    private val offerSDPObserver = object : SDPObserver() {
        override fun onSetFailure(p0: String?) {
            super.onSetFailure(p0)
            CrashlyticsLog.recordNonFatalError(Exception(p0), "CallActivity: Error on set offerSDPObserver")
            Timber.e("CallActivity: onSetFailure(): $p0")
        }
        override fun onSetSuccess() {
            super.onSetSuccess()
            CrashlyticsLog.log("CallActivity: OfferSDPObserver set success")
            Timber.d("CallActivity: onSetSuccess()")
        }
        override fun onCreateSuccess(p0: SessionDescription?) {
            super.onCreateSuccess(p0)
            CrashlyticsLog.log("CallActivity: OfferSDPObserver create success. SessionDescription: $p0")
            Timber.d("CallActivity: onCreateSuccess(): $p0")
            signalingClient?.send("offer", p0)
        }
        override fun onCreateFailure(p0: String?) {
            super.onCreateFailure(p0)
            CrashlyticsLog.recordNonFatalError(Exception(p0), "CallActivity: Error on create offerSDPObserver")
            Timber.e("CallActivity: onCreateFailure(): $p0")
        }
    }
    private val answerSDPObserver = object : SDPObserver() {
        override fun onSetFailure(p0: String?) {
            super.onSetFailure(p0)
            CrashlyticsLog.recordNonFatalError(Exception(p0), "CallActivity: Error on set answerSDPObserver")
            Timber.e("CallActivity: onSetFailure(): $p0")
        }
        override fun onSetSuccess() {
            super.onSetSuccess()
            CrashlyticsLog.log("CallActivity: AnswerSDPObserver set success")
            Timber.d("CallActivity: onSetSuccess()")
        }
        override fun onCreateSuccess(p0: SessionDescription?) {
            super.onCreateSuccess(p0)
            CrashlyticsLog.log("CallActivity: AnswerSDPObserver create success. SessionDescription: $p0")
            Timber.d("CallActivity: onCreateSuccess(): $p0")
            signalingClient?.send("answer", p0)
        }
        override fun onCreateFailure(p0: String?) {
            super.onCreateFailure(p0)
            CrashlyticsLog.recordNonFatalError(Exception(p0), "CallActivity: Error on create answerSDPObserver")
            Timber.e("CallActivity: onCreateFailure(): $p0")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        Timber.d("CallActivity: onCreate()")
        CrashlyticsLog.log("CallActivity: Creating call activity")

        enableEdgeToEdge()
        setupUI()
        setupBackHandling()
        setupEdgeToEdge()
        manageNotifications()
        setupWindowFlags()
        registerReceivers()
        observeViewModels()
        checkPermissions()
    }

    /**
     * A second call arrived while this one is live. Reject it, call-waiting style, and stay on the
     * call in progress.
     *
     * Reached because the activity is `singleTop`: without that, the notification's
     * FLAG_ACTIVITY_CLEAR_TOP finishes and re-creates this activity, and since finish() is async
     * the new instance can come up while this one is still tearing down its camera — two live
     * instances fighting over the same camera device.
     *
     * Note what this deliberately does NOT do: call `setIntent(intent)`. [setupNavigation] seeds
     * the nav graph from `intent.extras` exactly once in [onCreate], so adopting the new intent
     * would leave the graph describing a call we are not in — the parent could end up looking at
     * the wrong child.
     */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        Timber.d("CallActivity: onNewIntent()")

        // Our own call is already over — e.g. the error screen's Retry button finishes us and
        // immediately relaunches. Honour the new intent instead of rejecting it, or retry silently
        // does nothing.
        if (hasFinishedVideocall || isFinishing) {
            Timber.d("CallActivity: onNewIntent after call ended, restarting for the new intent")
            CrashlyticsLog.log("CallActivity: Restarting for a new intent, previous call had ended")
            finish()
            startActivity(intent)
            return
        }

        val incomingRoomId = intent.getStringExtra("typeId")
        val isIncoming = !intent.getBooleanExtra("isOutgoing", true)

        // The user tapped "Answer" on the incoming-call notification for the call we are already
        // ringing for. Because the activity is singleTop that tap lands here instead of recreating
        // the activity (which used to auto-answer), so honour it: answer the current call rather
        // than falling through to the second-call rejection below and silently dropping it.
        if (isIncoming && !incomingRoomId.isNullOrEmpty() && incomingRoomId == typeId &&
            intent.getStringExtra("intentAction") == "answer"
        ) {
            Timber.i("CallActivity: onNewIntent answer for the current room, forwarding to the ringing screen")
            CrashlyticsLog.log("CallActivity: onNewIntent answer for current room=$incomingRoomId")
            manageNotifications()
            answerCurrentIncomingCall()
            return
        }

        Timber.i("CallActivity: Rejecting a second call while one is in progress (incoming=$isIncoming)")
        CrashlyticsLog.log("CallActivity: Rejected second call while in progress. incoming=$isIncoming room=$incomingRoomId")

        if (isIncoming && !incomingRoomId.isNullOrEmpty() && incomingRoomId != typeId) {
            // Decline the new room only. The watch keeps ringing until told otherwise.
            notifyEndCallRoom(incomingRoomId)
        }

        // The incoming-call notification is FLAG_INSISTENT and full-screen; without this it keeps
        // ringing over the call in progress.
        manageNotifications()
    }

    private fun setupUI() {
        binding = ActivityCallBinding.inflate(layoutInflater)
        setContentView(binding.root)
        extractIntentExtras()
        setupNavigation()
    }

    private fun extractIntentExtras() {
        intent.extras?.let { args ->
            isOutgoing = args.getBoolean("isOutgoing")
            type = args.getString("type")
            typeId = args.getString("typeId")
            contactName = args.getString("contactName")
            contactImage = args.getString("contactImage")
            intentAction = args.getString("intentAction")
            wearerDeviceId = args.getString("wearerDeviceId")
            wearerModel = args.getInt("wearerModel", 0)
        }
        Timber.d("CallActivity: Extracted intent extras - isOutgoing: $isOutgoing, type: $type, typeId: $typeId, contactName: $contactName, wearerDeviceId: $wearerDeviceId, wearerModel: $wearerModel")
        CrashlyticsLog.log("CallActivity: Extracted intent extras - isOutgoing: $isOutgoing, type: $type, typeId: $typeId, contactName: $contactName, wearerDeviceId: $wearerDeviceId, wearerModel: $wearerModel")
    }

    private fun setupNavigation() {
        val navHostFragment = supportFragmentManager.findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController: NavController = navHostFragment.navController
        navController.setGraph(R.navigation.nav_videocall, intent.extras)
        Timber.d("CallActivity: Navigation setup complete")
        CrashlyticsLog.log("CallActivity: Navigation setup complete")
    }

    private fun manageNotifications() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(Constants.NOTIFICATION_VIDEOCALL)
        Timber.d("CallActivity: Notifications managed")
        CrashlyticsLog.log("CallActivity: Notifications managed")
    }

    /**
     * Forwards a notification "Answer" tap to the ringing screen if that is what is currently
     * showing. Reached from [onNewIntent] when the call is answered from the notification while
     * this activity (singleTop) is already up on the incoming-call screen.
     */
    private fun answerCurrentIncomingCall() {
        try {
            val navHostFragment = supportFragmentManager.findFragmentById(R.id.nav_host_fragment) as? NavHostFragment
            val currentFragment = navHostFragment?.childFragmentManager?.primaryNavigationFragment
            if (currentFragment is RingingIncomingFragment) {
                currentFragment.answerIncomingCall()
            } else {
                Timber.w("CallActivity: answer requested but the ringing screen is not showing ($currentFragment)")
                CrashlyticsLog.log("CallActivity: answer requested but ringing screen not showing")
            }
        } catch (e: Exception) {
            Timber.e(e, "CallActivity: Error forwarding answer to the ringing screen")
            CrashlyticsLog.recordNonFatalError(e, "CallActivity: Error forwarding answer to the ringing screen")
        }
    }

    private fun setupWindowFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                or WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        Timber.d("CallActivity: Window flags setup complete")
        CrashlyticsLog.log("CallActivity: Window flags setup complete")
    }

    private fun registerReceivers() {
        // NOT_EXPORTED: the only sender is VideocallNotificationHandler, in this same process.
        // Registered as exported, any installed app could broadcast
        // "<package>.videocallHangup" and end a parent's call with their child at will.
        // ContextCompat handles the pre-API-33 flag semantics for us.
        ContextCompat.registerReceiver(
            this,
            videocallHangupReceiver,
            IntentFilter("${packageName}.videocallHangup"),
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
        LocalBroadcastManager.getInstance(this).registerReceiver(phonecallReceiver, IntentFilter(TelephonyManager.ACTION_PHONE_STATE_CHANGED))
        Timber.d("CallActivity: Receivers registered")
        CrashlyticsLog.log("CallActivity: Receivers registered")
    }

    private fun observeViewModels() {
        videocallViewModel.currentFeedbackUUID.observe(this) {
            currentFeedbackUUID = it
            Timber.d("CallActivity: Current feedback UUID updated: $it")
            CrashlyticsLog.log("CallActivity: Current feedback UUID updated: $it")
        }
        videocallViewModel.elapsedCallTime.observe(this) {
            currentCallTime = it
            Timber.d("CallActivity: Elapsed call time updated: $it")
            CrashlyticsLog.log("CallActivity: Elapsed call time updated: $it")
        }
        videocallViewModel.isSpace3 = (wearerModel == 8 || wearerModel == 9)
        Timber.d("CallActivity: ViewModels observed")
        CrashlyticsLog.log("CallActivity: ViewModels observed. isSpace3: ${videocallViewModel.isSpace3}")
    }

    override fun onDestroy() {
        super.onDestroy()
        Timber.d("CallActivity: onDestroy()")
        CrashlyticsLog.log("CallActivity: Destroying CallActivity")
        LocalBroadcastManager.getInstance(this).unregisterReceiver(phonecallReceiver)
        // Only ever unregistered here, never at end-of-call: the receiver has to stay live for the
        // whole call. Previously it was never unregistered at all, so a destroyed CallActivity kept
        // receiving hangup broadcasts for the life of the process.
        runCatching { unregisterReceiver(videocallHangupReceiver) }
            .onFailure { Timber.w(it, "CallActivity: videocallHangupReceiver was not registered") }
        dispose()
    }

    override fun onPause() {
        super.onPause()
        Timber.d("CallActivity: onPause()")
        CrashlyticsLog.log("CallActivity: Pausing CallActivity")
        // Async: stopCapture() parks on an untimed wait until the camera session finishes opening,
        // and onPause is the main thread. This was a second, unguarded route into the same freeze
        // as the teardown path, on the hottest lifecycle callback there is.
        rtcClient?.stopCapturingAsync()
    }

    override fun onResume() {
        super.onResume()
        Timber.d("CallActivity: onResume()")
        CrashlyticsLog.log("CallActivity: Resuming CallActivity")
    }

    /**
     * Takes over back for the call flow: swallowed where the screen has its own visible exit,
     * but always an escape when it does not.
     *
     * Registered from [onCreate] **after** [setupUI] on purpose: `setContentView` inflates the
     * NavHostFragment, which registers the NavController's own back callback, and the dispatcher
     * offers the gesture to the most recently added enabled callback first. Register any earlier
     * and the NavController wins, popping `endCallFragment` back to `callFragment` — whose
     * `onViewCreated` re-sends the videocall push and silently re-dials the child's watch.
     *
     * This replaces an empty `onBackPressed()` override that was dead code: the app targets SDK
     * 36 without opting out of predictive back, so back arrives via OnBackInvokedDispatcher and
     * `Activity.onBackPressed()` is never called.
     */
    private fun setupBackHandling() {
        onBackPressedDispatcher.addCallback(this) {
            val currentId = findNavController(R.id.nav_host_fragment).currentDestination?.id
            if (hasFinishedVideocall && currentId == R.id.callFragment) {
                // The call already ended but we are still on the call screen, so the end-call
                // navigation did not land. Every other way out is inert here — never swallow back
                // into a dead end.
                Timber.w("CallActivity: Back pressed on a finished call still on callFragment, finishing")
                CrashlyticsLog.log("CallActivity: Back pressed on stale call screen, finishing")
                finish()
            } else {
                // Every other destination has its own visible exit (hangup, decline, end, return
                // home), so swallow back rather than let the NavController pop.
                Timber.d("CallActivity: Back press consumed")
                CrashlyticsLog.log("CallActivity: Back button pressed (consumed)")
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSIONS_REQUEST_CODE && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
            Timber.d("CallActivity: Permissions granted")
            CrashlyticsLog.log("CallActivity: Permissions successfully granted")
        } else {
            CrashlyticsLog.log("CallActivity: Permissions denied: ${permissions[grantResults.indexOf(PackageManager.PERMISSION_DENIED)]}")
            onPermissionsDenied()
        }
    }

    private fun hasPermissions(vararg permissions: String): Boolean = permissions.all {
        ActivityCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
    }

    private fun checkPermissions() {
        if (!hasPermissions(*PERMISSIONS)) {
            if (hasRequestedPermissions) {
                // Ask exactly once per activity. On a permanent denial requestPermissions()
                // returns immediately, so re-requesting from onPermissionsDenied() spins a
                // pause/resume loop — ~20 cycles per second in production, which is what
                // invalidated MainActivity's window token and turned a review dialog into a
                // fatal "Unable to resume activity".
                //
                // Deliberately stop asking rather than finish(): finishing would drop an
                // incoming call whose notification manageNotifications() has already cancelled,
                // leaving the parent with no record of who called and no retry surface. The
                // screen stays up, initRTCClient no-ops without permissions, and the visible
                // decline/hangup control is still there.
                Timber.w("CallActivity: Permissions still denied after request, not asking again")
                CrashlyticsLog.log("CallActivity: Permissions still denied after request, not asking again")
                return
            }
            hasRequestedPermissions = true
            ActivityCompat.requestPermissions(this, PERMISSIONS, PERMISSIONS_REQUEST_CODE)
        }
        Timber.d("CallActivity: Permissions checked")
        CrashlyticsLog.log("CallActivity: Permissions checked. All permissions granted: ${hasPermissions(*PERMISSIONS)}")
    }

    private fun onPermissionsDenied() {
        Toast.makeText(this, "Permissions Denied", Toast.LENGTH_LONG).show()
        checkPermissions()
        Timber.d("CallActivity: Permissions denied")
        CrashlyticsLog.log("CallActivity: Permissions denied. Rechecking permissions.")
    }

    fun initRTCClient(binding: FragmentCallBinding, iceServerData: IceServerData, roomId: String) {
        if (!hasPermissions(*PERMISSIONS)) {
            Timber.e("CallActivity: Cannot initialize RTC client. Permissions not granted.")
            CrashlyticsLog.log("CallActivity: Cannot initialize RTC client. Permissions not granted.")
            return
        }

        Timber.d("CallActivity: Initializing RTC client")
        CrashlyticsLog.log("CallActivity: Initializing RTC client with roomId: $roomId")

        initializeRTCAudioManager()
        initializeRTCClient(binding, iceServerData)
        initializeSignalingClient(roomId)
    }

    private fun initializeRTCAudioManager() {
        rtcAudioManager = RTCAudioManager.create(applicationContext)
        rtcAudioManager?.start(object : RTCAudioManager.AudioManagerEvents {
            override fun onAudioDeviceChanged(selectedAudioDevice: RTCAudioManager.AudioDevice?, availableAudioDevices: Set<RTCAudioManager.AudioDevice?>?) {
                onAudioManagerDevicesChanged(selectedAudioDevice!!, availableAudioDevices!!)
            }
        })
        Timber.d("CallActivity: RTC Audio Manager initialized")
        CrashlyticsLog.log("CallActivity: RTC Audio Manager initialized")
    }

    private fun initializeRTCClient(binding: FragmentCallBinding, iceServerData: IceServerData) {
        rtcClient = RTCClient(applicationContext, iceServerData.list, object : PeerConnectionObserver() {
            override fun onIceCandidate(p0: IceCandidate?) {
                super.onIceCandidate(p0)
                Timber.d("CallActivity: onIceCandidate(): $p0")
                CrashlyticsLog.log("CallActivity: Ice candidate received: $p0")
                signalingClient?.send("candidate", p0)
                rtcClient?.addIceCandidate(p0)
            }

            override fun onAddStream(p0: MediaStream?) {
                super.onAddStream(p0)
                Timber.d("CallActivity: onAddStream(): $p0")
                CrashlyticsLog.log("CallActivity: Media stream added: $p0")
                p0?.videoTracks?.get(0)?.addSink(binding.remoteView)
            }
        })
        rtcClient?.initSurfaceView(binding.remoteView)
        rtcClient?.initSurfaceView(binding.localView)
        rtcClient?.startLocalVideoCapture(binding.localView)
        Timber.d("CallActivity: RTC Client initialized")
        CrashlyticsLog.log("CallActivity: RTC Client initialized with ice servers: ${iceServerData.list}")
    }

    private fun initializeSignalingClient(roomId: String) {
        signalingClient = SignalingClient(this, roomId, createSignallingClientListener())
        Timber.d("CallActivity: Signaling Client initialized")
        CrashlyticsLog.log("CallActivity: Signaling Client initialized with roomId: $roomId")
    }

    fun initRTCCall() {
        Timber.d("CallActivity: Initializing RTC call")
        CrashlyticsLog.log("CallActivity: Initializing RTC call")
        rtcClient?.let {
            it.call(offerSDPObserver)
            videocallStatsViewModel.startMonitoring(it, wearerModel)
        }
    }

    fun endRTCCall(feedbackUUID: UUID?, durationString: String, reason: String?) {
        // Several paths race to end one call: the decline button, the ring timeout, and the
        // watch-side hangup push. Running this twice disposed an already-disposed RTCClient and
        // double-reported feedback. Safe only because back can no longer re-dial (see
        // [setupBackHandling]) — otherwise a re-dialled call would find its decline button inert.
        if (hasFinishedVideocall) {
            Timber.d("CallActivity: endRTCCall() ignored, call already ended")
            CrashlyticsLog.log("CallActivity: endRTCCall ignored, call already ended. Reason: $reason")
            return
        }

        Timber.d("CallActivity: endRTCCall()")
        CrashlyticsLog.log("CallActivity: Ending RTC call. Reason: $reason, Duration: $durationString, FeedbackUUID: $feedbackUUID")

        hasFinishedVideocall = true

        runCatching {
            videocallViewModel.endVideocall()
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it, "CallActivity: Obtaining view model failed")
        }

        dispose()

        videocallViewModel.sendHangupSignalToWatch(wearerDeviceId!!)
        CrashlyticsLog.log("CallActivity: Adding duration and raw stats to videocall feedback")
        if (feedbackUUID != null) {
            videocallViewModel.addDurationToFeedback(feedbackUUID,
                calculateDuration(durationString))
        }

        try {
            navigateToEndCallFragment(feedbackUUID, durationString, reason)
        } catch (e: java.lang.Exception) {
            Timber.e(e)
            CrashlyticsLog.recordNonFatalError(e, "CallActivity: Error navigating to end call fragment")
        }
    }

    private fun navigateToEndCallFragment(feedbackUUID: UUID?, durationString: String, reason: String?) {
        val action = when(reason) {
            "statsProblem" -> CallFragmentDirections.actionCallFragmentToErrorEndCallFragment(
                contactImage = contactImage,
                contactName = contactName,
                wearerDeviceId = wearerDeviceId!!,
                type = type!!,
                typeId = typeId!!,
                isOutgoing = isOutgoing,
                duration = durationString,
                reason = reason,
                feedbackUuid = feedbackUUID)
            else -> CallFragmentDirections.actionCallFragmentToEndCallFragment(
                contactImage = contactImage,
                contactName = contactName,
                wearerDeviceId = wearerDeviceId!!,
                type = type!!,
                typeId = typeId!!,
                isOutgoing = isOutgoing,
                duration = durationString,
                reason = reason,
                feedbackUuid = feedbackUUID)
        }
        val navController = findNavController(R.id.nav_host_fragment)
        val currentId = navController.currentDestination?.id

        // Already showing an end-call screen: benign, and navigating again would throw. That
        // screen has its own visible exit, so leave the user on it.
        if (currentId == R.id.endCallFragment || currentId == R.id.errorEndCallFragment) {
            Timber.w("CallActivity: Skipping end call navigation, already on an end call screen")
            CrashlyticsLog.log("CallActivity: Skipped end call navigation, already on an end call screen")
            return
        }

        // The call is over but the end-call screen cannot be shown — either this destination does
        // not own the action, or the FragmentManager has saved its state because we are stopped, in
        // which case the transaction is dropped or throws. Returning silently would strand the
        // user: hasFinishedVideocall is already true, so the hangup button, the ring timeout and
        // the watch's hangup push are all inert, and back is swallowed. Finish instead.
        if (navController.currentDestination?.getAction(action.actionId) == null ||
            supportFragmentManager.isStateSaved
        ) {
            Timber.w("CallActivity: Cannot show end call screen, finishing instead of stranding the user")
            CrashlyticsLog.recordNonFatalError(
                IllegalStateException("End call navigation unavailable (destination=$currentId, stateSaved=${supportFragmentManager.isStateSaved})"),
                "CallActivity: Finished instead of showing end call screen"
            )
            finish()
            return
        }

        navController.navigate(action)
        Timber.d("CallActivity: Navigated to end call fragment")
        CrashlyticsLog.log("CallActivity: Navigated to end call fragment. Reason: $reason, Duration: $durationString")
    }

    private fun calculateDuration(duration: String?): Int {
        return if (duration == null) {
            0
        } else {
            try {
                val min = duration.split(":")[0].toInt() * 60
                val sec = duration.split(":")[1].toInt()
                min + sec
            } catch (e: java.lang.Exception) {
                Timber.e(e)
                CrashlyticsLog.recordNonFatalError(e, "CallActivity: Error calculating duration")
                0
            }
        }
    }

    /**
     * Tells the signalling server that [roomId] is over, so the other end stops ringing.
     *
     * Defaults to this call's own room. [onNewIntent] passes the *incoming* call's room instead,
     * to decline it without disturbing the call in progress.
     */
    @JvmOverloads
    fun notifyEndCallRoom(roomId: String? = typeId) {
        Timber.d("CallActivity: notifyEndCallRoom(roomId=$roomId)")
        CrashlyticsLog.log("CallActivity: Notifying end call room $roomId")
        if (roomId.isNullOrEmpty()) {
            Timber.w("CallActivity: notifyEndCallRoom skipped, no room id")
            CrashlyticsLog.log("CallActivity: notifyEndCallRoom skipped, no room id")
            return
        }
        val jsonMediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
        val client = OkHttpClient()
        val params: Map<String, String> = hashMapOf("roomId" to roomId, "reason" to "hangup")
        val parameter = JSONObject(params)
        val postBody = parameter.toString().toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("http://videocalls.nosoymomo.com:8080/hangup")
            .addHeader("content-type", "application/json; charset=utf-8")
            .post(postBody)
            .build()
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Timber.e(e)
                CrashlyticsLog.recordNonFatalError(e, "CallActivity: Error notifying end call room")
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.body != null) {
                    Timber.d("CallActivity: End call room response: ${response.toString()}")
                    CrashlyticsLog.log("CallActivity: End call room response: ${response.toString()}")
                    response.body?.close()
                }
            }
        })
    }

    fun switchCamera() {
        Timber.d("CallActivity: Switching camera")
        CrashlyticsLog.log("CallActivity: Switching camera")
        rtcClient?.switchCamera(this)
    }

    fun isAudioMuted(): Boolean {
        return rtcClient?.isAudioMuted()!!
    }

    fun muteAudio(mute: Boolean) {
        Timber.d("CallActivity: Muting audio: $mute")
        CrashlyticsLog.log("CallActivity: Muting audio: $mute")
        rtcClient?.muteAudio(mute)
    }

    @Suppress("UNCHECKED_CAST")
    fun <F : Fragment> AppCompatActivity.getFragment(fragmentClass: Class<F>): F? {
        val navHostFragment = this.supportFragmentManager.fragments.first() as NavHostFragment

        navHostFragment.childFragmentManager.fragments.forEach {
            if (fragmentClass.isAssignableFrom(it.javaClass)) {
                return it as F
            }
        }

        return null
    }

    private fun onAudioManagerDevicesChanged(device: RTCAudioManager.AudioDevice, availableDevices: Set<RTCAudioManager.AudioDevice?>) {
        Timber.d("CallActivity: onAudioManagerDevicesChanged: $availableDevices, selected: $device")
        CrashlyticsLog.log("CallActivity: onAudioManagerDevicesChanged: $availableDevices, selected: $device")
    }

    private fun createSignallingClientListener() = object : SignalingClientListener {
        override fun onConnectionEstablished() {
            Timber.d("CallActivity: onConnectionEstablished()")
            CrashlyticsLog.log("CallActivity: Connection established with signaling client")
        }

        override fun onOfferReceived(description: SessionDescription) {
            Timber.d("CallActivity: onOfferReceived(): ${description.description}")
            CrashlyticsLog.log("CallActivity: Offer received from signaling client: ${description.description}")
            videocallViewModel.startVideocall()
            rtcClient?.onRemoteSessionReceived(description)
            rtcClient?.answer(answerSDPObserver)
            rtcClient?.let { videocallStatsViewModel.startMonitoring(it, wearerModel) }
        }

        override fun onAnswerReceived(description: SessionDescription) {
            Timber.d("CallActivity: onAnswerReceived(): $description")
            CrashlyticsLog.log("CallActivity: Answer received from signaling client: $description")
            videocallViewModel.startVideocall()
            rtcClient?.onRemoteSessionReceived(description)
        }

        override fun onIceCandidateReceived(iceCandidate: IceCandidate) {
            try {
                Timber.d("CallActivity: onIceCandidateReceived(): $iceCandidate")
                CrashlyticsLog.log("CallActivity: Ice candidate received from signaling client: $iceCandidate")
                rtcClient?.addIceCandidate(iceCandidate)
            }
            catch (e: NullPointerException) {
                Timber.e("CallActivity: NullPointerException iceCandidate: $iceCandidate")
                CrashlyticsLog.recordNonFatalError(e, "CallActivity: NullPointerException when receiving ice candidate")
            }
        }

        override fun onPeerJoined() {
            Timber.d("CallActivity: onPeerJoined()")
            CrashlyticsLog.log("CallActivity: Peer joined on signaling client")
            initRTCCall()
        }

        override fun onEndCall(reason: String?) {
            Timber.d("CallActivity: onEndCall(): reason $reason")
            CrashlyticsLog.log("CallActivity: Call ended: $reason")
            val seconds = currentCallTime % 60
            val minutes = currentCallTime / 60
            endRTCCall(currentFeedbackUUID, String.format(Locale.getDefault(),"%02d:%02d", minutes, seconds), reason)
        }
    }

    private fun dispose() {
        Timber.d("CallActivity: dispose()")
        CrashlyticsLog.log("CallActivity: Disposing videocall resources")
        disposeRTCClient()
        disposeSignalingClient()
        disposeRTCAudioManager()
        stopRingtone()
    }

    private fun disposeRTCClient() {
        try {
            rtcClient?.terminate()
            rtcClient = null
            Timber.d("CallActivity: RTC Client disposed")
            CrashlyticsLog.log("CallActivity: RTC Client disposed")
        } catch (e: Exception) {
            Timber.e(e)
            CrashlyticsLog.recordNonFatalError(e, "CallActivity: Error terminating rtcClient")
        }
    }

    private fun disposeSignalingClient() {
        try {
            signalingClient?.destroy()
            signalingClient = null
            Timber.d("CallActivity: Signaling Client disposed")
            CrashlyticsLog.log("CallActivity: Signaling Client disposed")
        } catch (e: Exception) {
            Timber.e(e)
            CrashlyticsLog.recordNonFatalError(e, "CallActivity: Error terminating signalClient")
        }
    }

    private fun disposeRTCAudioManager() {
        try {
            rtcAudioManager?.stop()
            rtcAudioManager = null
            Timber.d("CallActivity: RTC Audio Manager disposed")
            CrashlyticsLog.log("CallActivity: RTC Audio Manager disposed")
        } catch (e: Exception) {
            Timber.e(e)
            CrashlyticsLog.recordNonFatalError(e, "CallActivity: Error terminating rtcAudioManager")
        }
    }

    fun playRingtone() {
        Timber.d("CallActivity: Start playing ringtone")
        CrashlyticsLog.log("CallActivity: Start playing ringtone")
        VibrationUtil.startVibration(this, longArrayOf(0, 250, 250, 250))
        val rUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        if (mediaPlayer == null) {
            mediaPlayer = MediaPlayer.create(this, rUri)
        }
        mediaPlayer?.isLooping = true
        mediaPlayer?.start()
    }

    fun stopRingtone() {
        Timber.d("CallActivity: Stop playing ringtone")
        CrashlyticsLog.log("CallActivity: Stop playing ringtone")
        VibrationUtil.stopVibration(this)
        if (mediaPlayer != null) {
            if (mediaPlayer!!.isPlaying) {
                mediaPlayer!!.stop()
            }
            mediaPlayer = null
        }
    }

    private fun setupEdgeToEdge() {
        Timber.d("CallActivity: setupEdgeToEdge")

        // Configure window insets controller for full-screen video call experience
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController.apply {
            // Set light status bar appearance (white background)
            isAppearanceLightStatusBars = true
            // Configure behavior: system bars show transiently on swipe for immersive video call
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            // Hide system bars by default for immersive video call experience
            hide(WindowInsetsCompat.Type.systemBars())
        }
    }

    /**
     * Helper method for fragments to check if device is using button navigation.
     * Fragments can use this to conditionally apply bottom insets.
     */
    @SuppressLint("InternalInsetResource")
    fun hasButtonNavigation(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // For Android 10+, check the navigation mode
                val resourceId = resources.getIdentifier("config_navBarInteractionMode", "integer", "android")
                if (resourceId > 0) {
                    val navBarInteractionMode = resources.getInteger(resourceId)
                    // 0 = 3-button navigation, 1 = 2-button navigation, 2 = gesture navigation
                    navBarInteractionMode < 2
                } else {
                    // Fallback: check if navigation bar height is significant
                    val resourceId = resources.getIdentifier("navigation_bar_height", "dimen", "android")
                    return if (resourceId > 0) {
                        val navBarHeight = resources.getDimensionPixelSize(resourceId)
                        val density = resources.displayMetrics.density
                        val navBarHeightDp = navBarHeight / density
                        // If navigation bar is taller than 24dp, likely button navigation
                        navBarHeightDp > 24
                    } else {
                        false
                    }
                }
            } else {
                // For older versions, assume button navigation
                true
            }
        } catch (e: Exception) {
            // If any error occurs, default to button navigation for safety
            Timber.w("CallActivity: Error checking navigation mode, defaulting to button navigation $e")
            true
        }
    }
}