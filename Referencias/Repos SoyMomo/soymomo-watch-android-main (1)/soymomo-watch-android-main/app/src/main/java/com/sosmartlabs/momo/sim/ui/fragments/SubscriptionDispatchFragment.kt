package com.sosmartlabs.momo.sim.ui.fragments

import android.os.Build
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
import com.sosmartlabs.momo.databinding.SubscriptionDispatchFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.sim.ui.SimViewModel
import timber.log.Timber

class SubscriptionDispatchFragment : Fragment() {

    // View binding
    private lateinit var binding: SubscriptionDispatchFragmentBinding
    
    // Toolbar properties
    val toolbar: Toolbar get() = binding.toolbar
    private val toolbarTitle: String get() = getString(R.string.add_watch_button_soymomo_sim)

    // ViewModels
    private val simViewModel: SimViewModel by activityViewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    // Lifecycle methods
    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("SubscriptionDispatchFragment: onCreateView")
        binding = SubscriptionDispatchFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("SubscriptionDispatchFragment: onViewCreated - Starting initialization")
        
        initializeUI()
        initializeObservers()
        fetchData()
    }

    override fun onDestroyView() {
        Timber.d("SubscriptionDispatchFragment: onDestroyView")
        super.onDestroyView()
        dispose()
    }

    // UI initialization
    private fun initializeUI() {
        Timber.d("SubscriptionDispatchFragment: initializeUI")
        setupToolbar()
    }

    private fun setupToolbar() {
        Timber.d("SubscriptionDispatchFragment: Setting up toolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            // Deprecated and ignored on API 35+ (enforced edge-to-edge); still the
            // only thing painting the bars on API 24-34, so keep them SDK-guarded.
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                @Suppress("DEPRECATION")
                window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
                @Suppress("DEPRECATION")
                window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
            }
            toolbar.setNavigationOnClickListener { onBackPressedDispatcher.onBackPressed() }
        }
        Timber.d("SubscriptionDispatchFragment: Toolbar setup completed")
    }

    // Data handling
    private fun fetchData() {
        Timber.d("SubscriptionDispatchFragment: Fetching current user data")
        simViewModel.getCurrentUser()
        newSubscriptionViewModel.getCurrentUser()
    }

    private fun initializeObservers() {
        Timber.d("SubscriptionDispatchFragment: Setting up view model observers")
        
        simViewModel.currentUser.observe(viewLifecycleOwner) { user ->
            Timber.d("SubscriptionDispatchFragment: Current user received")
            CrashlyticsLog.log("Fetching wearers for current user")
            simViewModel.getWearers(user)
        }

        simViewModel.wearerFullList.observe(viewLifecycleOwner) { wearers ->
            Timber.d("SubscriptionDispatchFragment: Wearers list received, size: ${wearers.size}")
            CrashlyticsLog.log("Fetching subscriptions for ${wearers.size} wearers")
            simViewModel.getSubscriptions(wearers)
        }

        simViewModel.subscriptionList.observe(viewLifecycleOwner) { subscriptions ->
            Timber.d("SubscriptionDispatchFragment: Subscription list received, size: ${subscriptions.size}")
            if (subscriptions.isEmpty()) {
                Timber.d("SubscriptionDispatchFragment: No subscriptions found, navigating to empty state")
                navigateById(R.id.action_subscriptionDispatchFragment_to_subscriptionEmptyFragment)
            } else if (tryNavigateToDeepLinkedSubscription(subscriptions)) {
                // Already navigated to detail via deep-link.
            } else {
                Timber.d("SubscriptionDispatchFragment: Subscriptions found, navigating to list")
                navigateById(R.id.action_subscriptionDispatchFragment_to_subscriptionListFragment)
            }
        }
    }

    /**
     * If an upgrade-popup deep-link is pending on the SimViewModel, find the matching
     * subscription, set it as current, and jump straight to the detail screen
     * (skipping the list).
     */
    private fun tryNavigateToDeepLinkedSubscription(
        subscriptions: List<com.sosmartlabs.momo.sim.model.Subscription>
    ): Boolean {
        val pendingId = simViewModel.consumePendingDeepLinkSubscriptionId() ?: return false
        val match = subscriptions.firstOrNull { it.objectId == pendingId }
        if (match == null) {
            Timber.w("SubscriptionDispatchFragment: deep-link id %s not found in list (size=%d) - falling back to list", pendingId, subscriptions.size)
            return false
        }
        simViewModel.setCurrentSubscription(match)
        navigateById(R.id.action_subscriptionDispatchFragment_to_subscriptionDetailFragment)
        return true
    }

    // Navigation
    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("SubscriptionDispatchFragment: Navigating with id: $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    // Cleanup
    private fun dispose() {
        Timber.d("SubscriptionDispatchFragment: Disposing resources")
    }
}
