package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.bumptech.glide.Glide
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.databinding.AddWatchSimExtraStepFragmentBinding
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class SimExtraStepFragment: Fragment() {
    /**
     * Binding
     */
    private lateinit var binding: AddWatchSimExtraStepFragmentBinding

    /**
     * ViewModel
     */
    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = AddWatchSimExtraStepFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupListeners()
        observeViewModel()
    }

    private fun setupListeners() {
        binding.buttonNext.setOnClickListener {
            navigateById(R.id.action_simExtraStepFragment_to_kidProfileFragment)
        }
    }

    private fun observeViewModel() {
        addFirstMomoViewModel.selectedMobileNetworkOperator.observe(viewLifecycleOwner) {
            Timber.d("selectedMobileNetworkOperator $it")
            if (it != null) {
                binding.simExtraStepDescription.text = getString(R.string.add_watch_sim_extra_step_description, it.name)
                binding.simExtraStepRemoteText.text = it.extraActivationText
                Glide.with(binding.simExtraStepGif.context)
                    .load(it.extraActivationGif.url)
                    .fitCenter()
                    .into(binding.simExtraStepGif)
            }
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