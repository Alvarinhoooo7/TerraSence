package com.sosmartlabs.momo.videocall.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentDispatchBinding
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momo.videocall.CallActivity
import com.sosmartlabs.momo.videocall.ui.VideocallViewModel
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.videocall.utils.EdgeToEdgeHelper
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber

@ExperimentalCoroutinesApi
class DispatchFragment : Fragment(R.layout.fragment_dispatch) {

    private lateinit var fragmentDispatchBinding: FragmentDispatchBinding

    private var type: String? = null
    private var typeId: String? = null
    private var isOutgoing: Boolean = true
    private var contactName: String? = null
    private var contactImage: String? = null
    private var intentAction: String? = null
    private lateinit var wearerDeviceId: String

    private val videocallViewModel: VideocallViewModel by activityViewModels()
    private val args: DispatchFragmentArgs by navArgs()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.i("DispatchFragment: onCreate called")
        try {
            isOutgoing = args.isOutgoing
            type = args.type
            typeId = args.typeId
            contactName = args.contactName
            contactImage = args.contactImage
            intentAction = args.intentAction
            wearerDeviceId = args.wearerDeviceId
            Timber.d("DispatchFragment: Arguments loaded: isOutgoing=$isOutgoing, type=$type, typeId=$typeId, contactName=$contactName, contactImage=$contactImage, intentAction=$intentAction, wearerDeviceId=$wearerDeviceId")
        } catch (e: Exception) {
            Timber.e(e, "DispatchFragment: Error loading arguments in onCreate")
            CrashlyticsLog.recordNonFatalError(e, "DispatchFragment: Error loading arguments in onCreate")
        }
        getIceServers()
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.i("DispatchFragment: onCreateView called")
        try {
            fragmentDispatchBinding = FragmentDispatchBinding.inflate(inflater, container, false).apply {
                contactName.text = this@DispatchFragment.contactName
                contactImage.loadImage(this@DispatchFragment.contactImage, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
            }
            Timber.d("DispatchFragment: UI initialized with contactName=$contactName, contactImage=$contactImage")
        } catch (e: Exception) {
            Timber.e(e, "DispatchFragment: Error inflating view or setting contact info")
            CrashlyticsLog.recordNonFatalError(e, "DispatchFragment: Error inflating view or setting contact info")
            throw e
        }
        return fragmentDispatchBinding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.i("DispatchFragment: onViewCreated called")
        if (!isOutgoing) {
            try {
                Timber.d("DispatchFragment: Incoming call detected, playing ringtone")
                (activity as CallActivity).playRingtone()
            } catch (e: Exception) {
                Timber.e(e, "DispatchFragment: Error playing ringtone for incoming call")
                CrashlyticsLog.recordNonFatalError(e, "DispatchFragment: Error playing ringtone for incoming call")
            }
        }
        observeViewModel()

        val callActivityReference = requireActivity() as CallActivity
        EdgeToEdgeHelper.applyControlsInsets(
            view = fragmentDispatchBinding.root,
            activity = callActivityReference,
            applyTop = true,    // Keep content below status bar
            applyBottom = true  // Keep content above navigation bar (if button nav)
        ) { systemBars, cutout, navBars ->
            Timber.d("DispatchFragment: Controls insets applied - top: ${systemBars.top}, bottom: ${navBars.bottom}")
        }
    }

    private fun observeViewModel() {
        Timber.i("DispatchFragment: observeViewModel called, observing iceServerData")
        videocallViewModel.iceServerData.observe(this.viewLifecycleOwner) { iceServers ->
            Timber.d("DispatchFragment: iceServerData observed: $iceServers")
            if (iceServers.isNullOrEmpty()) {
                Timber.e("DispatchFragment: iceServerData is empty or null")
                CrashlyticsLog.log("DispatchFragment: iceServerData is empty or null")
                return@observe
            }
            try {
                if (isOutgoing) {
                    Timber.i("DispatchFragment: Outgoing call, navigating to CallFragment")
                    findNavController().navigate(
                        DispatchFragmentDirections.actionConnectingFragmentToCallFragment(
                            contactImage = contactImage,
                            contactName = contactName,
                            type = type ?: "",
                            typeId = typeId ?: "",
                            isOutgoing = isOutgoing,
                            iceServerData = iceServers.first(),
                            wearerDeviceId = wearerDeviceId
                        )
                    )
                } else {
                    Timber.i("DispatchFragment: Incoming call, navigating to RingingIncomingFragment")
                    findNavController().navigate(
                        DispatchFragmentDirections.actionConnectingFragmentToRingingIncomingFragment(
                            contactImage = contactImage,
                            contactName = contactName,
                            type = type ?: "",
                            typeId = typeId ?: "",
                            isOutgoing = isOutgoing,
                            intentAction = intentAction,
                            iceServerData = iceServers.first(),
                            wearerDeviceId = wearerDeviceId
                        )
                    )
                }
            } catch (e: Exception) {
                Timber.e(e, "DispatchFragment: Error navigating to next fragment")
                CrashlyticsLog.recordNonFatalError(e, "DispatchFragment: Error navigating to next fragment")
            }
        }
    }

    private fun getIceServers() {
        Timber.i("DispatchFragment: getIceServers called for wearerDeviceId=$wearerDeviceId")
        try {
            videocallViewModel.getIceServerData(wearerDeviceId)
            Timber.d("DispatchFragment: getIceServerData invoked on ViewModel")
        } catch (e: Exception) {
            Timber.e(e, "DispatchFragment: Error requesting ICE servers")
            CrashlyticsLog.recordNonFatalError(e, "DispatchFragment: Error requesting ICE servers")
        }
    }
}