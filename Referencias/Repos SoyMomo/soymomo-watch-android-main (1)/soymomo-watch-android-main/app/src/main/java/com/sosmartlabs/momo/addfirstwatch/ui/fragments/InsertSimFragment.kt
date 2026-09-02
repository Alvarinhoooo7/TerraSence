package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.airbnb.lottie.LottieDrawable
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.model.WatchAvailabilityStatus
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.databinding.AddWatchInsertSimFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.*
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.concurrent.TimeUnit

@AndroidEntryPoint
class InsertSimFragment : Fragment() {

    private lateinit var binding: AddWatchInsertSimFragmentBinding
    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()
    private var pollingJob: Job? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("InsertSimFragment: onCreateView called")
        binding = AddWatchInsertSimFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("InsertSimFragment: onViewCreated called")
        setupListeners()
        observeViewModel()
        startPolling()
    }

    override fun onDestroyView() {
        Timber.d("InsertSimFragment: onDestroyView called")
        stopPolling()
        super.onDestroyView()
    }

    private fun setAnimation() {
        Timber.d("InsertSimFragment: Setting up animation for no pre-inserted sim case")
        val wearerModel = addFirstMomoViewModel.getWearerModel()
        val animationId = when (wearerModel) {
            Original -> R.raw.sim_linked_success_h2o
            H2OChile, H2OChileAmPm, H2OEurope, H2OSpain -> R.raw.sim_linked_success_h2o
            Space1 -> R.raw.sim_linked_success_space_1
            Space2 -> R.raw.sim_linked_success_space_2
            Space3 -> R.raw.sim_linked_success_space_3
            Lite1 -> R.raw.sim_linked_success_space_lite
            else -> R.raw.sim_linked_success_space_2
        }
        Timber.d("InsertSimFragment: Selected animation resource id: $animationId")
        with(binding.insertSimAnimation) {
            setAnimation(animationId)
            repeatCount = LottieDrawable.INFINITE
            playAnimation()
        }
    }

    private fun setAnimationWithPreInsertedSIM() {
        Timber.d("InsertSimFragment: Setting up animation for pre-inserted sim case")
        with(binding.insertSimAnimation) {
            setAnimation(R.raw.configure_sim)
            repeatCount = LottieDrawable.INFINITE
            playAnimation()
        }
    }

    private fun setupListeners() {
        Timber.d("InsertSimFragment: Setting up button listeners")
        binding.buttonNext.setOnClickListener {
            Timber.d("InsertSimFragment: Next button clicked")
            val selectedMobileNetworkOperator = setWatchMobileNetworkOperator()
            
            if (selectedMobileNetworkOperator?.hasExtraActivationSteps == true) {
                Timber.d("InsertSimFragment: Navigating to extra activation steps")
                navigateById(R.id.action_insertSimFragment_to_simExtraStepFragment)
            } else {
                Timber.d("InsertSimFragment: Navigating to kid profile")
                navigateById(R.id.action_insertSimFragment_to_kidProfileFragment)
            }
        }
    }

    private fun observeViewModel() {
        Timber.d("InsertSimFragment: Setting up ViewModel observers")

        addFirstMomoViewModel.watchAvailabilityStatus.observe(viewLifecycleOwner) { status ->
            Timber.d("InsertSimFragment: Watch availability status changed to: $status")
            when (status) {
                WatchAvailabilityStatus.SUCCESS_WITH_SIM_PRE_INSERTED -> {
                    Timber.d("InsertSimFragment: SIM is pre-inserted, updating UI")
                    setAnimationWithPreInsertedSIM()
                    binding.insertSimTitle.text = getString(R.string.add_watch_insert_sim_already_pre_inserted_title)
                    binding.insertSimDescription.text = getString(R.string.add_watch_insert_sim_already_pre_inserted_description)
                    binding.insertSimFirstInteractionCardWaitingTitle.text = getString(R.string.add_watch_insert_sim_with_pre_inserted_first_interaction_waiting_title)
                    binding.insertSimFirstInteractionCardWaitingMessage.text =  getString(R.string.add_watch_insert_sim_with_pre_inserted_first_interaction_waiting_description)
                }
                else -> {
                    Timber.d("InsertSimFragment: Unhandled watch availability status: $status")
                    setAnimation()
                    binding.insertSimFirstInteractionCardWaitingTitle.text = getString(R.string.add_watch_insert_sim_first_interaction_waiting_title)
                    binding.insertSimFirstInteractionCardWaitingMessage.text =  getString(R.string.add_watch_insert_sim_first_interaction_waiting_description)
                }
            }
        }

        addFirstMomoViewModel.currentWearer.observe(viewLifecycleOwner) { currentWearer ->
            Timber.d("InsertSimFragment: Current wearer updated")
            currentWearer?.let { wearer ->
                val hasFirstInteraction = wearer.hasSuccessfulFirstInteraction()
                Timber.d("InsertSimFragment: Has first interaction: $hasFirstInteraction")
                if (hasFirstInteraction) {
                    addFirstMomoViewModel.trackFirstInteractionDetected()
                }
                binding.insertSimFirstInteractionCardFlipper.displayedChild = if (hasFirstInteraction) 1 else 0
            }
        }
    }

    private fun setWatchMobileNetworkOperator(): MobileNetworkOperator? {
        Timber.d("InsertSimFragment: Setting watch mobile network operator")
        val selectedMobileNetworkOperator = addFirstMomoViewModel.selectedMobileNetworkOperator.value
        val isSoyMomoSIMUser = newSubscriptionViewModel.newCreatedSubscription.value != null
        Timber.d("InsertSimFragment: SIM user type selected. isSoyMomoSIMUser: $isSoyMomoSIMUser")
        addFirstMomoViewModel.trackSimChoiceSelected(
            choice = if (isSoyMomoSIMUser) {
                if (addFirstMomoViewModel.watchAvailabilityStatus.value == WatchAvailabilityStatus.SUCCESS_WITH_SIM_PRE_INSERTED) {
                    AddFirstMomoViewModel.SIM_PATH_PREINSERTED
                } else {
                    AddFirstMomoViewModel.SIM_PATH_SOYMOMO
                }
            } else {
                AddFirstMomoViewModel.SIM_PATH_OTHER
            },
            hasExtraActivationSteps = selectedMobileNetworkOperator?.hasExtraActivationSteps,
        )

        addFirstMomoViewModel.setWatchMobileNetworkOperator(
            mobileNetworkOperator = if (isSoyMomoSIMUser) null else selectedMobileNetworkOperator,
            isOther = !isSoyMomoSIMUser && selectedMobileNetworkOperator == null,
            isSoyMomo = isSoyMomoSIMUser
        )
        
        return selectedMobileNetworkOperator
    }

    private fun startPolling() {
        Timber.d("InsertSimFragment: Starting polling for first interaction")
        pollingJob = lifecycleScope.launch {
            while (isActive) {
                if (addFirstMomoViewModel.currentWearer.value?.hasSuccessfulFirstInteraction() == true) {
                    Timber.d("InsertSimFragment: First interaction detected, stopping polling")
                    stopPolling()
                    break
                }

                Timber.d("InsertSimFragment: Refreshing current wearer")
                addFirstMomoViewModel.refreshCurrentWearer()
                delay(TimeUnit.SECONDS.toMillis(10))
            }
        }
    }

    private fun stopPolling() {
        Timber.d("InsertSimFragment: Stopping polling job")
        pollingJob?.cancel()
        pollingJob = null
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("InsertSimFragment: Navigating to destination with id: $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }
}
