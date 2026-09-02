package com.sosmartlabs.momotabletpadres.tabletsettings.blocks.inapppayments

import android.content.Context
import android.net.ConnectivityManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.MutableLiveData
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.databinding.TabletBlockPaymentsFragmentBinding
import com.sosmartlabs.momotabletpadres.utils.NewNetworkStateChecker
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class InAppPaymentsBlockFragment : Fragment() {

    private lateinit var fragmentBinding: TabletBlockPaymentsFragmentBinding
    val tabletViewModel: TabletViewModel by activityViewModels()

    private lateinit var currentTablet: Tablet
    private val hasInternetConnection = MutableLiveData<Boolean>()
    private lateinit var connectivityManager: ConnectivityManager

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("InAppPaymentsBlockFragment: onCreateView - Inflating layout and initializing view bindings")
        CrashlyticsLog.log("InAppPaymentsBlockFragment: onCreateView - Inflating layout and initializing view bindings")
        fragmentBinding = TabletBlockPaymentsFragmentBinding.inflate(inflater, container, false)

        setupToolbar()

        hasInternetConnection.value = NewNetworkStateChecker.isThereInternetConnection(requireContext())
        Timber.d("InAppPaymentsBlockFragment: onCreateView - hasInternetConnection=${hasInternetConnection.value}")
        CrashlyticsLog.log("InAppPaymentsBlockFragment: onCreateView - hasInternetConnection=${hasInternetConnection.value}")

        connectivityManager = requireContext().getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        Timber.d("InAppPaymentsBlockFragment: onCreateView - ConnectivityManager initialized")
        CrashlyticsLog.log("InAppPaymentsBlockFragment: onCreateView - ConnectivityManager initialized")

        return fragmentBinding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("InAppPaymentsBlockFragment: onViewCreated - View created successfully")
        CrashlyticsLog.log("InAppPaymentsBlockFragment: onViewCreated - View created successfully")
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = fragmentBinding.root,
            topView = fragmentBinding.appBarLayout,
            bottomView = fragmentBinding.contentScrollView
        )
        observeViewModel()
    }

    private fun setupToolbar() {
        Timber.d("InAppPaymentsBlockFragment: setupToolbar - Setting up toolbar")
        CrashlyticsLog.log("InAppPaymentsBlockFragment: setupToolbar - Setting up toolbar")
        val activity = activity
        if (activity is AppCompatActivity) {
            activity.setSupportActionBar(fragmentBinding.toolbar)
            val actionbar = activity.supportActionBar
            actionbar?.apply {
                setDisplayShowTitleEnabled(false)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            Timber.d("InAppPaymentsBlockFragment: setupToolbar - Toolbar configured successfully")
            CrashlyticsLog.log("InAppPaymentsBlockFragment: setupToolbar - Toolbar configured successfully")
        } else {
            Timber.e("InAppPaymentsBlockFragment: setupToolbar - Activity is not AppCompatActivity, cannot set up toolbar")
            CrashlyticsLog.log("InAppPaymentsBlockFragment: setupToolbar - Activity is not AppCompatActivity, cannot set up toolbar")
        }
        setHasOptionsMenu(true)
    }

    private fun observeViewModel() {
        Timber.d("InAppPaymentsBlockFragment: observeViewModel - Observing currentTablet LiveData")
        CrashlyticsLog.log("InAppPaymentsBlockFragment: observeViewModel - Observing currentTablet LiveData")
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            if (tablet == null) {
                Timber.e("InAppPaymentsBlockFragment: observeViewModel - Tablet is null in observer")
                CrashlyticsLog.log("InAppPaymentsBlockFragment: observeViewModel - Tablet is null in observer")
                return@observe
            }
            Timber.d("InAppPaymentsBlockFragment: observeViewModel - Received tablet update - ID: ${tablet.id}")
            CrashlyticsLog.log("InAppPaymentsBlockFragment: observeViewModel - Received tablet update - ID: ${tablet.id}")
            currentTablet = tablet
            if (tablet.inAppPaymentsEnabled == null) {
                Timber.e("InAppPaymentsBlockFragment: observeViewModel - inAppPaymentsEnabled is null for tablet ID: ${tablet.id}")
                CrashlyticsLog.log("InAppPaymentsBlockFragment: observeViewModel - inAppPaymentsEnabled is null for tablet ID: ${tablet.id}")
                return@observe
            }
            setupInAppPaymentsView(tablet.inAppPaymentsEnabled!!)
        }
        setupListeners()
    }

    private fun setupListeners() {
        Timber.d("InAppPaymentsBlockFragment: setupListeners - Setting up listeners for UI interactions")
        CrashlyticsLog.log("InAppPaymentsBlockFragment: setupListeners - Setting up listeners for UI interactions")
        fragmentBinding.variableOptionStatus.setOnClickListener {
            val switch = fragmentBinding.statusSwitch
            switch.toggle()
            val isChecked = switch.isChecked
            Timber.d("InAppPaymentsBlockFragment: setupListeners - In-app payments switch toggled to: $isChecked")
            CrashlyticsLog.log("InAppPaymentsBlockFragment: setupListeners - In-app payments switch toggled to: $isChecked")
            tabletViewModel.saveInAppPaymentEnabled(currentTablet, isChecked)
            Timber.d("InAppPaymentsBlockFragment: setupListeners - Called saveInAppPaymentEnabled with value: $isChecked")
            CrashlyticsLog.log("InAppPaymentsBlockFragment: setupListeners - Called saveInAppPaymentEnabled with value: $isChecked")
            setupInAppPaymentsView(isChecked)
        }
        fragmentBinding.statusSwitch.isClickable = false
    }

    private fun setupInAppPaymentsView(iapEnabled: Boolean) {
        Timber.d("InAppPaymentsBlockFragment: setupInAppPaymentsView - Configuring in-app payments view with enabled state: $iapEnabled")
        CrashlyticsLog.log("InAppPaymentsBlockFragment: setupInAppPaymentsView - Configuring in-app payments view with enabled state: $iapEnabled")
        with(fragmentBinding.statusSwitch) {
            isChecked = iapEnabled
            trackTintList = ContextCompat.getColorStateList(
                requireContext(),
                if (iapEnabled) R.color.colorChipMoviesSeries
                else R.color.colorChipVerySerious
            )
        }
        setTextEnabled(iapEnabled)
        fragmentBinding.statusImage.setImageResource(
            if (iapEnabled) R.drawable.settings_blocks_lock_close
            else R.drawable.settings_blocks_lock_open
        )
        Timber.d("InAppPaymentsBlockFragment: setupInAppPaymentsView - UI updated for in-app payments enabled: $iapEnabled")
        CrashlyticsLog.log("InAppPaymentsBlockFragment: setupInAppPaymentsView - UI updated for in-app payments enabled: $iapEnabled")
    }

    private fun setTextEnabled(enabled: Boolean) {
        Timber.d("InAppPaymentsBlockFragment: setTextEnabled - Updating status description text - enabled: $enabled")
        CrashlyticsLog.log("InAppPaymentsBlockFragment: setTextEnabled - Updating status description text - enabled: $enabled")
        fragmentBinding.statusDescription.setText(
            if (enabled) R.string.settings_variable_status_enabled
            else R.string.settings_variable_status_disabled
        )
    }
}
