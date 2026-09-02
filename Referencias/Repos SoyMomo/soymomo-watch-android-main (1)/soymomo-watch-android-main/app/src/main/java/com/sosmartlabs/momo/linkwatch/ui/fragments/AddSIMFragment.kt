package com.sosmartlabs.momo.linkwatch.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import timber.log.Timber
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentAddSIMBinding
import com.sosmartlabs.momo.linkwatch.ui.LinkWatchViewModel
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.utils.collapsingtoolbar.CollapsingToolbarUtils
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class AddSIMFragment : Fragment() {

    lateinit var binding: FragmentAddSIMBinding

    private val linkWatchViewModel: LinkWatchViewModel by activityViewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        binding = FragmentAddSIMBinding.inflate(inflater)
        val title = getString(R.string.add_sim_card_view_title)
        CollapsingToolbarUtils.setupToolbar(this, binding.toolbar, title)
        setupButtons()
        return binding.root
    }

    private fun setupButtons() {

        binding.buttonMomoSim.setOnClickListener {
            linkWatchViewModel.currentWearer.value?.let {
                newSubscriptionViewModel.startSimSubscriptionAnalytics(SimAnalytics.EntryPoint.LINK_WATCH)
                newSubscriptionViewModel.setCurrentWearer(it)
                navigateById(R.id.action_addSIMFragment_to_nav_add_sim)
            }
        }

        binding.buttonOtherCompany.setOnClickListener {
            navigateById(R.id.action_addSIMFragment_to_configureSIMFragment)
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

}
