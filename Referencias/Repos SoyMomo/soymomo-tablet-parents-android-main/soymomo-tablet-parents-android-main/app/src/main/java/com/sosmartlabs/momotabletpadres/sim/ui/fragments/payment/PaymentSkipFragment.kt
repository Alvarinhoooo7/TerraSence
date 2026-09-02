package com.sosmartlabs.momotabletpadres.sim.ui.fragments.payment

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.airbnb.lottie.LottieDrawable
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionPaymentSkipFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.SimActivity
import com.sosmartlabs.momotabletpadres.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils

class PaymentSkipFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionPaymentSkipFragmentBinding

    /**
     * ViewModel
     */
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = SubscriptionPaymentSkipFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupListeners()
        setAnimation()
        observeViewModel()

        // Reserve the status bar for the top animation (topAsMargin ADDS the status-bar
        // inset to the animation's existing top margin, restoring its intended spacing
        // below the bar) and keep the action button clear of the navigation bar.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.paymentSkippedAnimation,
            topAsMargin = true,
            bottomView = binding.buttonNext,
            bottomAsMargin = true,
        )
    }

    private fun setAnimation() {
        with(binding.paymentSkippedAnimation) {
            setAnimation(R.raw.configure_sim)
            repeatCount = LottieDrawable.INFINITE
            playAnimation()
        }
    }

    private fun setupListeners() {
        binding.buttonNext.setOnClickListener {
            when (activity) {
                is SimActivity -> {
                    navigateById(R.id.action_add_sim_subscriptionPaymentSkipFragment_to_newSubscriptionPaymentSuccess)
                }
            }
        }
    }

    private fun observeViewModel() {
        newSubscriptionViewModel.currentSubscriptionUserInfo.observe(viewLifecycleOwner) {
            if (it != null) {
                newSubscriptionViewModel.activateSimCard()
            }
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        findNavController().navigate(navId, bundle)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {

    }
}