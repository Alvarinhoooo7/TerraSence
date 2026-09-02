package com.sosmartlabs.momo.heymomohistory.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentHeyMomoMenuBinding
import com.sosmartlabs.momo.utils.collapsingtoolbar.CollapsingToolbarUtils
import com.sosmartlabs.momo.utils.ui.setupFragmentEdgeToEdge
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class HeyMomoMenuFragment : Fragment() {

    private var _binding: FragmentHeyMomoMenuBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var deviceId: String
    private lateinit var wearerId: String

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHeyMomoMenuBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Get arguments
        Timber.d("HeyMomoMenuFragment: Arguments bundle: ${arguments}")
        Timber.d("HeyMomoMenuFragment: Arguments keySet: ${arguments?.keySet()}")
        
        deviceId = arguments?.getString("deviceId") ?: ""
        wearerId = arguments?.getString("wearerId") ?: ""

        Timber.d("HeyMomoMenuFragment: Arguments received - deviceId: $deviceId, wearerId: $wearerId")

        setupToolbar()
        setupFragmentEdgeToEdge(binding.appBarLayout)
        setupCardClicks()
    }

    private fun setupToolbar() {
        CollapsingToolbarUtils.setupToolbar(
            this,
            binding.toolbar,
            resources.getString(R.string.title_heymomo)
        )
    }

    private fun setupCardClicks() {
        binding.cardFacts.setOnClickListener {
            Timber.d("Navigating to Facts fragment")
            findNavController().navigate(R.id.action_heyMomoMenuFragment_to_heyMomoFactsFragment, arguments)
        }

        binding.cardHistory.setOnClickListener {
            Timber.d("Navigating to History fragment")
            findNavController().navigate(R.id.action_heyMomoMenuFragment_to_heyMomoHistoryFragment, arguments)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}