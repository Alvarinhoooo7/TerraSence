package com.sosmartlabs.momotabletpadres.sim.ui.fragments.payment

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import androidx.activity.addCallback
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.airbnb.lottie.LottieDrawable
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionPaymentSuccessFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.SimActivity
import com.sosmartlabs.momotabletpadres.sim.model.Subscription
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionActivationStatus
import com.sosmartlabs.momotabletpadres.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

class PaymentSuccessFragment : Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionPaymentSuccessFragmentBinding

    /**
     * ViewModel
     */
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("PaymentSuccessFragment: onCreate")
        CrashlyticsLog.log("PaymentSuccessFragment: onCreate")
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("PaymentSuccessFragment: onCreateView")
        binding = SubscriptionPaymentSuccessFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("PaymentSuccessFragment: onViewCreated")
        CrashlyticsLog.log("PaymentSuccessFragment: onViewCreated")
        
        if (activity is SimActivity) {
            Timber.d("PaymentSuccessFragment: Setting FLAG_LAYOUT_NO_LIMITS for SimActivity")
            requireActivity().window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
        }

        setupButtonFinishText()
        setupListeners()
        setAnimation()
        observeViewModel()

        // Reserve the status bar for the top animation (topAsMargin ADDS the status-bar
        // inset to the animation's existing top margin, restoring its intended spacing
        // below the bar) and keep the action button clear of the navigation bar.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.paymentSuccessAnimation,
            topAsMargin = true,
            bottomView = binding.buttonFinish,
            bottomAsMargin = true,
        )

        Timber.d("PaymentSuccessFragment: Activating SIM card")
        CrashlyticsLog.log("PaymentSuccessFragment: Activating SIM card")
        newSubscriptionViewModel.activateSimCard()
    }

    private fun setAnimation() {
        Timber.d("PaymentSuccessFragment: Setting up success animation")
        with(binding.paymentSuccessAnimation) {
            setAnimation(R.raw.payment_success)
            repeatCount = LottieDrawable.INFINITE
            playAnimation()
        }
    }

    private fun setupButtonFinishText() {
        Timber.d("PaymentSuccessFragment: Setting up button finish title depending on activity ${activity?.javaClass?.simpleName}")
        when (activity) {
            is SimActivity -> {
                binding.buttonFinish.text = getString(R.string.subscription_button_finish)
            }
        }
    }

    private fun setupListeners() {
        Timber.d("PaymentSuccessFragment: Setting up button and back press listeners")
        
        binding.buttonFinish.setOnClickListener {
            Timber.d("PaymentSuccessFragment: Finish button clicked")
            CrashlyticsLog.log("PaymentSuccessFragment: Finish button clicked")
            
            when (activity) {
                is SimActivity -> {
                    Timber.d("PaymentSuccessFragment: Restarting SimActivity")
                    requireActivity().finish()
                    startActivity(Intent(requireContext(), SimActivity::class.java))
                }
            }
        }

        requireActivity().onBackPressedDispatcher.addCallback(viewLifecycleOwner) {
            Timber.d("PaymentSuccessFragment: Back button pressed")
            CrashlyticsLog.log("PaymentSuccessFragment: Back button pressed")
            
            if (activity is SimActivity) {
                Timber.d("PaymentSuccessFragment: Restarting SimActivity on back press")
                requireActivity().finish()
                startActivity(Intent(requireContext(), SimActivity::class.java))
            }
        }
    }

    private fun observeViewModel() {
        Timber.d("PaymentSuccessFragment: Setting up ViewModel observers")
        
        newSubscriptionViewModel.newCreatedSubscription.observe(viewLifecycleOwner) { subscription ->
            Timber.d("PaymentSuccessFragment: New subscription created: ${subscription.objectId}")
            CrashlyticsLog.log("PaymentSuccessFragment: New subscription created with ID: ${subscription.objectId}")
            
            newSubscriptionViewModel.createApioSubscription(subscription)
            setNewSubscriptionView(subscription)
        }

        newSubscriptionViewModel.newCreatedSubscriptionActivationStatus.observe(viewLifecycleOwner) { status ->
            Timber.d("PaymentSuccessFragment: Subscription activation status changed to: $status")
            CrashlyticsLog.log("PaymentSuccessFragment: Subscription activation status: $status")
            
            when (status) {
                SubscriptionActivationStatus.DEFAULT -> {
                    Timber.d("PaymentSuccessFragment: Activation status DEFAULT")
                    binding.subscriptionCardFlipper.displayedChild = 0
                    binding.buttonFinish.isEnabled = false
                }
                SubscriptionActivationStatus.SUBSCRIPTION_SAVING -> {
                    Timber.d("PaymentSuccessFragment: Activation status SUBSCRIPTION_SAVING")
                    binding.subscriptionCardFlipper.displayedChild = 0
                    binding.buttonFinish.isEnabled = false
                }
                SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS -> {
                    Timber.d("PaymentSuccessFragment: Activation status SUBSCRIPTION_SUCCESS")
                    binding.subscriptionCardFlipper.displayedChild = 1
                    binding.buttonFinish.isEnabled = true
                }
                SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS_NO_PHONE -> {
                    Timber.d("PaymentSuccessFragment: Activation status SUBSCRIPTION_SUCCESS_NO_PHONE")
                    binding.subscriptionCardFlipper.displayedChild = 2
                    binding.buttonFinish.isEnabled = true
                }
                else -> {
                    Timber.d("PaymentSuccessFragment: Activation status unknown: $status")
                    CrashlyticsLog.log("PaymentSuccessFragment: Unknown activation status: $status")
                    binding.subscriptionCardFlipper.displayedChild = 2
                    binding.buttonFinish.isEnabled = true
                }
            }
        }
    }

    private fun setNewSubscriptionView(subscription: Subscription) {
        Timber.d("PaymentSuccessFragment: Setting subscription view with MSISDN: ${subscription.msisdn}")
        
        if (!subscription.msisdn.isNullOrEmpty()) {
            binding.subscriptionCardActivatedPhone.text = subscription.msisdn
        } else {
            Timber.d("PaymentSuccessFragment: Subscription has no MSISDN")
            CrashlyticsLog.log("PaymentSuccessFragment: Subscription ${subscription.objectId} has no MSISDN")
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("PaymentSuccessFragment: Navigating to destination ID: $navId")
        CrashlyticsLog.log("PaymentSuccessFragment: Navigating to destination ID: $navId")
        findNavController().navigate(navId, bundle)
    }

    override fun onDestroyView() {
        Timber.d("PaymentSuccessFragment: onDestroyView")
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        Timber.d("PaymentSuccessFragment: Disposing resources")
        
        if (activity is SimActivity) {
            Timber.d("PaymentSuccessFragment: Clearing FLAG_LAYOUT_NO_LIMITS for SimActivity")
            requireActivity().window.clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
        }
    }
}