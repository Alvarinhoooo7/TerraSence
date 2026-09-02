package com.sosmartlabs.momotabletpadres.sim.ui.fragments.newsubscription

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionNewChooseDeviceFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.SimActivity
import com.sosmartlabs.momotabletpadres.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.sim.ui.SimViewModel
import com.sosmartlabs.momotabletpadres.sim.ui.adapter.ChooseDeviceAdapter
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

class NewSubscriptionChooseDeviceFragment : Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionNewChooseDeviceFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.subscription_new_choose_device_title)

    private lateinit var chooseDeviceAdapter: ChooseDeviceAdapter

    /**
     * ViewModel
     */
    private val simViewModel: SimViewModel by activityViewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("NewSubscriptionChooseDeviceFragment: onCreateView")
        binding = SubscriptionNewChooseDeviceFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("NewSubscriptionChooseDeviceFragment: onViewCreated")
        binding.chooseWatchButtonNext.isEnabled = false
        setupToolbar()
        setupRecyclerView()
        observeViewModel()
        setupListeners()

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.chooseWatchViewFlipper,
            bottomAsMargin = true
        )
    }

    private fun setupToolbar() {
        Timber.d("NewSubscriptionChooseDeviceFragment: Setting up toolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
        }
    }

    private fun setupRecyclerView() {
        Timber.d("NewSubscriptionChooseDeviceFragment: Setting up recycler view")
        chooseDeviceAdapter = ChooseDeviceAdapter()
        chooseDeviceAdapter.listener = object : ChooseDeviceAdapter.Listener {
            override fun onChooseDeviceClicked(index: Int, tablet: Tablet) {
                Timber.d("NewSubscriptionChooseDeviceFragment: Tablet selected: ${tablet.objectId} at index $index")
                CrashlyticsLog.log("NewSubscriptionChooseDeviceFragment: Tablet selected: ${tablet.objectId}")
                newSubscriptionViewModel.setCurrentTablet(tablet)
            }
        }
        with(binding.chooseWatchRecyclerView) {
            adapter = chooseDeviceAdapter
            layoutManager = LinearLayoutManager(requireContext())
        }
    }

    private fun setupListeners() {
        Timber.d("NewSubscriptionChooseDeviceFragment: Setting up button listeners")
        
        binding.chooseWatchButtonNext.setOnClickListener {
            Timber.d("NewSubscriptionChooseDeviceFragment: Next button clicked, navigating to add SIM")
            CrashlyticsLog.log("NewSubscriptionChooseDeviceFragment: Next button clicked, navigating to add SIM")
            newSubscriptionViewModel.setNullSim()
            navigateById(R.id.action_newSubscriptionChooseDeviceFragment_to_nav_add_sim)
        }

        binding.chooseWatchButtonReturn.setOnClickListener {
            Timber.d("NewSubscriptionChooseDeviceFragment: Return button clicked, going back to SimActivity")
            CrashlyticsLog.log("NewSubscriptionChooseDeviceFragment: Return button clicked")
            requireActivity().finish()
            startActivity(Intent(requireContext(), SimActivity::class.java))
        }
    }

    private fun observeViewModel() {
        Timber.d("NewSubscriptionChooseDeviceFragment: Setting up ViewModel observers")
        
        simViewModel.tabletNoSubscriptionList.observe(viewLifecycleOwner) { tablets ->
            Timber.d("NewSubscriptionChooseDeviceFragment: Received tablets list with ${tablets.size} items")
            if (tablets.isEmpty()) {
                Timber.d("NewSubscriptionChooseDeviceFragment: No tablets available, showing empty state")
                binding.chooseWatchViewFlipper.displayedChild = 1
            } else {
                Timber.d("NewSubscriptionChooseDeviceFragment: Showing ${tablets.size} tablets in list")
                chooseDeviceAdapter.submitList(tablets)
                binding.chooseWatchViewFlipper.displayedChild = 0
            }
        }

        newSubscriptionViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("NewSubscriptionChooseDeviceFragment: Current tablet updated: ${tablet?.objectId}")
            binding.chooseWatchButtonNext.isEnabled = tablet != null
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("NewSubscriptionChooseDeviceFragment: Navigating to destination ID: $navId")
        CrashlyticsLog.log("NewSubscriptionChooseDeviceFragment: Navigating to destination ID: $navId")
        findNavController().navigate(navId, bundle)
    }

    override fun onDestroyView() {
        Timber.d("NewSubscriptionChooseDeviceFragment: onDestroyView")
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        Timber.d("NewSubscriptionChooseDeviceFragment: Disposing resources")
    }
}