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
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.SubscriptionEmptyFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.sim.util.SimCountries
import com.sosmartlabs.momo.utils.CountryProvider
import timber.log.Timber

class SubscriptionEmptyFragment : Fragment() {

    private lateinit var binding: SubscriptionEmptyFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.button_soymomo_sim)
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("SubscriptionEmptyFragment: onCreateView")
        binding = SubscriptionEmptyFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("SubscriptionEmptyFragment: onViewCreated - Starting initialization")
        CrashlyticsLog.log("SubscriptionEmptyFragment: Initializing empty state view")

        initializeUI()
        setupListeners()
    }

    private fun initializeUI() {
        Timber.d("SubscriptionEmptyFragment: Initializing UI components")
        setupToolbar()
    }

    private fun setupToolbar() {
        Timber.d("SubscriptionEmptyFragment: Setting up toolbar")
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
        Timber.d("SubscriptionEmptyFragment: Toolbar setup completed")
    }

    private fun setupListeners() {
        Timber.d("SubscriptionEmptyFragment: Setting up click listeners")

        val onSubscribe = View.OnClickListener {
            Timber.d("SubscriptionEmptyFragment: Subscribe action clicked")
            val isAvailableLocation = SimCountries.isSupported(CountryProvider.getCountry(requireContext()))
            CrashlyticsLog.log("SubscriptionEmptyFragment: Country availability check result: $isAvailableLocation")

            if (!isAvailableLocation) {
                Timber.d("SubscriptionEmptyFragment: Country not available, navigating to unavailable screen")
                navigateById(R.id.action_subscriptionEmptyFragment_to_subscriptionUnavailableFragment)
            } else {
                Timber.d("SubscriptionEmptyFragment: Country available, navigating to wearer selection")
                newSubscriptionViewModel.startSimSubscriptionAnalytics(SimAnalytics.EntryPoint.SIM_CENTER)
                navigateById(R.id.action_subscriptionEmptyFragment_to_newSubscriptionChooseWearerFragment)
            }
        }
        binding.cardSubscribe.setOnClickListener(onSubscribe)
        binding.buttonSubscribe.setOnClickListener(onSubscribe)

        requireActivity().onBackPressedDispatcher.addCallback(viewLifecycleOwner) {
            Timber.d("SubscriptionEmptyFragment: Back pressed, finishing activity")
            requireActivity().finish()
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("SubscriptionEmptyFragment: Navigating with id: $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    override fun onDestroyView() {
        Timber.d("SubscriptionEmptyFragment: onDestroyView")
        super.onDestroyView()
    }
}
