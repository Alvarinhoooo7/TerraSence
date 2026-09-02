package com.sosmartlabs.momotabletpadres.sim.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionListFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.model.Subscription
import com.sosmartlabs.momotabletpadres.sim.ui.SimViewModel
import com.sosmartlabs.momotabletpadres.sim.ui.adapter.SubscriptionListAdapter
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

class SubscriptionListFragment: Fragment() {

    private lateinit var binding: SubscriptionListFragmentBinding
    private lateinit var subscriptionListAdapter: SubscriptionListAdapter
    private val simViewModel: SimViewModel by activityViewModels()

    val toolbar: Toolbar get() = binding.toolbar
    private val toolbarTitle: String get() = getString(R.string.add_device_button_soymomo_sim)

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

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.buttonAddSubscription,
            bottomAsMargin = true
        )
    }

    override fun onStart() {
        super.onStart()
        Timber.d("SubscriptionListFragment: onStart - Starting subscription list polling")
        CrashlyticsLog.log("SubscriptionListFragment: Starting subscription list polling")
        simViewModel.startPollingSubscriptions()
    }

    private fun initializeUI() {
        Timber.d("SubscriptionListFragment: Initializing UI components")
        setupToolbar()
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
            toolbar.setNavigationOnClickListener { onBackPressed() }
        }
        Timber.d("SubscriptionListFragment: Toolbar setup completed")
    }

    private fun setupRecyclerView() {
        Timber.d("SubscriptionListFragment: Setting up RecyclerView")
        subscriptionListAdapter = SubscriptionListAdapter()
        subscriptionListAdapter.listener = object : SubscriptionListAdapter.Listener {
            override fun onSubscriptionClicked(subscription: Subscription) {
                Timber.d("SubscriptionListFragment: Subscription clicked: ${subscription.objectId}")
                CrashlyticsLog.log("SubscriptionListFragment: User selected subscription: ${subscription.objectId}")
                simViewModel.setCurrentSubscription(subscription)
                navigateById(R.id.action_subscriptionListFragment_to_subscriptionDetailFragment)
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
            navigateById(R.id.action_subscriptionListFragment_to_newSubscriptionChooseWearerFragment)
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
            CrashlyticsLog.log("SubscriptionListFragment: Updating subscription list with ${subscriptions.size} items")
            subscriptionListAdapter.submitList(subscriptions)
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("SubscriptionListFragment: Navigating with id: $navId")
        findNavController().navigate(navId, bundle)
    }

    override fun onDestroyView() {
        Timber.d("SubscriptionListFragment: onDestroyView")
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        Timber.d("SubscriptionListFragment: Disposing resources")
    }
}