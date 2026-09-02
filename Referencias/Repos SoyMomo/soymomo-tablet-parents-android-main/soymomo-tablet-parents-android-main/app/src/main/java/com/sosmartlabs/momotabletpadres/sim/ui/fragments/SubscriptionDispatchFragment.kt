package com.sosmartlabs.momotabletpadres.sim.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionDispatchFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.sim.ui.SimViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

class SubscriptionDispatchFragment : Fragment() {

    // View binding
    private lateinit var binding: SubscriptionDispatchFragmentBinding
    
    // Toolbar properties
    val toolbar: Toolbar get() = binding.toolbar
    private val toolbarTitle: String get() = getString(R.string.add_device_button_soymomo_sim)

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

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView
        )
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
            toolbar.setNavigationOnClickListener { onBackPressed() }
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
            Timber.d("SubscriptionDispatchFragment: Current user received: ${user?.objectId}")
            CrashlyticsLog.log("Fetching wearers for user: ${user?.objectId}")
            simViewModel.getTablets(user)
        }

        simViewModel.tabletFullList.observe(viewLifecycleOwner) { tablets ->
            Timber.d("SubscriptionDispatchFragment: Tablets list received, size: ${tablets.size}")
            CrashlyticsLog.log("Fetching subscriptions for ${tablets.size} tablets")
            simViewModel.getSubscriptions(tablets)
        }

        simViewModel.subscriptionList.observe(viewLifecycleOwner) { subscriptions ->
            Timber.d("SubscriptionDispatchFragment: Subscription list received, size: ${subscriptions.size}")
            if (subscriptions.isEmpty()) {
                Timber.d("SubscriptionDispatchFragment: No subscriptions found, navigating to empty state")
                navigateById(R.id.action_subscriptionDispatchFragment_to_subscriptionEmptyFragment)
            } else {
                Timber.d("SubscriptionDispatchFragment: Subscriptions found, navigating to list")
                navigateById(R.id.action_subscriptionDispatchFragment_to_subscriptionListFragment)
            }
        }
    }

    // Navigation
    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("SubscriptionDispatchFragment: Navigating with id: $navId")
        findNavController().navigate(navId, bundle)
    }

    // Cleanup
    private fun dispose() {
        Timber.d("SubscriptionDispatchFragment: Disposing resources")
    }
}