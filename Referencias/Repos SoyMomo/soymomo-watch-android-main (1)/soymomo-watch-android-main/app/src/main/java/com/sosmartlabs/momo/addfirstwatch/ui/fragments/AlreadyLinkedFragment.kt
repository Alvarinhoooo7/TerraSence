package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.airbnb.lottie.LottieDrawable
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.model.WatchAvailabilityStatus
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.databinding.AddWatchAlreadyLinkedFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.main.MainActivity
import com.sosmartlabs.momo.models.H2OChile
import com.sosmartlabs.momo.models.H2OChileAmPm
import com.sosmartlabs.momo.models.H2OEurope
import com.sosmartlabs.momo.models.H2OSpain
import com.sosmartlabs.momo.models.Lite1
import com.sosmartlabs.momo.models.Original
import com.sosmartlabs.momo.models.Space1
import com.sosmartlabs.momo.models.Space2
import com.sosmartlabs.momo.models.Space3
import com.sosmartlabs.momo.models.WatchModel
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class AlreadyLinkedFragment: Fragment() {

    private lateinit var binding: AddWatchAlreadyLinkedFragmentBinding
    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("AlreadyLinkedFragment: onCreateView")
        CrashlyticsLog.log("AlreadyLinkedFragment: Creating view")
        
        binding = AddWatchAlreadyLinkedFragmentBinding.inflate(inflater, container, false)
        addFirstMomoViewModel.setProgressStep(1)
        setAnimation(addFirstMomoViewModel.getWearerModel())
        
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("AlreadyLinkedFragment: onViewCreated")
        CrashlyticsLog.log("AlreadyLinkedFragment: View created")
        
        super.onViewCreated(view, savedInstanceState)
        setupListeners()
        observeViewModel()
    }

    private fun setupListeners() {
        Timber.d("AlreadyLinkedFragment: Setting up listeners")
        CrashlyticsLog.log("AlreadyLinkedFragment: Setting up button listeners")
        
        binding.buttonActivateSoymomoSim.setOnClickListener {
            Timber.d("AlreadyLinkedFragment: Activate SIM button clicked")
            CrashlyticsLog.log("AlreadyLinkedFragment: Navigating to pre-inserted SIM fragment")
            navigateById(R.id.action_alreadyLinkedFragment_to_hasPreInsertedSimFragment)
        }

        binding.buttonBackMenu.setOnClickListener {
            Timber.d("AlreadyLinkedFragment: Back to menu button clicked")
            CrashlyticsLog.log("AlreadyLinkedFragment: Navigating back to MainActivity")
            
            val intent = Intent(context, MainActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        }
    }

    private fun observeViewModel() {
        Timber.d("AlreadyLinkedFragment: Observing ViewModel")
        CrashlyticsLog.log("AlreadyLinkedFragment: Starting ViewModel observation")
        
        addFirstMomoViewModel.watchAvailabilityStatus.observe(viewLifecycleOwner) {
            Timber.d("AlreadyLinkedFragment: Wearer Status changed: $it")
            CrashlyticsLog.log("AlreadyLinkedFragment: Received watch availability status: $it")
            
            when(it) {
                WatchAvailabilityStatus.WATCH_ALREADY_LINKED_MISSING_PRE_INSERTED_SIM_ACTIVATION -> {
                    Timber.d("AlreadyLinkedFragment: Showing activate SIM button")
                    binding.buttonActivateSoymomoSim.visibility = View.VISIBLE
                    binding.configureSimDescription.text = getString(R.string.add_watch_already_linked_without_sim_description)
                }
                else -> {
                    Timber.e("AlreadyLinkedFragment: Unexpected watch status: $it")
                    CrashlyticsLog.log("AlreadyLinkedFragment: Unexpected watch status received: $it")
                    binding.buttonActivateSoymomoSim.visibility = View.INVISIBLE
                    binding.configureSimDescription.text = getString(R.string.add_watch_already_linked_description)
                }
            }
        }
    }

    private fun setAnimation(model: WatchModel) {
        Timber.d("AlreadyLinkedFragment: Setting animation for watch model: $model")
        CrashlyticsLog.log("AlreadyLinkedFragment: Setting animation for model: $model")
        
        val animationRes = when (model) {
            Original, H2OChile, H2OChileAmPm, H2OEurope, H2OSpain -> R.raw.sim_linked_success_h2o
            Space1 -> R.raw.sim_linked_success_space_1
            Space2 -> R.raw.sim_linked_success_space_2
            Space3 -> R.raw.sim_linked_success_space_3
            Lite1 -> R.raw.sim_linked_success_space_lite
            else -> R.raw.sim_linked_success_space_3
        }

        with(binding.animation) {
            setAnimation(animationRes)
            repeatCount = LottieDrawable.INFINITE
            playAnimation()
        }
        
        CrashlyticsLog.log("AlreadyLinkedFragment: Animation set successfully for model: $model")
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("AlreadyLinkedFragment: Navigating to destination: $navId")
        CrashlyticsLog.log("AlreadyLinkedFragment: Navigation initiated to destination: $navId")
        
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }
}