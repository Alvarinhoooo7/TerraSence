package com.sosmartlabs.momo.sim.ui.fragments.payment

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
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.AddFirstMomoActivity
import com.sosmartlabs.momo.databinding.SubscriptionPaymentSuccessFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.linkwatch.LinkWatchActivity
import com.sosmartlabs.momo.sim.SimActivity
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionActivationStatus
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.sim.ui.dialog.IotNumberInfoDialogFragment
import com.sosmartlabs.momo.utils.PhoneExceptionRegistry
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
            is AddFirstMomoActivity -> {
                binding.buttonFinish.text = getString(R.string.button_next)
            }
            is SimActivity -> {
                binding.buttonFinish.text = getString(R.string.subscription_button_finish)
            }
            is LinkWatchActivity -> {
                binding.buttonFinish.text = getString(R.string.button_next)
            }
        }
    }

    private fun setupListeners() {
        Timber.d("PaymentSuccessFragment: Setting up button and back press listeners")
        
        binding.buttonFinish.setOnClickListener {
            Timber.d("PaymentSuccessFragment: Finish button clicked")
            CrashlyticsLog.log("PaymentSuccessFragment: Finish button clicked")
            
            when (activity) {
                is AddFirstMomoActivity -> {
                    Timber.d("PaymentSuccessFragment: Navigating to insert SIM fragment from AddFirstMomoActivity")
                    navigateById(R.id.action_newSubscriptionPaymentSuccess_to_insertSimFragment)
                }
                is SimActivity -> {
                    Timber.d("PaymentSuccessFragment: Restarting SimActivity")
                    requireActivity().finish()
                    startActivity(Intent(requireContext(), SimActivity::class.java))
                }
                is LinkWatchActivity -> {
                    Timber.d("PaymentSuccessFragment: Navigating to configure SIM fragment from LinkWatchActivity")
                    val newBundle = Bundle()
                    newBundle.putBoolean("fromMomoSIM", true)
                    navigateById(R.id.action_global_configureSIMFragment, newBundle)
                }
            }
        }

        binding.phoneInfoButton.setOnClickListener {
            Timber.d("PaymentSuccessFragment: Phone info button clicked")
            CrashlyticsLog.log("PaymentSuccessFragment: Phone info button clicked")
            IotNumberInfoDialogFragment().show(parentFragmentManager, IotNumberInfoDialogFragment.TAG)
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
            Timber.d("PaymentSuccessFragment: New subscription created")
            CrashlyticsLog.log("PaymentSuccessFragment: New subscription created")
            
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
                    binding.phoneInfoButton.visibility = View.GONE
                }
                SubscriptionActivationStatus.SUBSCRIPTION_SAVING -> {
                    Timber.d("PaymentSuccessFragment: Activation status SUBSCRIPTION_SAVING")
                    binding.subscriptionCardFlipper.displayedChild = 0
                    binding.buttonFinish.isEnabled = false
                    binding.phoneInfoButton.visibility = View.GONE
                }
                SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS -> {
                    Timber.d("PaymentSuccessFragment: Activation status SUBSCRIPTION_SUCCESS")
                    binding.subscriptionCardFlipper.displayedChild = 1
                    binding.buttonFinish.isEnabled = true
                    // A phone number is shown; offer the IoT explainer for covered countries (ES/SE).
                    binding.phoneInfoButton.visibility =
                        if (shouldOfferPhoneInfo()) View.VISIBLE else View.GONE
                    newSubscriptionViewModel.trackSimSubscriptionCompleted()
                }
                SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS_NO_PHONE -> {
                    Timber.d("PaymentSuccessFragment: Activation status SUBSCRIPTION_SUCCESS_NO_PHONE")
                    binding.subscriptionCardFlipper.displayedChild = 2
                    binding.buttonFinish.isEnabled = true
                    binding.phoneInfoButton.visibility = View.GONE
                    newSubscriptionViewModel.trackSimSubscriptionCompleted()
                }
                else -> {
                    Timber.d("PaymentSuccessFragment: Activation status unknown: $status")
                    CrashlyticsLog.log("PaymentSuccessFragment: Unknown activation status: $status")
                    binding.subscriptionCardFlipper.displayedChild = 2
                    binding.buttonFinish.isEnabled = true
                    binding.phoneInfoButton.visibility = View.GONE
                }
            }
        }
    }

    private fun setNewSubscriptionView(subscription: Subscription) {
        Timber.d("PaymentSuccessFragment: Setting subscription view")

        if (!subscription.msisdn.isNullOrEmpty()) {
            binding.subscriptionCardActivatedPhone.text = subscription.msisdn
        } else {
            Timber.d("PaymentSuccessFragment: Subscription has no MSISDN")
            CrashlyticsLog.log("PaymentSuccessFragment: Subscription has no MSISDN")
        }
    }

    /**
     * Whether to offer the IoT/M2M number explainer: true when the subscriber's country is one
     * covered by [PhoneExceptionRegistry] (currently ES / SE). Mirrors the iOS gate on
     * subscription.subscriber.country. The in-memory subscriber info is read first because the
     * subscription returned by the activateSimCard cloud function can carry `subscriber` as an
     * unfetched pointer, and reading a field on an unfetched ParseObject THROWS (it does not
     * return null) — so the pointer is only read when its data is actually available.
     */
    private fun shouldOfferPhoneInfo(): Boolean {
        val country = newSubscriptionViewModel.currentSubscriptionUserInfo.value?.country
            ?: newSubscriptionViewModel.newCreatedSubscription.value?.subscriber
                ?.takeIf { it.isDataAvailable("country") }?.country
        val isCovered = country?.uppercase() in PhoneExceptionRegistry.supportedCountries
        Timber.d("PaymentSuccessFragment: shouldOfferPhoneInfo country=$country covered=$isCovered")
        return isCovered
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("PaymentSuccessFragment: Navigating to destination ID: $navId")
        CrashlyticsLog.log("PaymentSuccessFragment: Navigating to destination ID: $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
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
