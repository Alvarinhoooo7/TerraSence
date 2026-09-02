package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.airbnb.lottie.LottieDrawable
import com.bumptech.glide.Glide
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.databinding.AddWatchHasPreInsertedSimBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.*
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class HasPreInsertedSimFragment: Fragment() {

    private lateinit var binding: AddWatchHasPreInsertedSimBinding
    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("HasPreInsertedSimFragment: onCreateView")
        CrashlyticsLog.log("HasPreInsertedSimFragment: Creating view")
        binding = AddWatchHasPreInsertedSimBinding.inflate(inflater, container, false)
        addFirstMomoViewModel.setProgressStep(2)
        setAnimation()
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("HasPreInsertedSimFragment: onViewCreated")
        CrashlyticsLog.log("HasPreInsertedSimFragment: View created")
        super.onViewCreated(view, savedInstanceState)
        setupListeners()
        observeViewModel()
    }

    private fun setupListeners() {
        Timber.d("HasPreInsertedSimFragment: Setting up listeners")
        CrashlyticsLog.log("HasPreInsertedSimFragment: Setting up button listeners")
        
        binding.buttonNext.setOnClickListener {
            Timber.d("HasPreInsertedSimFragment: Next button clicked - navigating to choose plan")
            CrashlyticsLog.log("HasPreInsertedSimFragment: Navigating to choose plan fragment")
            addFirstMomoViewModel.trackSimChoiceSelected(AddFirstMomoViewModel.SIM_PATH_PREINSERTED)
            navigateById(R.id.action_hasPreInsertedSimFragment_to_newSubscriptionChoosePlanFragment)
            addFirstMomoViewModel.setProgressStep(3)
        }

        binding.hasPreInsertedSimOtherSim.setOnClickListener {
            Timber.d("HasPreInsertedSimFragment: Other SIM option clicked - navigating to configure SIM")
            CrashlyticsLog.log("HasPreInsertedSimFragment: Navigating to configure SIM fragment")
            addFirstMomoViewModel.trackSimChoiceSelected(AddFirstMomoViewModel.SIM_PATH_OTHER)
            navigateById(R.id.action_hasPreInsertedSimFragment_to_configureSimFragment)
        }
    }

    private fun observeViewModel() {
        Timber.d("HasPreInsertedSimFragment: Starting ViewModel observation")
        CrashlyticsLog.log("HasPreInsertedSimFragment: Observing ViewModel changes")
        
        newSubscriptionViewModel.currentSim.observe(viewLifecycleOwner) { sim ->
            Timber.d("HasPreInsertedSimFragment: Current SIM update received")
            CrashlyticsLog.log("HasPreInsertedSimFragment: Processing SIM update: ${sim?.networkOperator?.name}")
            try {
                val mobileNetworkOperator = sim?.networkOperator!!
                setMobileNetworkOperatorViews(mobileNetworkOperator)
                newSubscriptionViewModel.getSubscriptionPlansForSim(sim)
                newSubscriptionViewModel.getSubscriptionUserInfo(newSubscriptionViewModel.currentUser.value!!, sim.mnoProvider.country)
                CrashlyticsLog.log("HasPreInsertedSimFragment: Successfully processed SIM update for ${mobileNetworkOperator.name}")
            } catch (e: Exception) {
                Timber.e(e, "HasPreInsertedSimFragment: Error processing SIM update")
                CrashlyticsLog.recordNonFatalError(e, "HasPreInsertedSimFragment: Failed to process SIM update")
            }
        }
    }

    private fun setAnimation() {
        Timber.d("HasPreInsertedSimFragment: Setting animation")
        CrashlyticsLog.log("HasPreInsertedSimFragment: Setting animation")
        with(binding.hasPreInsertedSimAnimation) {
            setAnimation(R.raw.configure_soymomo_sim_card)
            repeatCount = LottieDrawable.INFINITE
            playAnimation()
        }
    }

    private fun setMobileNetworkOperatorViews(mobileNetworkOperator: MobileNetworkOperator) {
        Timber.d("HasPreInsertedSimFragment: Setting views for operator: ${mobileNetworkOperator.name}")
        CrashlyticsLog.log("HasPreInsertedSimFragment: Updating UI for operator: ${mobileNetworkOperator.name}")
        
        val operatorName = mobileNetworkOperator.name
        binding.hasPreInsertedSimDescription.text = getString(R.string.add_watch_has_pre_inserted_sim_description, operatorName)
        binding.buttonNext.text = getString(R.string.add_watch_has_pre_inserted_sim_button_next, operatorName)
        
        try {
            val operatorLogoUrl = mobileNetworkOperator.logo.url
            Glide.with(requireContext())
                .load(operatorLogoUrl)
                .fitCenter()
                .into(binding.hasPreInsertedSimMobileNetworkOperatorLogo)
            CrashlyticsLog.log("HasPreInsertedSimFragment: Successfully loaded operator logo for $operatorName")
        } catch (e: Exception) {
            Timber.e(e, "HasPreInsertedSimFragment: Error loading operator logo")
            CrashlyticsLog.recordNonFatalError(e, "HasPreInsertedSimFragment: Failed to load operator logo")
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("HasPreInsertedSimFragment: Navigating to destination: $navId")
        CrashlyticsLog.log("HasPreInsertedSimFragment: Navigation initiated to destination: $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }
}
