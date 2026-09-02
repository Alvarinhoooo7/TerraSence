package com.sosmartlabs.momo.sim.ui.fragments.newsubscription

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.SubscriptionNewChooseWearerFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.sim.SimActivity
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.sim.ui.SimViewModel
import com.sosmartlabs.momo.sim.ui.adapter.ChooseWearerAdapter
import timber.log.Timber

class NewSubscriptionChooseWearerFragment : Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionNewChooseWearerFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.subscription_new_choose_watch_title)

    /**
     * ChooseWearer Adapter
     */
    private lateinit var chooseWearerAdapter: ChooseWearerAdapter

    /**
     * ViewModel
     */
    private val simViewModel: SimViewModel by activityViewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("NewSubscriptionChooseWearerFragment: onCreateView")
        binding = SubscriptionNewChooseWearerFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("NewSubscriptionChooseWearerFragment: onViewCreated")
        binding.chooseWatchButtonNext.isEnabled = false
        setupToolbar()
        setupRecyclerView()
        observeViewModel()
        setupListeners()
    }

    private fun setupToolbar() {
        Timber.d("NewSubscriptionChooseWearerFragment: Setting up toolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
        }
    }

    private fun setupRecyclerView() {
        Timber.d("NewSubscriptionChooseWearerFragment: Setting up recycler view")
        chooseWearerAdapter = ChooseWearerAdapter()
        chooseWearerAdapter.listener = object : ChooseWearerAdapter.Listener {
            override fun onChooseWearerClicked(index: Int, wearer: Wearer) {
                Timber.d("NewSubscriptionChooseWearerFragment: Wearer selected at index $index")
                CrashlyticsLog.log("NewSubscriptionChooseWearerFragment: Wearer selected")
                newSubscriptionViewModel.setCurrentWearer(wearer)
            }
        }
        with(binding.chooseWatchRecyclerView) {
            adapter = chooseWearerAdapter
            layoutManager = LinearLayoutManager(requireContext())
        }
    }

    private fun setupListeners() {
        Timber.d("NewSubscriptionChooseWearerFragment: Setting up button listeners")
        
        binding.chooseWatchButtonNext.setOnClickListener {
            Timber.d("NewSubscriptionChooseWearerFragment: Next button clicked, navigating to add SIM")
            CrashlyticsLog.log("NewSubscriptionChooseWearerFragment: Next button clicked, navigating to add SIM")
            newSubscriptionViewModel.setNullSim()
            navigateById(R.id.action_newSubscriptionChooseWearerFragment_to_nav_add_sim)
        }

        binding.chooseWatchButtonReturn.setOnClickListener {
            Timber.d("NewSubscriptionChooseWearerFragment: Return button clicked, going back to SimActivity")
            CrashlyticsLog.log("NewSubscriptionChooseWearerFragment: Return button clicked")
            requireActivity().finish()
            startActivity(Intent(requireContext(), SimActivity::class.java))
        }
    }

    private fun observeViewModel() {
        Timber.d("NewSubscriptionChooseWearerFragment: Setting up ViewModel observers")
        
        simViewModel.wearerNoSubscriptionList.observe(viewLifecycleOwner) { wearers ->
            Timber.d("NewSubscriptionChooseWearerFragment: Received wearers list with ${wearers.size} items")
            if (wearers.isEmpty()) {
                Timber.d("NewSubscriptionChooseWearerFragment: No wearers available, showing empty state")
                binding.chooseWatchViewFlipper.displayedChild = 1
            } else {
                Timber.d("NewSubscriptionChooseWearerFragment: Showing ${wearers.size} wearers in list")
                chooseWearerAdapter.submitList(wearers)
                binding.chooseWatchViewFlipper.displayedChild = 0
            }
        }

        newSubscriptionViewModel.currentWearer.observe(viewLifecycleOwner) { wearer ->
            Timber.d("NewSubscriptionChooseWearerFragment: Current wearer updated: ${wearer != null}")
            binding.chooseWatchButtonNext.isEnabled = wearer != null
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("NewSubscriptionChooseWearerFragment: Navigating to destination ID: $navId")
        CrashlyticsLog.log("NewSubscriptionChooseWearerFragment: Navigating to destination ID: $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    override fun onDestroyView() {
        Timber.d("NewSubscriptionChooseWearerFragment: onDestroyView")
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        Timber.d("NewSubscriptionChooseWearerFragment: Disposing resources")
    }
}
