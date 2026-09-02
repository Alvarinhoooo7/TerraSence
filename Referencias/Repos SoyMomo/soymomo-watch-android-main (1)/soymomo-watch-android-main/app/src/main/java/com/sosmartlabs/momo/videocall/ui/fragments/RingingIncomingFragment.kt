package com.sosmartlabs.momo.videocall.ui.fragments

import android.os.Bundle
import android.os.Handler
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentRingingIncomingBinding
import com.sosmartlabs.momo.videocall.model.IceServerData
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momo.videocall.CallActivity
import com.sosmartlabs.momo.videocall.soymomowebrtc.utils.VideocallUtils
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.videocall.utils.EdgeToEdgeHelper
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber

@ExperimentalCoroutinesApi
class RingingIncomingFragment : Fragment(R.layout.fragment_ringing_incoming) {

    private lateinit var fragmentRingingIncomingBinding: FragmentRingingIncomingBinding

    private var type: String? = null
    private var typeId: String? = null
    private var isOutgoing: Boolean = true
    private var contactName: String? = null
    private var contactImage: String? = null
    private var intentAction: String? = null
    private var iceServerData: IceServerData? = null
    private lateinit var wearerDeviceId: String

    private var handler: Handler = Handler()

    private val args: RingingIncomingFragmentArgs by navArgs()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.i("RingingIncomingFragment: onCreate called")
        try {
            isOutgoing = args.isOutgoing
            type = args.type
            typeId = args.typeId
            contactName = args.contactName
            contactImage = args.contactImage
            intentAction = args.intentAction
            iceServerData = args.iceServerData
            wearerDeviceId = args.wearerDeviceId
            Timber.d("RingingIncomingFragment: Arguments loaded: isOutgoing=$isOutgoing, type=$type, typeId=$typeId, contactName=$contactName, contactImage=$contactImage, intentAction=$intentAction, wearerDeviceId=$wearerDeviceId, iceServerData=$iceServerData")
        } catch (e: Exception) {
            Timber.e(e, "RingingIncomingFragment: Error loading arguments in onCreate")
            CrashlyticsLog.recordNonFatalError(e, "RingingIncomingFragment: Error loading arguments in onCreate")
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.i("RingingIncomingFragment: onCreateView called")
        try {
            fragmentRingingIncomingBinding = FragmentRingingIncomingBinding.inflate(inflater, container, false).apply {
                answerButton.setOnClickListener {
                    Timber.i("RingingIncomingFragment: Answer button clicked")
                    answerIncomingCall()
                }
                declineButton.setOnClickListener {
                    Timber.i("RingingIncomingFragment: Decline button clicked")
                    try {
                        (activity as CallActivity).notifyEndCallRoom()
                    } catch (e: Exception) {
                        Timber.e(e, "RingingIncomingFragment: Error notifying end call room on declineButton click")
                        CrashlyticsLog.recordNonFatalError(e, "RingingIncomingFragment: Error notifying end call room on declineButton click")
                    }
                    dispose()
                    Timber.d("RingingIncomingFragment: Activity finishing after decline")
                    activity?.finish()
                }

                contactName.text = this@RingingIncomingFragment.contactName
                contactImage.loadImage(this@RingingIncomingFragment.contactImage, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
                Timber.d("RingingIncomingFragment: UI initialized with contactName=$contactName, contactImage=$contactImage")
            }
        } catch (e: Exception) {
            Timber.e(e, "RingingIncomingFragment: Error inflating view or setting up listeners")
            CrashlyticsLog.recordNonFatalError(e, "RingingIncomingFragment: Error inflating view or setting up listeners")
            throw e
        }
        return fragmentRingingIncomingBinding.root
    }

    /**
     * Answers the incoming call by navigating to CallFragment. Driven by the on-screen answer
     * button, by the `intentAction == "answer"` auto-answer on a fresh launch, and by
     * [CallActivity.onNewIntent] when the user taps "Answer" on the notification while this ringing
     * screen is already showing (the activity is singleTop, so that tap no longer recreates it).
     *
     * The getAction guard makes this idempotent: once we have navigated away the ringing
     * destination no longer owns the action, so a second trigger (e.g. on-screen button and
     * notification tapped together) is a safe no-op instead of a navigation crash.
     */
    fun answerIncomingCall() {
        Timber.i("RingingIncomingFragment: answerIncomingCall()")
        if (!isAdded) {
            Timber.w("RingingIncomingFragment: answerIncomingCall ignored, fragment not added")
            return
        }
        try {
            val navController = findNavController()
            val directions = RingingIncomingFragmentDirections.actionRingingIncomingFragmentToCallFragment(
                contactImage = contactImage,
                contactName = contactName,
                type = type!!,
                typeId = typeId!!,
                isOutgoing = isOutgoing,
                iceServerData = iceServerData,
                wearerDeviceId = wearerDeviceId
            )
            if (navController.currentDestination?.getAction(directions.actionId) == null) {
                Timber.w("RingingIncomingFragment: answer ignored, already left the ringing screen")
                return
            }
            dispose()
            Timber.d("RingingIncomingFragment: Navigating to CallFragment, typeId=$typeId")
            navController.navigate(directions)
        } catch (e: Exception) {
            Timber.e(e, "RingingIncomingFragment: Error navigating to CallFragment")
            CrashlyticsLog.recordNonFatalError(e, "RingingIncomingFragment: Error navigating to CallFragment")
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.i("RingingIncomingFragment: onViewCreated called")

        val callActivityReference = requireActivity() as CallActivity
        EdgeToEdgeHelper.applyControlsInsets(
            view = fragmentRingingIncomingBinding.root,
            activity = callActivityReference,
            applyTop = true,    // Keep content below status bar
            applyBottom = true  // Keep content above navigation bar (if button nav)
        ) { systemBars, cutout, navBars ->
            Timber.d("DispatchFragment: Controls insets applied - top: ${systemBars.top}, bottom: ${navBars.bottom}")
        }

        try {
            handler.postDelayed({
                Timber.i("RingingIncomingFragment: Ring timeout reached, finishing activity")
                try {
                    activity?.finish()
                } catch (e: Exception) {
                    Timber.e(e, "RingingIncomingFragment: Error finishing activity on ring timeout")
                    CrashlyticsLog.recordNonFatalError(e, "RingingIncomingFragment: Error finishing activity on ring timeout")
                }
            }, VideocallUtils.RING_TIMEOUT_MS.toLong())
        } catch (e: Exception) {
            Timber.e(e, "RingingIncomingFragment: Error posting ring timeout handler")
            CrashlyticsLog.recordNonFatalError(e, "RingingIncomingFragment: Error posting ring timeout handler")
        }

        Timber.d("RingingIncomingFragment: intentAction=$intentAction")
        try {
            when (intentAction) {
                "answer" -> {
                    Timber.i("RingingIncomingFragment: intentAction is 'answer', answering the call")
                    answerIncomingCall()
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "RingingIncomingFragment: Error handling intentAction in onViewCreated")
            CrashlyticsLog.recordNonFatalError(e, "RingingIncomingFragment: Error handling intentAction in onViewCreated")
        }
    }

    override fun onDestroyView() {
        Timber.i("RingingIncomingFragment: onDestroyView called")
        try {
            dispose()
        } catch (e: Exception) {
            Timber.e(e, "RingingIncomingFragment: Error in dispose during onDestroyView")
            CrashlyticsLog.recordNonFatalError(e, "RingingIncomingFragment: Error in dispose during onDestroyView")
        }
        super.onDestroyView()
    }

    private fun dispose() {
        Timber.d("RingingIncomingFragment: Disposing resources (removing callbacks, stopping ringtone)")
        try {
            handler.removeCallbacksAndMessages(null)
        } catch (e: Exception) {
            Timber.e(e, "RingingIncomingFragment: Error removing handler callbacks in dispose")
            CrashlyticsLog.recordNonFatalError(e, "RingingIncomingFragment: Error removing handler callbacks in dispose")
        }
        try {
            (activity as? CallActivity)?.stopRingtone()
        } catch (e: Exception) {
            Timber.e(e, "RingingIncomingFragment: Error stopping ringtone in dispose")
            CrashlyticsLog.recordNonFatalError(e, "RingingIncomingFragment: Error stopping ringtone in dispose")
        }
    }
}