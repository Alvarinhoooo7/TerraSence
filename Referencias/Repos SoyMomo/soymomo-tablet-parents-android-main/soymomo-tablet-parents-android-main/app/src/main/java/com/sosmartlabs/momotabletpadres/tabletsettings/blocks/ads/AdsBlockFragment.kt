package com.sosmartlabs.momotabletpadres.tabletsettings.blocks.ads

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.GridLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.adapters.new_designs_adapters.AdBlockerAdapter
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.ViewStateAction
import com.sosmartlabs.momotabletpadres.databinding.TabletBlockAdsFragmentBinding
import com.sosmartlabs.momotabletpadres.viewmodels.AdBlockerViewModel
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class AdsBlockFragment : Fragment() {

    private lateinit var fragmentBinding: TabletBlockAdsFragmentBinding
    private lateinit var adBlockerAdapter: AdBlockerAdapter

    private val adBlockerViewModel: AdBlockerViewModel by viewModels()
    private val tabletViewModel: TabletViewModel by activityViewModels()

    private lateinit var currentTablet: Tablet
    private lateinit var infoDialog: MaterialAlertDialogBuilder

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("AdsBlockFragment: Creating view and initializing bindings")
        fragmentBinding = TabletBlockAdsFragmentBinding.inflate(inflater, container, false)
        setupToolbar()
        return fragmentBinding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("AdsBlockFragment: Setting up views and observers")
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = fragmentBinding.root,
            topView = fragmentBinding.appBarLayout,
            bottomView = fragmentBinding.contentScrollView
        )
        setupViews()
        initDialog()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        Timber.d("AdsBlockFragment: Fragment resumed, checking data load requirement")
        if (this::currentTablet.isInitialized) {
            loadData()
        }
    }

    private fun setupToolbar() {
        Timber.d("AdsBlockFragment: setupToolbar - Setting up toolbar")
        CrashlyticsLog.log("AdsBlockFragment: setupToolbar - Setting up toolbar")
        val activity = activity
        if (activity is AppCompatActivity) {
            activity.setSupportActionBar(fragmentBinding.toolbar)
            val actionbar = activity.supportActionBar
            actionbar?.apply {
                setDisplayShowTitleEnabled(false)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            Timber.d("AdsBlockFragment: setupToolbar - Toolbar configured successfully")
            CrashlyticsLog.log("AdsBlockFragment: setupToolbar - Toolbar configured successfully")
        } else {
            Timber.e("AdsBlockFragment: setupToolbar - Activity is not AppCompatActivity, cannot set up toolbar")
            CrashlyticsLog.log("AdsBlockFragment: setupToolbar - Activity is not AppCompatActivity, cannot set up toolbar")
        }
        setHasOptionsMenu(true)
    }

    private fun setupViews() {
        Timber.d("AdsBlockFragment: Configuring views and adapters")

        adBlockerAdapter = AdBlockerAdapter(requireContext())
        with(fragmentBinding.recyclerView) {
            layoutManager = GridLayoutManager(requireContext(), 2)
            adapter = adBlockerAdapter
        }

        fragmentBinding.statusSwitch.setOnClickListener {
            Timber.d("AdsBlockFragment: Status switch clicked - Showing info dialog")
            infoDialog.show()
            fragmentBinding.statusSwitch.isChecked = !fragmentBinding.statusSwitch.isChecked
        }
    }

    private fun initDialog() {
        Timber.d("AdsBlockFragment: Initializing tutorial info dialog")
        infoDialog = MaterialAlertDialogBuilder(requireContext())
            .setTitle(resources.getString(R.string.adblocker_title))
            .setMessage(resources.getString(R.string.adblocker_guide))
            .setPositiveButton(resources.getString(R.string.adblocker_tutorial_button)) { _, _ ->
                Timber.d("AdsBlockFragment: Tutorial button clicked - Navigating to tutorial")
                goToTutorial()
            }
            .setNeutralButton(resources.getText(R.string.cancel)) { dialog, _ -> dialog.dismiss() }
    }

    private fun observeViewModel() {
        Timber.d("AdsBlockFragment: Setting up view model observers")

        adBlockerViewModel.summaryReturn.observe(viewLifecycleOwner) { adBlockerEntity ->
            Timber.d("AdsBlockFragment: Processing ad blocker summary update")
            if (adBlockerEntity == null) {
                Timber.d("AdsBlockFragment: Received null ad blocker entity")
                adBlockerAdapter.setData(listOf(), mapOf())
                updateTotalCount()
                showNoBlockedAdsView()
                return@observe
            }

            if (adBlockerEntity.parseSummary.isEmpty()) {
                Timber.d("AdsBlockFragment: No blocked ads found")
                showNoBlockedAdsView()
            } else {
                Timber.d("AdsBlockFragment: Found ${adBlockerEntity.parseSummary.size} blocked ads")
                showBlockedAdsView()
            }

            adBlockerAdapter.setData(
                adBlockerEntity.parseSummary.sortedByDescending { it.blockCounter },
                adBlockerEntity.icons
            )
            updateTotalCount()
        }

        adBlockerViewModel.viewStateHandler.observe(viewLifecycleOwner) { viewStateActions ->
            Timber.d("AdsBlockFragment: Processing ${viewStateActions.size} view state actions")
            viewStateActions.forEach { applyViewStateAction(it) }
        }

        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("AdsBlockFragment: Current tablet updated - ID: ${tablet.id}")
            currentTablet = tablet
            updateSwitchView(currentTablet.adBlockerEnabled)
            loadData()
        }
    }

    private fun applyViewStateAction(viewStateAction: ViewStateAction) {
        Timber.d("AdsBlockFragment: Applying view state action: $viewStateAction")
        when (viewStateAction) {
            ViewStateAction.SHOW_LOADING -> showLoadingView()
            ViewStateAction.HIDE_LOADING -> hideLoadingView()
            else -> {}
        }
    }

    private fun showLoadingView() {
        Timber.d("AdsBlockFragment: Displaying loading view")
        fragmentBinding.apply {
            progressBar.visibility = View.VISIBLE
            recyclerView.visibility = View.GONE
        }
    }

    private fun hideLoadingView() {
        Timber.d("AdsBlockFragment: Hiding loading view")
        fragmentBinding.apply {
            progressBar.visibility = View.GONE
            recyclerView.visibility = View.VISIBLE
        }
    }

    private fun showNoBlockedAdsView() {
        Timber.d("AdsBlockFragment: Displaying empty state view")
        fragmentBinding.apply {
            textNoBlockedAds.visibility = View.VISIBLE
            progressBar.visibility = View.GONE
            recyclerView.visibility = View.GONE
        }
    }

    private fun showBlockedAdsView() {
        Timber.d("AdsBlockFragment: Displaying blocked ads list")
        fragmentBinding.apply {
            textNoBlockedAds.visibility = View.GONE
            recyclerView.visibility = View.VISIBLE
        }
    }

    private fun goToTutorial() {
        Timber.d("AdsBlockFragment: Navigating to ad blocker tutorial screen")
        findNavController().navigate(R.id.action_tabletBlockAdsFragment_to_adBlockerTutorialFragment)
    }

    private fun updateSwitchView(isChecked: Boolean) {
        Timber.d("AdsBlockFragment: Updating switch state to: $isChecked")
        with(fragmentBinding) {
            statusDescription.setText(
                if (isChecked) R.string.settings_variable_status_enabled
                else R.string.settings_variable_status_disabled
            )

            statusSwitch.isChecked = isChecked

            statusSwitch.trackTintList = ContextCompat.getColorStateList(
                requireContext(),
                if (isChecked) R.color.colorChipMoviesSeries
                else R.color.colorChipVerySerious
            )

            val visibility = if (isChecked) View.VISIBLE else View.GONE
            adsResumeTitle.visibility = visibility
            dugIcImage.visibility = visibility
            dugDetection.visibility = visibility
            dugDetectionTitle.visibility = visibility
            dugDetectionDescription.visibility = visibility
            dugDetectionCount.visibility = visibility
            adsAppsTitle.visibility = visibility
            recyclerView.visibility = visibility
        }
    }

    fun loadData() {
        Timber.d("AdsBlockFragment: Loading ad blocker data for tablet: ${currentTablet.id}")
        adBlockerViewModel.loadData(currentTablet)
    }

    private fun updateTotalCount() {
        val alertCount = adBlockerAdapter.getAlertCount()
        Timber.d("AdsBlockFragment: Updating total blocked ads count to: $alertCount")
        fragmentBinding.dugDetectionCount.text = alertCount.toString()
    }
}