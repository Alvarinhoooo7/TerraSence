package com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.ui

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.MenuItem
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.content.res.AppCompatResources
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.adapters.ViewListener
import com.sosmartlabs.momotabletpadres.adapters.new_designs_adapters.AppProtectionAdapter
import com.sosmartlabs.momotabletpadres.databinding.SettingsCardAppsMainPhoneBinding
import com.sosmartlabs.momotabletpadres.databinding.TabletFragmentAppsMainBinding
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.InstalledAppEntity
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.viewmodels.AppProtectionViewModel
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class TabletAppsMainFragment : Fragment() {

    private lateinit var binding: TabletFragmentAppsMainBinding
    private lateinit var variableCard: SettingsCardAppsMainPhoneBinding
    private lateinit var appProtectionAdapter: AppProtectionAdapter

    val appProtectionViewModel: AppProtectionViewModel by activityViewModels()
    val tabletViewModel: TabletViewModel by activityViewModels()

    private var allowed : Boolean = true

    override fun onAttach(context: Context) {
        super.onAttach(context)
        Timber.d("TabletAppsMainFragment: Fragment attached to context")
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("TabletAppsMainFragment: Creating view with ViewBinding")
        binding = TabletFragmentAppsMainBinding.inflate(inflater, container, false)
        setupToolbar()
        variableCard = binding.variableCard
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("TabletAppsMainFragment: View created, initializing components")

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView
        )

        setupViewListener()
        initRecyclerView()
        setupClickListeners()
    }

    override fun onResume() {
        super.onResume()
        Timber.d("TabletAppsMainFragment: Fragment resumed, loading apps")
        loadAllApps()
    }

    override fun onPause() {
        super.onPause()
        Timber.d("TabletAppsMainFragment: Fragment paused")
    }

    override fun onDetach() {
        super.onDetach()
        Timber.d("TabletAppsMainFragment: Fragment detached")
    }

    override fun onDestroy() {
        super.onDestroy()
        Timber.d("TabletAppsMainFragment: Fragment destroyed")
    }

    private fun setupToolbar() {
        Timber.d("TabletAppsMainFragment: Setting up toolbar")
        (activity as AppCompatActivity).apply {
            setSupportActionBar(binding.toolbar)
            supportActionBar?.apply {
                setDisplayShowTitleEnabled(false)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
        }
        setHasOptionsMenu(true)
    }

    private fun setupViewListener() {
        Timber.d("TabletAppsMainFragment: Configuring view listener")
        appProtectionViewModel.installedAppsViewListener = object : ViewListener<InstalledAppEntity> {
            override fun showLoading() {
                Timber.d("TabletAppsMainFragment: Displaying loading state")
                binding.variableCard.viewFlipperAllowedApps.displayedChild = 1
            }

            override fun hideLoading() {
                Timber.d("TabletAppsMainFragment: Hiding loading state")
                binding.variableCard.viewFlipperAllowedApps.displayedChild = 0
            }

            override fun showErrorMessage(message: String) {
                binding.variableCard.viewFlipperAllowedApps.displayedChild = 0
                Timber.e("TabletAppsMainFragment: Error occurred - $message")
            }

            override fun showRetry() {
                Timber.d("TabletAppsMainFragment: Showing retry option")
            }

            override fun hideRetry() {
                Timber.d("TabletAppsMainFragment: Hiding retry option")
            }

            override fun showData(t: InstalledAppEntity) {
                Timber.d("TabletAppsMainFragment: Displaying data for app: ${t.appName}")
            }

            override fun showDataList(t: List<InstalledAppEntity>) {
                Timber.d("TabletAppsMainFragment: Displaying list of ${t.size} apps")
            }
        }
    }

    private fun setupClickListeners() {
        Timber.d("TabletAppsMainFragment: Setting up click listeners")
        variableCard.allowed.setOnClickListener {
            Timber.d("TabletAppsMainFragment: Allowed apps section clicked")
            allowedApps()
        }

        variableCard.blocked.setOnClickListener {
            Timber.d("TabletAppsMainFragment: Blocked apps section clicked")
            blockedApps()
        }
    }

    fun allowedApps() {
        Timber.d("TabletAppsMainFragment: Switching to allowed apps view")
        with(variableCard.allowed) {
            chipBackgroundColor = AppCompatResources.getColorStateList(requireContext(), R.color.colorSecondary)
            setTextColor(AppCompatResources.getColorStateList(requireContext(), R.color.white))
        }
        with(variableCard.blocked) {
            chipBackgroundColor = AppCompatResources.getColorStateList(requireContext(), R.color.grey_400)
            setTextColor(AppCompatResources.getColorStateList(requireContext(), R.color.grey_600))
        }
        appProtectionAdapter.allowedApps()
        allowed = true
    }

    private fun blockedApps() {
        Timber.d("TabletAppsMainFragment: Switching to blocked apps view")
        with(variableCard.allowed) {
            chipBackgroundColor = AppCompatResources.getColorStateList(requireContext(), R.color.grey_400)
            setTextColor(AppCompatResources.getColorStateList(requireContext(), R.color.grey_600))
        }
        with(variableCard.blocked) {
            chipBackgroundColor = AppCompatResources.getColorStateList(requireContext(), R.color.colorChipVerySerious)
            setTextColor(AppCompatResources.getColorStateList(requireContext(), R.color.white))
        }
        appProtectionAdapter.blockedApps()
        allowed = false
    }

    private fun populateView(appProtectionViewModel: AppProtectionViewModel) {
        Timber.d("TabletAppsMainFragment: Setting up apps list observer")
        appProtectionViewModel.installedApps.observe(viewLifecycleOwner) { apps ->
            CrashlyticsLog.log("Received apps in TabletAppsMainFragment: ${apps.size}")
            binding.variableCard.viewFlipperAllowedApps.displayedChild = 0
            if (apps.isNullOrEmpty()) {
                Timber.d("TabletAppsMainFragment: No apps to display")
                return@observe
            }
            Timber.d("TabletAppsMainFragment: Updating adapter with ${apps.size} apps")
            appProtectionAdapter.setData(apps)
            if (allowed) allowedApps() else blockedApps()
        }
    }

    private fun initRecyclerView() {
        Timber.d("TabletAppsMainFragment: Initializing RecyclerView")
        appProtectionAdapter = AppProtectionAdapter(requireContext())
        appProtectionAdapter.listener = AppProtectionAdapterListener()
        variableCard.recyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = appProtectionAdapter
        }
        populateView(appProtectionViewModel)
    }

    private fun loadAllApps() {
        Timber.d("TabletAppsMainFragment: Loading all apps for tablet")
        tabletViewModel.tablet.observe(this) { tablet ->
            Timber.d("TabletAppsMainFragment: Fetching installed apps for tablet: ${tablet.objectId}, name: ${tablet.profileName}")
            appProtectionViewModel.fetchInstalledApps(tablet)
        }
    }

    fun navigateToDetailsView() {
        Timber.d("TabletAppsMainFragment: Navigating to details view")
        findNavController().navigate(R.id.action_tabletFragmentAppsMain_to_tabletFragmentAppsDetail)
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        Timber.d("TabletAppsMainFragment: Options item selected: ${item.itemId}")
        return when (item.itemId) {
            R.id.action_search -> {
                true
            }
            android.R.id.home -> {
                super.onOptionsItemSelected(item)
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    inner class AppProtectionAdapterListener : AppProtectionAdapter.Listener {
        override fun onItemClicked(installedAppEntity: InstalledAppEntity) {
            Timber.d("TabletAppsMainFragment: App clicked: ${installedAppEntity.appName}")
            appProtectionViewModel.setSelectedInstalledApp(installedAppEntity)
            navigateToDetailsView()
        }
    }
}