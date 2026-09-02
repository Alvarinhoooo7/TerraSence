package com.sosmartlabs.momotabletpadres.sim.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.MenuItem
import android.view.View
import android.view.ViewGroup
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionEmptyFragmentBinding
import com.sosmartlabs.momotabletpadres.utils.CountryProvider
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

class SubscriptionEmptyFragment : Fragment() {

    private lateinit var binding: SubscriptionEmptyFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.button_soymomo_sim)

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

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView
        )
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
            toolbar.setNavigationOnClickListener { onBackPressed() }
        }
        Timber.d("SubscriptionEmptyFragment: Toolbar setup completed")
    }

    private fun setupListeners() {
        Timber.d("SubscriptionEmptyFragment: Setting up click listeners")
        
        binding.cardSubscribe.setOnClickListener {
            Timber.d("SubscriptionEmptyFragment: Subscribe card clicked")
            val isAvailableLocation = checkCountryAvailability()
            CrashlyticsLog.log("SubscriptionEmptyFragment: Country availability check result: $isAvailableLocation")
            
            if (!isAvailableLocation) {
                Timber.d("SubscriptionEmptyFragment: Country not available, navigating to unavailable screen")
                navigateById(R.id.action_subscriptionEmptyFragment_to_subscriptionUnavailableFragment)
            } else {
                Timber.d("SubscriptionEmptyFragment: Country available, navigating to wearer selection")
                navigateById(R.id.action_subscriptionEmptyFragment_to_newSubscriptionChooseWearerFragment)
            }
        }

        binding.requestSimCard.setOnClickListener {
            Timber.d("SubscriptionEmptyFragment: Request SIM card clicked")
            val isAvailableLocation = checkCountryAvailability()
            CrashlyticsLog.log("SubscriptionEmptyFragment: Country availability check for SIM request: $isAvailableLocation")
            
            if (!isAvailableLocation) {
                Timber.d("SubscriptionEmptyFragment: Country not available for SIM request")
                navigateById(R.id.action_subscriptionEmptyFragment_to_subscriptionUnavailableFragment)
            }
            // To-Do
        }

        requireActivity().onBackPressedDispatcher.addCallback(viewLifecycleOwner) {
            Timber.d("SubscriptionEmptyFragment: Back pressed, finishing activity")
            requireActivity().finish()
        }
    }

    private fun checkCountryAvailability(): Boolean {
        val country = CountryProvider.getCountry(requireContext())
        Timber.d("SubscriptionEmptyFragment: Checking country availability for: $country")
        return listOf("CL", "US", "DE").contains(country)
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("SubscriptionEmptyFragment: Navigating with id: $navId")
        findNavController().navigate(navId, bundle)
    }

    override fun onDestroyView() {
        Timber.d("SubscriptionEmptyFragment: onDestroyView")
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        Timber.d("SubscriptionEmptyFragment: Disposing resources")
    }
}