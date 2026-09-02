package com.sosmartlabs.momotabletpadres.sim.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.addCallback
import androidx.fragment.app.Fragment
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionUnavailableFragmentBinding
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils

class SubscriptionUnavailableFragment : Fragment(R.layout.subscription_unavailable_fragment) {

    private lateinit var binding : SubscriptionUnavailableFragmentBinding

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = SubscriptionUnavailableFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupListeners()

        // Push the SIM/Momo logos clear of the status bar (logo_momo is constrained
        // to logo_sim, so insetting logo_sim moves both) and keep the back button
        // above the navigation bar. The host SimActivity already runs edge-to-edge,
        // so no FLAG_LAYOUT_NO_LIMITS is needed (it would draw under the nav bar).
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.logoSim,
            bottomView = binding.backButton,
            bottomAsMargin = true,
        )
    }

    fun setupListeners() {
        requireActivity().onBackPressedDispatcher.addCallback(viewLifecycleOwner) {
            requireActivity().finish()
        }

        binding.backButton.setOnClickListener {
            requireActivity().finish()
        }
    }

}