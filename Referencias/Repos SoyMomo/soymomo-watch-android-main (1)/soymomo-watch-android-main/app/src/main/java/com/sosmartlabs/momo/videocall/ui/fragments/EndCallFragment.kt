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
import com.sosmartlabs.momo.databinding.FragmentEndCallBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.main.MainActivity
import com.sosmartlabs.momo.review.ReviewPromptRepository
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momo.videocall.CallActivity
import com.sosmartlabs.momo.videocall.ui.VideocallViewModel
import com.sosmartlabs.momo.videocall.utils.EdgeToEdgeHelper
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber
import java.util.*
import javax.inject.Inject

@OptIn(ExperimentalCoroutinesApi::class)
@AndroidEntryPoint
class EndCallFragment : Fragment(R.layout.fragment_end_call) {

    @Inject
    lateinit var reviewPromptRepository: ReviewPromptRepository

    private lateinit var fragmentEndCallBinding: FragmentEndCallBinding

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
        Timber.i("EndCallFragment: onCreate called")
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
            Timber.d("EndCallFragment: Arguments loaded: isOutgoing=$isOutgoing, type=$type, typeId=$typeId, contactName=$contactName, contactImage=$contactImage, duration=$duration, reason=$reason, deviceId=$deviceId, feedbackUUID=$feedbackUUID")
        } catch (e: Exception) {
            Timber.e(e, "EndCallFragment: Error loading arguments in onCreate")
            CrashlyticsLog.recordNonFatalError(e, "EndCallFragment: Error loading arguments in onCreate")
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.i("EndCallFragment: onCreateView called")
        try {
            fragmentEndCallBinding = FragmentEndCallBinding.inflate(inflater, container, false).apply {
                endButton.setOnClickListener {
                    Timber.i("EndCallFragment: End button clicked, saving feedback if required and navigating to MainActivity")
                    try {
                        saveVideocallFeedbackIfRequired()
                    } catch (e: Exception) {
                        Timber.e(e, "EndCallFragment: Error saving feedback on endButton click")
                        CrashlyticsLog.recordNonFatalError(e, "EndCallFragment: Error saving feedback on endButton click")
                    }
                    try {
                        val intent = Intent(requireContext(), MainActivity::class.java)
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        activity?.finish()
                        startActivity(intent)
                        Timber.i("EndCallFragment: Navigated to MainActivity and finished current activity")
                    } catch (e: Exception) {
                        Timber.e(e, "EndCallFragment: Error navigating to MainActivity")
                        CrashlyticsLog.recordNonFatalError(e, "EndCallFragment: Error navigating to MainActivity")
                    }
                }
                contactName.text = this@EndCallFragment.contactName
                contactImage.loadImage(this@EndCallFragment.contactImage, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
            }
            Timber.d("EndCallFragment: UI initialized with contactName=$contactName, contactImage=$contactImage")
        } catch (e: Exception) {
            Timber.e(e, "EndCallFragment: Error inflating view or setting contact info")
            CrashlyticsLog.recordNonFatalError(e, "EndCallFragment: Error inflating view or setting contact info")
            throw e
        }
        return fragmentEndCallBinding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.i("EndCallFragment: onViewCreated called")

        val callActivityReference = requireActivity() as CallActivity
        EdgeToEdgeHelper.applyControlsInsets(
            view = fragmentEndCallBinding.root,
            activity = callActivityReference,
            applyTop = true,    // Keep content below status bar
            applyBottom = true  // Keep content above navigation bar (if button nav)
        ) { systemBars, cutout, navBars ->
            Timber.d("EndCallFragment: Controls insets applied - top: ${systemBars.top}, bottom: ${navBars.bottom}")
        }

        try {
            videocallViewModel.currentFeedbackUUID.observe(viewLifecycleOwner) {
                Timber.d("EndCallFragment: currentFeedbackUUID observed: $it")
                feedbackUUID = it
            }
        } catch (e: Exception) {
            Timber.e(e, "EndCallFragment: Error observing currentFeedbackUUID")
            CrashlyticsLog.recordNonFatalError(e, "EndCallFragment: Error observing currentFeedbackUUID")
        }
        try {
            Handler().postDelayed({
                Timber.i("EndCallFragment: Playing end call busy tone")
                try {
                    endCallToneGenerator.startTone(ToneGenerator.TONE_SUP_BUSY, 4000)
                } catch (e: Exception) {
                    Timber.e(e, "EndCallFragment: Error starting end call tone")
                    CrashlyticsLog.recordNonFatalError(e, "EndCallFragment: Error starting end call tone")
                }
            }, 500)
        } catch (e: Exception) {
            Timber.e(e, "EndCallFragment: Error posting delayed tone")
            CrashlyticsLog.recordNonFatalError(e, "EndCallFragment: Error posting delayed tone")
        }
    }

    private fun saveVideocallFeedbackIfRequired() {
        Timber.i("EndCallFragment: saveVideocallFeedbackIfRequired called")
        val rating = fragmentEndCallBinding.callRating.rating.toInt()
        if (rating == 0) {
            Timber.d("EndCallFragment: No rating given, skipping feedback save")
            return
        }
        if (!isOutgoing) {
            Timber.d("EndCallFragment: Not an outgoing call, skipping feedback save")
            return
        }
        if (feedbackUUID == null) {
            Timber.e("EndCallFragment: feedbackUUID is null, cannot save feedback")
            CrashlyticsLog.log("EndCallFragment: feedbackUUID is null, cannot save feedback")
            return
        }
        try {
            videocallViewModel.addRatingToFeedback(feedbackUUID!!, rating)
            Timber.i("EndCallFragment: Feedback rating $rating saved for feedbackUUID=$feedbackUUID")
        } catch (e: Exception) {
            Timber.e(e, "EndCallFragment: Error saving feedback rating")
            CrashlyticsLog.recordNonFatalError(e, "EndCallFragment: Error saving feedback rating")
        }
        if (rating == 5) {
            try {
                reviewPromptRepository.setVideocallGreatFeedback(true)
                Timber.i("EndCallFragment: Great feedback (5 stars) recorded in ReviewPromptRepository")
            } catch (e: Exception) {
                Timber.e(e, "EndCallFragment: Error setting great feedback in ReviewPromptRepository")
                CrashlyticsLog.recordNonFatalError(e, "EndCallFragment: Error setting great feedback in ReviewPromptRepository")
            }
        }
    }
}
