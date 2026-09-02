package com.sosmartlabs.momotabletpadres.sim.ui.fragments.payment

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.airbnb.lottie.LottieDrawable
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionPaymentErrorFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.SimActivity
import com.sosmartlabs.momotabletpadres.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

class PaymentErrorFragment : Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionPaymentErrorFragmentBinding

    /**
     * ViewModel
     */
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("PaymentErrorFragment: onCreate")
        CrashlyticsLog.log("PaymentErrorFragment: onCreate")
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("PaymentErrorFragment: onCreateView")
        binding = SubscriptionPaymentErrorFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("PaymentErrorFragment: onViewCreated")
        CrashlyticsLog.log("PaymentErrorFragment: onViewCreated")
        
        requireActivity().window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
        setupListeners()
        setAnimation()
        observeViewModel()

        // Reserve the status bar for the top animation (topAsMargin ADDS the status-bar
        // inset to the animation's existing top margin, restoring its intended spacing
        // below the bar) and keep the action button clear of the navigation bar.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.paymentErrorAnimation,
            topAsMargin = true,
            bottomView = binding.buttonTryAgain,
            bottomAsMargin = true,
        )
    }

    private fun setAnimation() {
        Timber.d("PaymentErrorFragment: Setting up error animation")
        with(binding.paymentErrorAnimation) {
            setAnimation(R.raw.payment_failure)
            repeatCount = LottieDrawable.INFINITE
            playAnimation()
        }
    }

    private fun setupListeners() {
        Timber.d("PaymentErrorFragment: Setting up button listeners")
        
        binding.buttonTryAgain.setOnClickListener {
            Timber.d("PaymentErrorFragment: Try again button clicked")
            CrashlyticsLog.log("PaymentErrorFragment: User clicked try again button")
            
            newSubscriptionViewModel.resetCurrentSubscriptionUserInfoStatus()
            
            when (activity) {
                is SimActivity -> {
                    Timber.d("PaymentErrorFragment: Navigating from SimActivity")
                    navigateById(R.id.action_add_sim_newSubscriptionPaymentError_to_newSubscriptionChoosePlanFragment)
                }
                else -> {
                    Timber.e("PaymentErrorFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                    CrashlyticsLog.log("PaymentErrorFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                }
            }
        }
    }

    private fun observeViewModel() {
        Timber.d("PaymentErrorFragment: Setting up ViewModel observers")
        
        newSubscriptionViewModel.currentSubscriptionPlan.observe(viewLifecycleOwner) {
            Timber.d("PaymentErrorFragment: Received subscription plan update")
            // No-op
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("PaymentErrorFragment: Navigating to destination ID: $navId")
        CrashlyticsLog.log("PaymentErrorFragment: Navigating to destination ID: $navId")
        findNavController().navigate(navId, bundle)
    }

    override fun onDestroyView() {
        Timber.d("PaymentErrorFragment: onDestroyView")
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        Timber.d("PaymentErrorFragment: Disposing resources")
        
        if (activity is SimActivity) {
            Timber.d("PaymentErrorFragment: Clearing FLAG_LAYOUT_NO_LIMITS for SimActivity")
            requireActivity().window.clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
        } else {
            Timber.d("PaymentErrorFragment: Clearing FLAG_LAYOUT_NO_LIMITS")
            requireActivity().window.clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
        }
    }
}