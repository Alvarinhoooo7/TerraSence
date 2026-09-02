package com.sosmartlabs.momo.sim.ui.fragments.payment

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import timber.log.Timber
import com.airbnb.lottie.LottieDrawable
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.AddFirstMomoActivity
import com.sosmartlabs.momo.databinding.SubscriptionPaymentSkipFragmentBinding
import com.sosmartlabs.momo.linkwatch.LinkWatchActivity
import com.sosmartlabs.momo.sim.SimActivity
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel

class PaymentSkipFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionPaymentSkipFragmentBinding

    /**
     * ViewModel
     */
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()
    private var hasActivated = false

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
            if (activity is SimActivity) {
                navigateById(R.id.action_add_sim_subscriptionPaymentSkipFragment_to_newSubscriptionPaymentSuccess)
            } else if (activity is AddFirstMomoActivity) {
                navigateById(R.id.action_add_momo_subscriptionPaymentSkipFragment_to_newSubscriptionPaymentSuccess)
            } else if (activity is LinkWatchActivity) {
                navigateById(R.id.action_add_sim_subscriptionPaymentSkipFragment_to_newSubscriptionPaymentSuccess)
            }
        }
    }

    private fun observeViewModel() {
        newSubscriptionViewModel.currentSubscriptionUserInfo.observe(viewLifecycleOwner) {
            if (it != null && !hasActivated) {
                hasActivated = true
                newSubscriptionViewModel.trackSimPaymentResult(
                    result = SimAnalytics.Result.SKIPPED,
                    paymentPath = SimAnalytics.PaymentPath.SKIP,
                )
                newSubscriptionViewModel.activateSimCard()
            }
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {

    }
}
