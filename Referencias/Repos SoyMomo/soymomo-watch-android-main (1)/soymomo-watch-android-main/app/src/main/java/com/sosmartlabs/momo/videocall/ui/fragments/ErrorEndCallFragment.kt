package com.sosmartlabs.momo.videocall.ui.fragments

import android.content.Intent
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Bundle
import android.os.Handler
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.navArgs
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentErrorEndCallBinding
import com.sosmartlabs.momo.main.MainActivity
import com.sosmartlabs.momo.videocall.CallActivity
import com.sosmartlabs.momo.videocall.ui.VideocallViewModel
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.videocall.utils.EdgeToEdgeHelper
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber
import java.util.*

@OptIn(ExperimentalCoroutinesApi::class)
@AndroidEntryPoint
class ErrorEndCallFragment : Fragment(R.layout.fragment_error_end_call) {

    private lateinit var fragmentErrorEndCallBinding: FragmentErrorEndCallBinding

    private var deviceId: String? = null
    private var type: String? = null
    private var typeId: String? = null
    private var isOutgoing: Boolean = true
    private var contactName: String? = null
    private var contactImage: String? = null
    private var duration: String? = null
    private var reason: String? = null

    private val endCallToneGenerator: ToneGenerator = ToneGenerator(AudioManager.STREAM_RING, Int.MAX_VALUE)

    private val args: EndCallFragmentArgs by navArgs()
    private val videocallViewModel: VideocallViewModel by activityViewModels()

    private var feedbackUUID: UUID? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.i("ErrorEndCallFragment: onCreate called")
        try {
            isOutgoing = args.isOutgoing
            type = args.type
            typeId = args.typeId
            contactName = args.contactName
            contactImage = args.contactImage
            duration = args.duration
            reason = args.reason
            deviceId = args.wearerDeviceId
            if (args.feedbackUuid != null) {
                feedbackUUID = args.feedbackUuid
            }
            Timber.d("ErrorEndCallFragment: Arguments loaded: isOutgoing=$isOutgoing, type=$type, typeId=$typeId, contactName=$contactName, contactImage=$contactImage, duration=$duration, reason=$reason, deviceId=$deviceId, feedbackUUID=$feedbackUUID")
        } catch (e: Exception) {
            Timber.e(e, "ErrorEndCallFragment: Error loading arguments in onCreate")
            CrashlyticsLog.recordNonFatalError(e, "ErrorEndCallFragment: Error loading arguments in onCreate")
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.i("ErrorEndCallFragment: onCreateView called")
        try {
            fragmentErrorEndCallBinding = FragmentErrorEndCallBinding.inflate(inflater, container, false)
            fragmentErrorEndCallBinding.retryButton.setOnClickListener {
                Timber.i("ErrorEndCallFragment: Retry button clicked, saving feedback and restarting CallActivity")
                try {
                    saveVideocallFeedbackIfRequired()
                } catch (e: Exception) {
                    Timber.e(e, "ErrorEndCallFragment: Error saving feedback on retryButton click")
                    CrashlyticsLog.recordNonFatalError(e, "ErrorEndCallFragment: Error saving feedback on retryButton click")
                }
                try {
                    val intent = Intent(requireContext(), CallActivity::class.java).apply {
                        putExtra("type", "user")
                        putExtra("typeId", typeId)
                        putExtra("contactName", contactName)
                        putExtra("contactImage", contactImage)
                        putExtra("isOutgoing", isOutgoing)
                        putExtra("intentAction", "")
                        putExtra("wearerDeviceId", typeId)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    activity?.finish()
                    startActivity(intent)
                    Timber.i("ErrorEndCallFragment: CallActivity restarted after error end call")
                } catch (e: Exception) {
                    Timber.e(e, "ErrorEndCallFragment: Error restarting CallActivity from retryButton")
                    CrashlyticsLog.recordNonFatalError(e, "ErrorEndCallFragment: Error restarting CallActivity from retryButton")
                }
            }
            fragmentErrorEndCallBinding.returnHomeButton.setOnClickListener {
                Timber.i("ErrorEndCallFragment: Return Home button clicked, saving feedback and navigating to MainActivity")
                try {
                    saveVideocallFeedbackIfRequired()
                } catch (e: Exception) {
                    Timber.e(e, "ErrorEndCallFragment: Error saving feedback on returnHomeButton click")
                    CrashlyticsLog.recordNonFatalError(e, "ErrorEndCallFragment: Error saving feedback on returnHomeButton click")
                }
                try {
                    val intent = Intent(requireContext(), MainActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    activity?.finish()
                    startActivity(intent)
                    Timber.i("ErrorEndCallFragment: Navigated to MainActivity and finished current activity")
                } catch (e: Exception) {
                    Timber.e(e, "ErrorEndCallFragment: Error navigating to MainActivity from returnHomeButton")
                    CrashlyticsLog.recordNonFatalError(e, "ErrorEndCallFragment: Error navigating to MainActivity from returnHomeButton")
                }
            }
            Timber.d("ErrorEndCallFragment: UI initialized and button listeners set")
        } catch (e: Exception) {
            Timber.e(e, "ErrorEndCallFragment: Error inflating view or setting up listeners")
            CrashlyticsLog.recordNonFatalError(e, "ErrorEndCallFragment: Error inflating view or setting up listeners")
            throw e
        }
        return fragmentErrorEndCallBinding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.i("ErrorEndCallFragment: onViewCreated called")

        val callActivityReference = requireActivity() as CallActivity
        EdgeToEdgeHelper.applyControlsInsets(
            view = fragmentErrorEndCallBinding.root,
            activity = callActivityReference,
            applyTop = true,    // Keep content below status bar
            applyBottom = true  // Keep content above navigation bar (if button nav)
        ) { systemBars, cutout, navBars ->
            Timber.d("ErrorEndCallFragment: Controls insets applied - top: ${systemBars.top}, bottom: ${navBars.bottom}")
        }

        try {
            videocallViewModel.currentFeedbackUUID.observe(viewLifecycleOwner) {
                Timber.d("ErrorEndCallFragment: currentFeedbackUUID observed: $it")
                feedbackUUID = it
            }
        } catch (e: Exception) {
            Timber.e(e, "ErrorEndCallFragment: Error observing currentFeedbackUUID")
            CrashlyticsLog.recordNonFatalError(e, "ErrorEndCallFragment: Error observing currentFeedbackUUID")
        }
        try {
            Handler().postDelayed({
                Timber.i("ErrorEndCallFragment: Playing end call busy tone")
                try {
                    endCallToneGenerator.startTone(ToneGenerator.TONE_SUP_BUSY, 4000)
                } catch (e: Exception) {
                    Timber.e(e, "ErrorEndCallFragment: Error starting end call tone")
                    CrashlyticsLog.recordNonFatalError(e, "ErrorEndCallFragment: Error starting end call tone")
                }
            }, 500)
        } catch (e: Exception) {
            Timber.e(e, "ErrorEndCallFragment: Error posting delayed tone")
            CrashlyticsLog.recordNonFatalError(e, "ErrorEndCallFragment: Error posting delayed tone")
        }
    }

    private fun saveVideocallFeedbackIfRequired() {
        Timber.i("ErrorEndCallFragment: saveVideocallFeedbackIfRequired called")
        val rating = 0
        if (feedbackUUID == null) {
            Timber.e("ErrorEndCallFragment: feedbackUUID is null, cannot save feedback")
            CrashlyticsLog.log("ErrorEndCallFragment: feedbackUUID is null, cannot save feedback")
            return
        }
        try {
            videocallViewModel.addRatingToFeedback(feedbackUUID!!, rating)
            Timber.i("ErrorEndCallFragment: Feedback rating $rating saved for feedbackUUID=$feedbackUUID")
        } catch (e: Exception) {
            Timber.e(e, "ErrorEndCallFragment: Error saving feedback rating")
            CrashlyticsLog.recordNonFatalError(e, "ErrorEndCallFragment: Error saving feedback rating")
        }
    }
}