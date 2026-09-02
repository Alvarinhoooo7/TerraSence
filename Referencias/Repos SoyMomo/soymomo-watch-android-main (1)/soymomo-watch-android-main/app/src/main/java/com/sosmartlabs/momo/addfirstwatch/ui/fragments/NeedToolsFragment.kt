package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import timber.log.Timber
import com.airbnb.lottie.LottieDrawable
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.databinding.AddWatchNeedToolsFragmentBinding
import com.sosmartlabs.momo.models.*
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class NeedToolsFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: AddWatchNeedToolsFragmentBinding

    /**
     * ViewModel
     */
    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = AddWatchNeedToolsFragmentBinding.inflate(inflater, container, false)
        setAnimation(addFirstMomoViewModel.getWearerModel())
        addFirstMomoViewModel.setProgressStep(1)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupListeners()
    }

    private fun setAnimation(model: WatchModel) {
        with(binding.needToolsAnimation) {
            when (model) {
                is Original -> setAnimation(R.raw.need_tools_h2o)
                is H2OChile, H2OChileAmPm, H2OEurope, H2OSpain -> setAnimation(R.raw.need_tools_h2o)
                is Space1 -> setAnimation(R.raw.need_tools_space_1)
                is Space2 -> setAnimation(R.raw.need_tools_space_2)
                is Space3 -> setAnimation(R.raw.need_tools_space_2) // To-Do
                is Lite1 -> setAnimation(R.raw.need_tools_lite)
                else -> setAnimation(R.raw.need_tools_space_2)
            }
            repeatCount = LottieDrawable.INFINITE
            playAnimation()
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

    private fun setupListeners() {
        binding.buttonNext.setOnClickListener {
            if (addFirstMomoViewModel.getWearerModel() is Space3) {
                navigateById(R.id.action_needToolsFragment_to_powerOnDeviceFragment)
            } else {
                navigateById(R.id.action_needToolsFragment_to_firstContactFragment)
            }
        }
    }
}