package com.sosmartlabs.momo.sim.ui.fragments

import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import android.widget.Toast
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.SubscriptionListFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.sim.model.PaymentStatus
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionStatus
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.sim.ui.SimViewModel
import com.sosmartlabs.momo.sim.ui.adapter.SubscriptionListAdapter
import com.sosmartlabs.momo.sim.util.SimCountries
import com.sosmartlabs.momo.sim.util.SubscriptionPortalLauncher
import com.sosmartlabs.momo.utils.CountryProvider
import com.sosmartlabs.momo.utils.Resource
import timber.log.Timber

class SubscriptionListFragment: Fragment() {

    private lateinit var binding: SubscriptionListFragmentBinding
    private lateinit var subscriptionListAdapter: SubscriptionListAdapter
    private val simViewModel: SimViewModel by activityViewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()
    private var lastPortalSubscription: Subscription? = null
    private var lastPendingPaymentSubscription: Subscription? = null

    // Status filter for the plan list, driven by the chips above the recycler.
    private enum class SubscriptionFilter { ALL, ACTIVE, PENDING_PAYMENT, TERMINATED }
    private var activeFilter = SubscriptionFilter.ACTIVE
    private var allSubscriptions: List<Subscription> = emptyList()
    private var hasReceivedData = false

    val toolbar: Toolbar get() = binding.toolbar
    private val toolbarTitle: String get() = getString(R.string.add_watch_button_soymomo_sim)

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("SubscriptionListFragment: onCreateView")
        binding = SubscriptionListFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("SubscriptionListFragment: onViewCreated - Starting initialization")
        CrashlyticsLog.log("SubscriptionListFragment: Initializing subscription list view")

        initializeUI()
        setupListeners()
        observeViewModel()
    }

    override fun onStart() {
        super.onStart()
        Timber.d("SubscriptionListFragment: onStart - Starting subscription list polling")
        simViewModel.startPollingSubscriptions()
    }

    private fun initializeUI() {
        Timber.d("SubscriptionListFragment: Initializing UI components")
        setupToolbar()
        setupFilterChips()
        setupRecyclerView()
    }

    private fun setupToolbar() {
        Timber.d("SubscriptionListFragment: Setting up toolbar")
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
        Timber.d("SubscriptionListFragment: Toolbar setup completed")
    }

    private fun setupFilterChips() {
        binding.filterChipGroup.setOnCheckedStateChangeListener { _, checkedIds ->
            val filter = when (checkedIds.firstOrNull()) {
                R.id.chip_filter_active -> SubscriptionFilter.ACTIVE
                R.id.chip_filter_pending -> SubscriptionFilter.PENDING_PAYMENT
                R.id.chip_filter_terminated -> SubscriptionFilter.TERMINATED
                else -> SubscriptionFilter.ALL
            }
            if (filter != activeFilter) {
                Timber.d("SubscriptionListFragment: Filter changed to $filter")
                activeFilter = filter
                renderSubscriptions()
            }
        }
    }

    private fun setupRecyclerView() {
        Timber.d("SubscriptionListFragment: Setting up RecyclerView")
        subscriptionListAdapter = SubscriptionListAdapter()
        subscriptionListAdapter.listener = object : SubscriptionListAdapter.Listener {
            override fun onSubscriptionClicked(subscription: Subscription) {
                Timber.d("SubscriptionListFragment: Subscription clicked")
                CrashlyticsLog.log("SubscriptionListFragment: User selected subscription")
                simViewModel.trackSubscriptionSelected(subscription)
                simViewModel.setCurrentSubscription(subscription)
                navigateById(R.id.action_subscriptionListFragment_to_subscriptionDetailFragment)
            }

            override fun onRestoreSubscriptionAlertClicked(subscription: Subscription) {
                Timber.d("SubscriptionListFragment: Restore clicked for subscription")
                CrashlyticsLog.log("SubscriptionListFragment: User clicked restore alert")
                simViewModel.trackManageActionSelected("restore", subscription)
                simViewModel.setCurrentSubscription(subscription)
                navigateById(R.id.action_subscriptionListFragment_to_subscriptionRestoreFragment)
            }

            override fun onPendingPaymentAlertClicked(subscription: Subscription) {
                Timber.d("SubscriptionListFragment: Pending payment alert clicked for subscription")
                CrashlyticsLog.log("SubscriptionListFragment: User clicked pending payment alert")
                simViewModel.setCurrentSubscription(subscription)
                if (subscription.getPaymentStatus() == PaymentStatus.PENDING) {
                    lastPendingPaymentSubscription = subscription
                    simViewModel.trackManageActionSelected("pending_payment", subscription)
                    simViewModel.getPendingPaymentUrl(subscription)
                } else {
                    lastPortalSubscription = subscription
                    simViewModel.trackManageActionSelected("portal", subscription)
                    simViewModel.getSubscriptionManagementPortalSession(subscription)
                }
            }
        }
        with(binding.subscriptionListRecyclerView) {
            adapter = subscriptionListAdapter
            layoutManager = LinearLayoutManager(requireContext())
        }
        Timber.d("SubscriptionListFragment: RecyclerView setup completed")
    }

    private fun setupListeners() {
        Timber.d("SubscriptionListFragment: Setting up click listeners")
        binding.buttonAddSubscription.setOnClickListener {
            Timber.d("SubscriptionListFragment: Add subscription button clicked")
            CrashlyticsLog.log("SubscriptionListFragment: User initiated new subscription flow")
            // Same country gate as the empty screen, so heuristically-unsupported
            // users get the friendly Unavailable screen instead of a raw
            // SIM_NOT_FOUND error deep inside the flow.
            if (!SimCountries.isSupported(CountryProvider.getCountry(requireContext()))) {
                navigateById(R.id.action_subscriptionListFragment_to_subscriptionUnavailableFragment)
            } else {
                newSubscriptionViewModel.startSimSubscriptionAnalytics(SimAnalytics.EntryPoint.SIM_CENTER)
                navigateById(R.id.action_subscriptionListFragment_to_newSubscriptionChooseWearerFragment)
            }
        }

        requireActivity().onBackPressedDispatcher.addCallback(viewLifecycleOwner) {
            Timber.d("SubscriptionListFragment: Back pressed, finishing activity")
            requireActivity().finish()
        }
    }

    private fun observeViewModel() {
        Timber.d("SubscriptionListFragment: Setting up view model observers")
        simViewModel.subscriptionList.observe(viewLifecycleOwner) { subscriptions ->
            Timber.d("SubscriptionListFragment: Received subscription list update, size: ${subscriptions.size}")
            val firstDelivery = !hasReceivedData
            hasReceivedData = true
            allSubscriptions = subscriptions.toList()
            if (firstDelivery) applySmartDefaultFilter()
            renderSubscriptions()
        }

        simViewModel.subscriptionManagementPortalSession.observe(viewLifecycleOwner) { resource ->
            Timber.d("SubscriptionListFragment: Subscription management portal session update: ${resource.status}")
            when (resource.status) {
                Resource.Status.LOADING -> {
                    Timber.d("SubscriptionListFragment: Portal session loading...")
                }
                Resource.Status.LOAD_SUCCESS -> {
                    resource.data?.let { url ->
                        Timber.d("SubscriptionListFragment: Portal session URL received, launching browser")
                        val launched = SubscriptionPortalLauncher.launchPortalUrl(requireContext(), url)
                        if (!launched) {
                            simViewModel.trackPortalLaunchFailed(lastPortalSubscription)
                            Toast.makeText(requireContext(), R.string.toast_error_opening_url, Toast.LENGTH_SHORT).show()
                        }
                    }
                    simViewModel.setSubscriptionManagementPortalSessionDefault()
                }
                Resource.Status.LOAD_ERROR -> {
                    resource.data?.let { errorMessage ->
                        Toast.makeText(requireContext(), errorMessage, Toast.LENGTH_SHORT).show()
                        Timber.e("SubscriptionListFragment: Portal session error - $errorMessage")
                        CrashlyticsLog.log("SubscriptionListFragment: Subscription portal session error: $errorMessage")
                    }
                    simViewModel.setSubscriptionManagementPortalSessionDefault()
                }
                else -> {
                    // DEFAULT is already the reset state — calling setDefault() here
                    // re-posts DEFAULT, which re-fires this observer in a loop.
                }
            }
        }

        simViewModel.pendingPaymentUrl.observe(viewLifecycleOwner) { resource ->
            Timber.d("SubscriptionListFragment: Pending payment URL update: ${resource.status}")
            when (resource.status) {
                Resource.Status.LOADING -> {
                    Timber.d("SubscriptionListFragment: Pending payment URL loading...")
                }
                Resource.Status.LOAD_SUCCESS -> {
                    resource.data?.let { url ->
                        Timber.d("SubscriptionListFragment: Pending payment URL received, launching browser")
                        val launched = SubscriptionPortalLauncher.launchPortalUrl(requireContext(), url)
                        if (!launched) {
                            simViewModel.trackPendingPaymentLaunchFailed(lastPendingPaymentSubscription)
                            Toast.makeText(requireContext(), R.string.toast_error_opening_url, Toast.LENGTH_SHORT).show()
                        }
                    }
                    simViewModel.setPendingPaymentUrlDefault()
                }
                Resource.Status.LOAD_ERROR -> {
                    resource.data?.let { errorMessage ->
                        Toast.makeText(requireContext(), errorMessage, Toast.LENGTH_SHORT).show()
                        Timber.e("SubscriptionListFragment: Pending payment URL error - $errorMessage")
                        CrashlyticsLog.log("SubscriptionListFragment: Pending payment URL error: $errorMessage")
                    }
                    simViewModel.setPendingPaymentUrlDefault()
                }
                else -> {
                    // DEFAULT is already the reset state — no setDefault() here (loop).
                }
            }
        }
    }

    /** Active lifecycle AND no failed payment — the Active chip's predicate. */
    private fun Subscription.isInGoodStanding(): Boolean {
        val status = getSubscriptionStatus()
        return (status == SubscriptionStatus.ACTIVE || status == SubscriptionStatus.PREACTIVATED) &&
            getPaymentStatus() != PaymentStatus.PENDING
    }

    /**
     * Smart default, applied only on the FIRST data delivery: the list opens on
     * the Active chip, but when the user has no plan in good standing that would
     * be an empty screen — fall back to All so their plans are visible. Never
     * runs again, so later poll updates can't fight the user's chip choices.
     * check() fires the chip listener, which updates activeFilter and re-renders.
     */
    private fun applySmartDefaultFilter() {
        if (activeFilter != SubscriptionFilter.ACTIVE) return
        if (allSubscriptions.none { it.isInGoodStanding() }) {
            Timber.d("SubscriptionListFragment: No plans in good standing - defaulting filter to All")
            binding.filterChipGroup.check(R.id.chip_filter_all)
        }
    }

    /**
     * Applies the active chip filter and toggles the loading / empty / list states.
     * The empty message distinguishes "nothing matches this filter" from "no plans
     * at all" (reachable when the last plan disappears server-side mid-session).
     *
     * The buckets are mutually exclusive (single-select chips imply categories):
     * Terminated (incl. paused) takes precedence, then Pending payment (which
     * also captures SUSPENDED — service cut over an unpaid bill, recoverable by
     * paying), and Active means "active AND in good standing". A lifecycle-active
     * plan with a failed payment shows under Pending payment, not Active.
     */
    private fun renderSubscriptions() {
        val filtered = when (activeFilter) {
            SubscriptionFilter.ALL -> allSubscriptions
            SubscriptionFilter.ACTIVE -> allSubscriptions.filter { it.isInGoodStanding() }
            SubscriptionFilter.PENDING_PAYMENT -> allSubscriptions.filter {
                val status = it.getSubscriptionStatus()
                // SUSPENDED matches by STATUS, not just derived payment credentials:
                // the card shows its unconditional "service suspended" alert, so the
                // chip must capture it even when credentials are inconsistent.
                (it.getPaymentStatus() == PaymentStatus.PENDING || status == SubscriptionStatus.SUSPENDED) &&
                    status != SubscriptionStatus.PAUSED && status != SubscriptionStatus.TERMINATED
            }
            SubscriptionFilter.TERMINATED -> allSubscriptions.filter {
                val status = it.getSubscriptionStatus()
                status == SubscriptionStatus.PAUSED || status == SubscriptionStatus.TERMINATED
            }
        }
        subscriptionListAdapter.submitList(filtered)

        binding.loadingIndicator.isVisible = !hasReceivedData
        binding.filterChipGroup.isVisible = hasReceivedData && allSubscriptions.isNotEmpty()
        val showEmpty = hasReceivedData && filtered.isEmpty()
        binding.emptyStateContainer.isVisible = showEmpty
        if (showEmpty) {
            binding.emptyStateText.setText(
                if (allSubscriptions.isEmpty()) R.string.subscription_list_empty
                else R.string.subscription_list_empty_filtered
            )
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("SubscriptionListFragment: Navigating with id: $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    override fun onDestroyView() {
        Timber.d("SubscriptionListFragment: onDestroyView")
        super.onDestroyView()
    }
}
