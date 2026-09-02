package com.sosmartlabs.momo.linkwatch.ui.fragments

import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import timber.log.Timber
import com.bumptech.glide.Glide
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.databinding.FragmentSimExtraStepsBinding
import com.sosmartlabs.momo.linkwatch.ui.LinkWatchViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class SimExtraStepsFragment : Fragment() {

    lateinit var binding: FragmentSimExtraStepsBinding

    private val linkWatchViewModel: LinkWatchViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentSimExtraStepsBinding.inflate(inflater)

        setOperatorData()
        setButtons()
        return binding.root
    }

    private fun setOperatorData()
    {
        val operator = if (Build.VERSION.SDK_INT >= 33) {
            arguments?.getParcelable("mobileNetworkOperator", MobileNetworkOperator::class.java)
        } else {
            arguments?.getParcelable("mobileNetworkOperator")
        }

        operator?.let {
            binding.simExtraStepDescription.text = getString(
                R.string.add_watch_sim_extra_step_description, operator.name)
            binding.simExtraStepRemoteText.text = operator.extraActivationText

            Glide.with(binding.simExtraStepGif.context)
                .load(operator.extraActivationGif.url)
                .fitCenter()
                .into(binding.simExtraStepGif)
        }
    }

    private fun setButtons() {
        binding.buttonNext.setOnClickListener {
            navigateById(R.id.action_simExtraStepsFragment_to_mainViewFragment)
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