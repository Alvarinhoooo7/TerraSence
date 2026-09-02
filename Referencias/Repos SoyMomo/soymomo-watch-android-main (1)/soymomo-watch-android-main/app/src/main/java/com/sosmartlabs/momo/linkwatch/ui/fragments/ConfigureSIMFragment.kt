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
import com.sosmartlabs.momo.addfirstwatch.repository.MobileNetworkOperatorRepository
import com.sosmartlabs.momo.databinding.FragmentConfigureSIMBinding
import com.sosmartlabs.momo.linkwatch.ui.LinkWatchViewModel
import com.sosmartlabs.momo.models.H2OChile
import com.sosmartlabs.momo.models.H2OChileAmPm
import com.sosmartlabs.momo.models.H2OEurope
import com.sosmartlabs.momo.models.H2OSpain
import com.sosmartlabs.momo.models.Lite1
import com.sosmartlabs.momo.models.Space1
import com.sosmartlabs.momo.models.Space2
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.utils.collapsingtoolbar.CollapsingToolbarUtils
import com.sosmartlabs.momo.utils.ui.activityindicator.ActivityIndicatorDialogFragment
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ConfigureSIMFragment : Fragment() {

    @Inject lateinit var mobileNetworkOperatorRepository: MobileNetworkOperatorRepository
    lateinit var binding: FragmentConfigureSIMBinding

    private val linkWatchViewModel: LinkWatchViewModel by activityViewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentConfigureSIMBinding.inflate(inflater)
        val title = getString(R.string.configure_sim_title)
        CollapsingToolbarUtils.setupToolbar(this, binding.toolbar, title)
        setupButtons()
        setAnimations()
        return binding.root
    }

    private fun setupButtons() {
        binding.buttonNext.setOnClickListener {
            if (arguments?.getBoolean("fromMomoSIM") == true) {
                momoSimNavigation()
            } else {
                navigateById(R.id.action_configureSIMFragment_to_otherCompaniesFragment)
            }
        }
    }

    private fun momoSimNavigation() {
        ActivityIndicatorDialogFragment.show(parentFragmentManager)
        CoroutineScope(Dispatchers.IO).launch {
            val wearer = newSubscriptionViewModel.currentWearer.value
            val momoOperator = mobileNetworkOperatorRepository.getMomoMobileOperator()
            wearer?.mobileNetworkOperator = momoOperator
            linkWatchViewModel.setWearer(wearer)
            requireActivity().runOnUiThread {
                linkWatchViewModel.incrementCompletedSteps("sim")
                ActivityIndicatorDialogFragment.hide()
                navigateById(R.id.action_configureSIMFragment_to_mainViewFragment)
            }
        }
    }

    private fun setAnimations() {
        val watch = linkWatchViewModel.currentWearer.value ?: return

        val box = when (watch.model) {
            H2OChile, H2OEurope, H2OSpain, H2OChileAmPm -> R.raw.box_h2o_2
            Space1 -> R.raw.box_space1_2
            Space2 -> R.raw.box_space2_2
            Lite1 -> R.raw.box_lite_2
            else -> R.raw.box_space2_2
        }

        val sim = when (watch.model) {
            H2OChile, H2OEurope, H2OSpain, H2OChileAmPm -> R.raw.sim_type_h2o_4
            Space1 -> R.raw.sim_type_space1_4
            Space2 -> R.raw.sim_type_space2_4
            Lite1 -> R.raw.sim_type_lite_4
            else -> R.raw.sim_type_space2_4
        }

        val insert = when (watch.model) {
            H2OChile, H2OEurope, H2OSpain, H2OChileAmPm -> R.raw.insert_h2o_5
            Space1 -> R.raw.insert_space1_5
            Space2 -> R.raw.insert_space2_5
            Lite1 -> R.raw.insert_lite_5
            else -> R.raw.insert_space2_5
        }

        binding.animationBox.setAnimation(box)
        binding.animationSim.setAnimation(sim)
        binding.animationInstall.setAnimation(insert)

        binding.animationBox.playAnimation()
        binding.animationSim.playAnimation()
        binding.animationInstall.playAnimation()
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