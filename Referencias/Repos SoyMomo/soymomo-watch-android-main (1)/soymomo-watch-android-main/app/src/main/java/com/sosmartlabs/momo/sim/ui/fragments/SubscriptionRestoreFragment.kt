package com.sosmartlabs.momo.sim.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.SubscriptionRestoreFragmentBinding
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.sim.ui.SimViewModel
import timber.log.Timber

class SubscriptionRestoreFragment : Fragment() {

    private lateinit var binding: SubscriptionRestoreFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar
    private val toolbarTitle: String get() = getString(R.string.subscription_restore_title)

    private val simViewModel: SimViewModel by activityViewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("SubscriptionRestoreFragment: onCreate")
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("SubscriptionRestoreFragment: onCreateView")
        binding = SubscriptionRestoreFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("SubscriptionRestoreFragment: onViewCreated")
        setupToolbar()
        setupListeners()
        observeViewModel()
    }

    private fun setupToolbar() {
        Timber.d("SubscriptionRestoreFragment: Setting up toolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
        }
        Timber.d("SubscriptionRestoreFragment: Toolbar setup complete")
    }

    private fun setupListeners() {
        Timber.d("SubscriptionRestoreFragment: Setting up listeners")
        binding.subscriptionRestoreButtonRestore.setOnClickListener {
            Timber.d("SubscriptionRestoreFragment: Restore button clicked")
            simViewModel.currentSubscription.value?.let { subscription ->
                Timber.d("SubscriptionRestoreFragment: Navigating with prefilled ICCID")
                val bundle = bundleOf("prefilledIccId" to subscription.iccId)
                simViewModel.trackRestoreStarted(hasPrefilledIccid = subscription.iccId.isNotBlank(), subscription = subscription)
                newSubscriptionViewModel.startSimSubscriptionAnalytics(
                    entryPoint = SimAnalytics.EntryPoint.RESTORE,
                    hasPrefilledIccid = subscription.iccId.isNotBlank(),
                )
                newSubscriptionViewModel.setCurrentWearer(subscription.watch)
                navigateById(R.id.action_subscriptionRestoreFragment_to_nav_add_sim, bundle)
            } ?: run {
                Timber.w("SubscriptionRestoreFragment: No subscription available, navigating without iccId")
                simViewModel.trackRestoreStarted(hasPrefilledIccid = false)
                newSubscriptionViewModel.startSimSubscriptionAnalytics(
                    entryPoint = SimAnalytics.EntryPoint.RESTORE,
                    hasPrefilledIccid = false,
                )
                navigateById(R.id.action_subscriptionRestoreFragment_to_nav_add_sim)
            }
        }
    }

    private fun observeViewModel() {
        Timber.d("SubscriptionRestoreFragment: Setting up viewModel observers")
        simViewModel.currentSubscription.observe(viewLifecycleOwner) { subscription ->
            Timber.d("SubscriptionRestoreFragment: Updating subscription restore views")
            val watch = subscription.watch
            val deviceModel = watch.modelName()
            val iccId = subscription.iccId
            binding.subscriptionRestorePoint1Content.text = getString(R.string.subscription_restore_point_1, deviceModel, iccId)
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("SubscriptionRestoreFragment: Navigating to $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        Timber.d("SubscriptionRestoreFragment: onDestroyView")
        dispose()
    }

    private fun dispose() {
        Timber.d("SubscriptionRestoreFragment: Disposing resources")
    }

}
