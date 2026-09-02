package com.sosmartlabs.momo.sim.ui.fragments.newsubscription

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.addCallback
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.airbnb.lottie.LottieDrawable
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.SubscriptionNewEndFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.H2OChile
import com.sosmartlabs.momo.models.H2OChileAmPm
import com.sosmartlabs.momo.models.H2OEurope
import com.sosmartlabs.momo.models.H2OSpain
import com.sosmartlabs.momo.models.Lite1
import com.sosmartlabs.momo.models.Original
import com.sosmartlabs.momo.models.Space1
import com.sosmartlabs.momo.models.Space2
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.sim.SimActivity
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionActivationStatus
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.utils.ui.DefaultErrorDialog
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber

class NewSubscriptionEndFragment : Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionNewEndFragmentBinding

    /**
     * ViewModel
     */
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("NewSubscriptionEndFragment: onCreateView")
        binding = SubscriptionNewEndFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("NewSubscriptionEndFragment: onViewCreated")
        CrashlyticsLog.log("NewSubscriptionEndFragment: onViewCreated")
        setupListeners()
        observeViewModel()
    }

    private fun setupListeners() {
        Timber.d("NewSubscriptionEndFragment: Setting up listeners")
        
        binding.buttonNext.setOnClickListener {
            Timber.d("NewSubscriptionEndFragment: Next button clicked, finishing activity")
            CrashlyticsLog.log("NewSubscriptionEndFragment: Next button clicked, finishing activity")
            requireActivity().finish()
            startActivity(Intent(requireContext(), SimActivity::class.java))
        }

        binding.actionCopyContentClipboard.setOnClickListener {
            Timber.d("NewSubscriptionEndFragment: Copy to clipboard button clicked")
            newSubscriptionViewModel.newCreatedSubscription.value?.let { subscription ->
                try {
                    val clipboard = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    val clip: ClipData = ClipData.newPlainText("phone", subscription.msisdn)
                    clipboard.setPrimaryClip(clip)
                    Timber.d("NewSubscriptionEndFragment: Phone number copied to clipboard")
                    Toast.makeText(requireContext(), getString(R.string.subscription_button_copy_content_clipboard, subscription.msisdn), Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Timber.e("NewSubscriptionEndFragment: Error copying to clipboard")
                    CrashlyticsLog.recordNonFatalError(e, "NewSubscriptionEndFragment: Error copying to clipboard")
                }
            } ?: run {
                Timber.e("NewSubscriptionEndFragment: Cannot copy phone number - subscription is null")
                CrashlyticsLog.log("NewSubscriptionEndFragment: Cannot copy phone number - subscription is null")
            }
        }

        requireActivity().onBackPressedDispatcher.addCallback(viewLifecycleOwner) {
            Timber.d("NewSubscriptionEndFragment: Back pressed, navigating to SimActivity")
            CrashlyticsLog.log("NewSubscriptionEndFragment: Back pressed, navigating to SimActivity")
            startActivity(Intent(requireContext(), SimActivity::class.java))
        }
    }

    private fun observeViewModel() {
        Timber.d("NewSubscriptionEndFragment: Setting up ViewModel observers")
        
        newSubscriptionViewModel.newCreatedSubscription.observe(viewLifecycleOwner) { subscription ->
            Timber.d("NewSubscriptionEndFragment: Received subscription update")
            setNewSubscriptionView(subscription)
        }

        newSubscriptionViewModel.currentWearer.observe(viewLifecycleOwner) { wearer ->
            Timber.d("NewSubscriptionEndFragment: Received wearer update")
            setWatchView(wearer)
            setAnimation(wearer)
        }

        newSubscriptionViewModel.newCreatedSubscriptionActivationStatus.observe(viewLifecycleOwner) { status ->
            Timber.d("NewSubscriptionEndFragment: Received activation status update: $status")
            CrashlyticsLog.log("NewSubscriptionEndFragment: Activation status: $status")
            
            when (status) {
                SubscriptionActivationStatus.DEFAULT -> {
                    Timber.d("NewSubscriptionEndFragment: Status DEFAULT - No operation needed")
                    // No-OP
                }
                SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS -> {
                    Timber.d("NewSubscriptionEndFragment: Status SUCCESS - Showing phone number")
                    newSubscriptionViewModel.trackSimSubscriptionCompleted()
                    
                    // Progress
                    binding.progressTitle.visibility = View.GONE
                    binding.progressIndicator.visibility = View.GONE

                    // Activated with phone number
                    binding.titleCongratulations.visibility = View.VISIBLE
                    binding.textDisplayPhoneNumberTitle.visibility = View.VISIBLE
                    binding.textDisplayPhoneNumber.visibility = View.VISIBLE
                    binding.actionCopyContentClipboard.visibility = View.VISIBLE

                    // Activated with empty phone number
                    binding.titleNoPhone.visibility = View.GONE
                    binding.textNoPhone.visibility = View.GONE
                }
                SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS_NO_PHONE -> {
                    Timber.d("NewSubscriptionEndFragment: Status SUCCESS_NO_PHONE - Showing no phone message")
                    newSubscriptionViewModel.trackSimSubscriptionCompleted()
                    
                    // Progress
                    binding.progressTitle.visibility = View.GONE
                    binding.progressIndicator.visibility = View.GONE

                    // Activated with phone number
                    binding.titleCongratulations.visibility = View.GONE
                    binding.textDisplayPhoneNumberTitle.visibility = View.GONE
                    binding.textDisplayPhoneNumber.visibility = View.GONE
                    binding.actionCopyContentClipboard.visibility = View.GONE

                    // Activated with empty phone number
                    binding.titleNoPhone.visibility = View.VISIBLE
                    binding.textNoPhone.visibility = View.VISIBLE
                }
                SubscriptionActivationStatus.SUBSCRIPTION_SAVING -> {
                    Timber.d("NewSubscriptionEndFragment: Status SAVING - Showing progress")
                    
                    // Progress
                    binding.progressTitle.visibility = View.VISIBLE
                    binding.progressIndicator.visibility = View.VISIBLE

                    // Activated with phone number
                    binding.titleCongratulations.visibility = View.GONE
                    binding.textDisplayPhoneNumberTitle.visibility = View.GONE
                    binding.textDisplayPhoneNumber.visibility = View.GONE
                    binding.actionCopyContentClipboard.visibility = View.GONE

                    // Activated with empty phone number
                    binding.titleNoPhone.visibility = View.GONE
                    binding.textNoPhone.visibility = View.GONE
                }
                else -> {
                    Timber.e("NewSubscriptionEndFragment: Unknown activation status: $status")
                    CrashlyticsLog.log("NewSubscriptionEndFragment: Unknown activation status: $status")
                    showErrorDialog(status.toString(), "")
                }
            }
        }
    }

    private fun setAnimation(watch: Wearer) {
        Timber.d("NewSubscriptionEndFragment: Setting animation for watch model: ${watch.model}")
        
        with(watch) {
            val animationId = when (model) {
                Original -> R.raw.sim_linked_success_h2o
                H2OChile, H2OChileAmPm, H2OEurope, H2OSpain -> R.raw.sim_linked_success_h2o
                Space1 -> R.raw.sim_linked_success_space_1
                Space2 -> R.raw.sim_linked_success_space_2
                Lite1 -> R.raw.sim_linked_success_space_lite
                else -> {
                    Timber.d("NewSubscriptionEndFragment: Unknown watch model, defaulting to Space2 animation")
                    R.raw.sim_linked_success_space_2
                }
            }
            with(binding.insertSimAnimation) {
                setAnimation(animationId)
                repeatCount = LottieDrawable.INFINITE
                playAnimation()
            }
        }
    }

    private fun setNewSubscriptionView(subscription: Subscription) {
        if (!subscription.msisdn.isNullOrEmpty()) {
            Timber.d("NewSubscriptionEndFragment: Setting phone number")
            binding.textDisplayPhoneNumber.text = subscription.msisdn
        } else {
            Timber.d("NewSubscriptionEndFragment: No phone number available in subscription")
        }
    }

    private fun setWatchView(watch: Wearer) {
        Timber.d("NewSubscriptionEndFragment: Setting watch profile picture")
        
        watch.image?.let {
            Timber.d("NewSubscriptionEndFragment: Loading watch image")
            binding.watchProfilePicture.loadImage(it.url, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
        } ?: run {
            Timber.d("NewSubscriptionEndFragment: No watch image available, using default")
            binding.watchProfilePicture.loadImage(DefaultIcons.PROFILE_MOMO_SPACE, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
        }
    }

    private fun showErrorDialog(title: String, description: String?) {
        Timber.e("NewSubscriptionEndFragment: Showing error dialog: $title, $description")
        CrashlyticsLog.log("NewSubscriptionEndFragment: Showing error dialog: $title")
        
        val defaultErrorDialog = DefaultErrorDialog()
        defaultErrorDialog.arguments = bundleOf(
            "icon" to "",
            "title" to title,
            "description" to description,
        )
        defaultErrorDialog.show(childFragmentManager, title)
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("NewSubscriptionEndFragment: Navigating to destination ID: $navId")
        CrashlyticsLog.log("NewSubscriptionEndFragment: Navigating to destination ID: $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    override fun onDestroyView() {
        Timber.d("NewSubscriptionEndFragment: onDestroyView")
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        Timber.d("NewSubscriptionEndFragment: Disposing resources")
    }
}
