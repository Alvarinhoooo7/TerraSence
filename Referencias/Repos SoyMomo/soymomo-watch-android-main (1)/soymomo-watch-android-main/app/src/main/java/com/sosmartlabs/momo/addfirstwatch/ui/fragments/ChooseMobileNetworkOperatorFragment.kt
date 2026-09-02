package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.GridLayoutManager
import com.airbnb.lottie.LottieDrawable
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.addfirstwatch.ui.adapter.ChooseMobileNetworkOperatorAdapter
import com.sosmartlabs.momo.databinding.AddWatchChooseMobileNetworkOperatorFragmentBinding
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class ChooseMobileNetworkOperatorFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: AddWatchChooseMobileNetworkOperatorFragmentBinding

    /**
     * ViewModel
     */
    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()

    /**
     * Adapter
     */
    private lateinit var chooseMobileNetworkOperatorAdapter: ChooseMobileNetworkOperatorAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = AddWatchChooseMobileNetworkOperatorFragmentBinding.inflate(inflater, container, false)
        setAnimation()
        addFirstMomoViewModel.setProgressStep(3)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupListeners()
        setupRecyclerView()
        observeViewModel()
    }

    private fun setAnimation() {
        with(binding.chooseMobileNetworkOperatorAnimation) {
            setAnimation(R.raw.configure_sim)
            repeatCount = LottieDrawable.INFINITE
            playAnimation()
        }
    }

    private fun setupRecyclerView() {
        chooseMobileNetworkOperatorAdapter = ChooseMobileNetworkOperatorAdapter()
        chooseMobileNetworkOperatorAdapter.listener = object : ChooseMobileNetworkOperatorAdapter.Listener {
            override fun onChooseMobileNetworkOperatorClicked(index: Int, mobileNetworkOperator: MobileNetworkOperator) {
                Timber.d("Mobile network operator selected")
                addFirstMomoViewModel.setSelectedMobileNetworkOperator(mobileNetworkOperator)
                addFirstMomoViewModel.trackSimChoiceSelected(
                    AddFirstMomoViewModel.SIM_PATH_OTHER,
                    hasExtraActivationSteps = mobileNetworkOperator.hasExtraActivationSteps
                )
                navigateById(R.id.action_chooseMobileNetworkOperatorFragment_to_configureOtherSimFragment)
            }
        }
        with(binding.chooseMobileNetworkOperatorRecyclerView) {
            adapter = chooseMobileNetworkOperatorAdapter
            layoutManager = GridLayoutManager(requireContext(), 2)
        }
    }

    private fun observeViewModel() {
        addFirstMomoViewModel.mobileNetworkOperatorList.observe(viewLifecycleOwner) {
            Timber.d("Mobile network operator list updated with ${it.size} items")
            chooseMobileNetworkOperatorAdapter.submitList(it)
        }
    }

    private fun setupListeners() {
        binding.buttonSimNotInList.setOnClickListener {
            addFirstMomoViewModel.removeSelectedMobileNetworkOperator()
            addFirstMomoViewModel.trackSimChoiceSelected(AddFirstMomoViewModel.SIM_PATH_OTHER)
            navigateById(R.id.action_chooseMobileNetworkOperatorFragment_to_configureOtherSimFragment)
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
