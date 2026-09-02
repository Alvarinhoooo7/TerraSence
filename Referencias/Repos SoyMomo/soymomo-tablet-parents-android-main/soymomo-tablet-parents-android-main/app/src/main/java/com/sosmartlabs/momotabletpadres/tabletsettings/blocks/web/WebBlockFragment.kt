package com.sosmartlabs.momotabletpadres.tabletsettings.blocks.web

import android.app.Dialog
import android.app.ProgressDialog
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.net.ConnectivityManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.lifecycle.MutableLiveData
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.databinding.DialogBlockWebsiteNewBinding
import com.sosmartlabs.momotabletpadres.databinding.TabletBlockWebFragmentBinding
import com.sosmartlabs.momotabletpadres.tabletsettings.interfaces.TableListState
import com.sosmartlabs.momotabletpadres.utils.ErrorHandlers
import com.sosmartlabs.momotabletpadres.utils.NewNetworkStateChecker
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class WebBlockFragment : Fragment() {

    lateinit var fragmentBinding: TabletBlockWebFragmentBinding
    private lateinit var adapter: WebsiteProtectionAdapter

    val tabletViewModel: TabletViewModel by activityViewModels()
    private val websiteViewModel: WebsiteProtectionViewModel by viewModels()

    private lateinit var currentTablet: Tablet
    private lateinit var connectivityManager: ConnectivityManager
    private val hasInternetConnection = MutableLiveData<Boolean>()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("WebBlockFragment: Initializing view creation")
        setupViewBindings(inflater, container)
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = fragmentBinding.root,
            topView = fragmentBinding.appBarLayout,
            bottomView = fragmentBinding.contentScrollView
        )
        setupToolbar()
        setupConnectivity()
        setupWebsiteProtection()
        setupObservers()
        Timber.d("WebBlockFragment: View creation completed")
        return fragmentBinding.root
    }

    private fun setupToolbar() {
        Timber.d("WebBlockFragment: Setting up toolbar")
        (activity as AppCompatActivity).setSupportActionBar(fragmentBinding.toolbar)
        val actionbar = (activity as AppCompatActivity).supportActionBar
        actionbar.apply {
            this?.setDisplayShowTitleEnabled(false)
            this?.setDisplayHomeAsUpEnabled(true)
            this?.setDisplayShowHomeEnabled(true)
        }
        setHasOptionsMenu(true)
    }

    private fun setupViewBindings(inflater: LayoutInflater, container: ViewGroup?) {
        Timber.d("WebBlockFragment: Setting up view bindings")
        fragmentBinding = TabletBlockWebFragmentBinding.inflate(inflater, container, false)
    }

    private fun setupConnectivity() {
        Timber.d("WebBlockFragment: Initializing connectivity services")
        connectivityManager = requireContext().getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        hasInternetConnection.value = NewNetworkStateChecker.isThereInternetConnection(requireContext())
    }

    private fun setupWebsiteProtection() {
        Timber.d("WebBlockFragment: Configuring website protection components")
        fragmentBinding.addWebButton.setOnClickListener {
            createAddWebsiteDialog()
        }

        adapter = WebsiteProtectionAdapter(context, fragmentBinding.recyclerViewWebProtection, websiteViewModel)
        fragmentBinding.recyclerViewWebProtection.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@WebBlockFragment.adapter
        }
    }

    private fun setupObservers() {
        Timber.d("WebBlockFragment: Initializing data observers")
        observeTablet()
        observeWebsiteList()
        observeTableListState()
        setupSwitchListener()
    }

    private fun observeTablet() {
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("WebBlockFragment: Tablet data updated - ID: ${tablet.id}, Browser Allowed: ${tablet.browserAllowed}")
            currentTablet = tablet
            updateBrowserStatus(tablet.browserAllowed!!)
            websiteViewModel.loadWebsites(currentTablet)
        }
    }

    private fun updateBrowserStatus(isBrowserAllowed: Boolean) {
        Timber.d("WebBlockFragment: Updating browser UI state - Allowed: $isBrowserAllowed")
        with(fragmentBinding) {
            statusSwitch.isChecked = isBrowserAllowed
            statusImage.setImageResource(
                if (isBrowserAllowed) R.drawable.settings_blocks_lock_open
                else R.drawable.settings_blocks_lock_close
            )
            statusDescription.text = getString(
                if (isBrowserAllowed) R.string.settings_variable_status_enabled
                else R.string.settings_variable_status_disabled
            )
        }
    }

    private fun setupSwitchListener() {
        Timber.d("WebBlockFragment: Setting up browser switch listener")
        fragmentBinding.statusSwitch.setOnCheckedChangeListener { _, checkedState ->
            handleBrowserToggle(checkedState)
        }
        fragmentBinding.variableOptionStatus.setOnClickListener {
            fragmentBinding.statusSwitch.toggle()
        }
        fragmentBinding.statusSwitch.isClickable = false
    }

    private fun handleBrowserToggle(checkedState: Boolean) {
        Timber.d("WebBlockFragment: Processing browser toggle request - Enabled: $checkedState")
        val progressDialog = ProgressDialog.show(
            context,
            getString(R.string.title_website_protection),
            getString(R.string.loading),
            true,
            false
        )
        progressDialog.show()

        tabletViewModel.enableBrowserBlock(checkedState) { error ->
            progressDialog.dismiss()
            if (error == null) {
                Timber.d("WebBlockFragment: Browser toggle successful")
                updateBrowserStatus(currentTablet.browserAllowed!!)
            } else {
                Timber.e("WebBlockFragment: Browser toggle failed with error: ${error.message}")
                ErrorHandlers.noConnectionDialog(requireContext(), null)
                fragmentBinding.statusSwitch.isChecked = !checkedState
            }
        }
    }

    private fun observeWebsiteList() {
        websiteViewModel.websiteList.observe(viewLifecycleOwner) { websites ->
            Timber.d("WebBlockFragment: Website list updated - Count: ${websites.size}")
            adapter.replaceData(websites)
            fragmentBinding.recyclerViewWebProtection.smoothScrollBy(1, 1)
        }
    }

    private fun observeTableListState() {
        websiteViewModel.tableListState.observe(viewLifecycleOwner) { state ->
            Timber.d("WebBlockFragment: Table list state changed to: $state")
            updateUIForTableListState(state)
        }
    }

    private fun updateUIForTableListState(state: TableListState?) {
        Timber.d("WebBlockFragment: Updating UI for table state: $state")
        val showMiddleElements = when (state) {
            TableListState.Loading -> false
            TableListState.Empty -> true
            TableListState.Populated -> false
            TableListState.Error, TableListState.Disconnected, null -> true
        }
        
        with(fragmentBinding) {
            middleTextUpperImage.visibility = if (showMiddleElements) View.VISIBLE else View.GONE
            middleText.visibility = if (showMiddleElements) View.VISIBLE else View.GONE
        }
    }

    private fun createAddWebsiteDialog() {
        Timber.d("WebBlockFragment: Creating website blocking dialog")
        val dialog = Dialog(requireContext())
        val dialogBinding = DialogBlockWebsiteNewBinding.inflate(layoutInflater)
        
        dialog.apply {
            setContentView(dialogBinding.root)
            window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            setupDialogButtons(dialogBinding, this)
            setOnDismissListener {
                Timber.d("WebBlockFragment: Dialog dismissed, reloading website list")
                websiteViewModel.loadWebsites()
            }
            show()
        }
    }

    private fun setupDialogButtons(binding: DialogBlockWebsiteNewBinding, dialog: Dialog) {
        Timber.d("WebBlockFragment: Setting up dialog button actions")
        with(binding) {
            buttonCancelWebsite.setOnClickListener {
                dialog.dismiss()
            }

            buttonAcceptWebsite.setOnClickListener {
                if (!etBlockWebsite.text.isNullOrBlank()) {
                    Timber.d("WebBlockFragment: Creating new blocked website: ${etBlockWebsite.text}")
                    websiteViewModel.createBlockedWebsite(etBlockWebsite.text.toString())
                }
                dialog.dismiss()
            }
        }
    }
}
