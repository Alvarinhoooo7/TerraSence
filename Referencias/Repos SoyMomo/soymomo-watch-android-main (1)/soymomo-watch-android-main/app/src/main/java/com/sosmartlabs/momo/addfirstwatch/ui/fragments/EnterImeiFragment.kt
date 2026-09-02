package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.airbnb.lottie.LottieDrawable
import com.sosmartlabs.momo.BuildConfig
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.AddFirstMomoActivity
import com.sosmartlabs.momo.addfirstwatch.model.WatchAvailabilityStatus
import com.sosmartlabs.momo.addfirstwatch.model.WearerStatus
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.barcodescanner.BarcodeScanningActivity
import com.sosmartlabs.momo.databinding.AddWatchEnterImeiFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Space3
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.hideKeyboard
import com.sosmartlabs.momo.utils.ui.DefaultErrorDialog
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class EnterImeiFragment: Fragment() {
    /**
     * Binding
     */
    private lateinit var binding: AddWatchEnterImeiFragmentBinding

    /**
     * ViewModel
     */
    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    private val startForResult = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        if (it.resultCode == Activity.RESULT_OK) {
            val barcode = it.data!!.getStringExtra("barcode")
            if (!barcode.isNullOrBlank()) {
                Timber.d("EnterImeiFragment: Barcode scanned successfully")
                CrashlyticsLog.log("Barcode scanned successfully")
                with(binding.tilImei.editText!!) {
                    setText(barcode)
                    addFirstMomoViewModel.validateWatchAvailability(
                        this.text.toString(),
                        AddFirstMomoViewModel.INPUT_METHOD_BARCODE
                    )
                }
            } else {
                Timber.w("EnterImeiFragment: Barcode scan returned empty result")
                CrashlyticsLog.log("Barcode scan returned empty result")
            }
        } else {
            Timber.d("EnterImeiFragment: Barcode scanning canceled or failed")
            CrashlyticsLog.log("Barcode scanning canceled or failed")
        }
    }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            Timber.d("EnterImeiFragment: Camera permission granted, launching barcode scanner")
            CrashlyticsLog.log("Camera permission granted, launching barcode scanner")
            val intent = Intent(activity, BarcodeScanningActivity::class.java)
            intent.putExtra(Constants.EXTRA_ORIGIN_INTENT, "IMEI")
            startForResult.launch(intent)
        } else {
            Timber.w("EnterImeiFragment: Camera permission denied by user")
            CrashlyticsLog.log("Camera permission denied by user")
            // Explain to the user that the feature is unavailable because the
            // features requires a permission that the user has denied. At the
            // same time, respect the user's decision. Don't link to system
            // settings in an effort to convince the user to change their
            // decision.
        }
    }

    /**
     * Extension function to context to check permission easier
     */
    private fun Context.hasPermission(permissionType: String): Boolean {
        return ContextCompat.checkSelfPermission(this, permissionType) ==
                PackageManager.PERMISSION_GRANTED
    }

    /**
     * Camera Permission
     */
    private val isCameraPermissionGranted
        get() = requireContext().hasPermission(Manifest.permission.CAMERA)


    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("EnterImeiFragment: onCreateView")
        CrashlyticsLog.log("EnterImeiFragment: onCreateView")
        binding = AddWatchEnterImeiFragmentBinding.inflate(inflater, container, false)
        setAnimation()
        newSubscriptionViewModel.getCurrentUser()
        addFirstMomoViewModel.setProgressStep(0)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("EnterImeiFragment: onViewCreated")
        CrashlyticsLog.log("EnterImeiFragment: onViewCreated")
        setupListeners()
        observeViewModel()
        applyDeepLinkPrefill()
    }

    /**
     * If the host AddFirstMomoActivity was launched from a share deep link
     * (soymomo-watch://link/<id> or https://soymomo.com/link/watch/<id>),
     * seed the device-id input with the shared id so the parent doesn't have
     * to type or scan it. Prefill only — the parent still taps Next, which
     * triggers the existing validateWatchAvailability lookup (matches the iOS
     * watch flow, where Next sends the link request).
     */
    private fun applyDeepLinkPrefill() {
        val prefill = activity?.intent
            ?.getStringExtra(AddFirstMomoActivity.EXTRA_PREFILL_DEVICE_ID)
            ?.takeIf { it.isNotBlank() } ?: return
        Timber.i("EnterImeiFragment: Prefilling tilImei with deep-link id=$prefill")
        binding.tilImei.editText?.setText(prefill)
        // One-shot: don't re-apply if the fragment is recreated or revisited.
        activity?.intent?.removeExtra(AddFirstMomoActivity.EXTRA_PREFILL_DEVICE_ID)
    }

    private fun prefillForm() {
        if (BuildConfig.DEBUG) {
            Timber.d("EnterImeiFragment: Prefilling form with debug IMEI")
            binding.tilImei.editText!!.setText("869609036856407")
        }
    }

    private fun setAnimation() {
        Timber.d("EnterImeiFragment: Setting up animation")
        with(binding.enterImeiAnimation) {
            setAnimation(R.raw.enter_imei)
            repeatCount = LottieDrawable.INFINITE
            playAnimation()
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("EnterImeiFragment: Navigating to destination ID: $navId")
        CrashlyticsLog.log("Navigating to destination ID: $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    private fun setupListeners() {
        Timber.d("EnterImeiFragment: Setting up UI listeners")
        
        binding.root.setOnClickListener {
            Timber.d("EnterImeiFragment: Root clicked, hiding keyboard")
            it.hideKeyboard()
        }

        binding.buttonNext.setOnClickListener {
            val imei = binding.tilImei.editText!!.text.toString()
            Timber.d("EnterImeiFragment: Next button clicked, validating IMEI")
            CrashlyticsLog.log("Validating IMEI")
            addFirstMomoViewModel.validateWatchAvailability(
                imei,
                AddFirstMomoViewModel.INPUT_METHOD_MANUAL
            )
        }

        binding.tilImei.setEndIconOnClickListener {
            Timber.d("EnterImeiFragment: Scan barcode icon clicked")
            CrashlyticsLog.log("Scan barcode icon clicked")
            launchBarcodeScanner()
        }
    }

    private fun observeViewModel() {
        Timber.d("EnterImeiFragment: Setting up ViewModel observers")
        CrashlyticsLog.log("Setting up ViewModel observers")
        
        addFirstMomoViewModel.watchAvailabilityStatus.observe(viewLifecycleOwner) { status ->
            Timber.d("EnterImeiFragment: WatchAvailabilityStatus changed: $status")
            CrashlyticsLog.log("WatchAvailabilityStatus changed: $status")
            
            when(status) {
                WatchAvailabilityStatus.SEARCH_IN_PROGRESS -> {
                    Timber.d("EnterImeiFragment: Search in progress, showing indicator")
                    CrashlyticsLog.log("Search in progress, showing indicator")
                    showProgressIndicator()
                }
                WatchAvailabilityStatus.IMEI_INVALID,
                WatchAvailabilityStatus.IMEI_UNKNOWN,
                WatchAvailabilityStatus.IMEI_LENGTH_ERROR -> {
                    Timber.w("EnterImeiFragment: IMEI validation failed with status: $status")
                    CrashlyticsLog.log("IMEI validation failed: $status")
                    hideProgressIndicator()
                    showErrorDialog(getString(R.string.add_watch_enter_imei_dialog_error_title), getString(R.string.add_watch_enter_imei_error_search))
                }
                WatchAvailabilityStatus.SUCCESS -> {
                    Timber.i("EnterImeiFragment: Watch found successfully")
                    CrashlyticsLog.log("Watch found successfully")
                    // Handled in addFirstMomoViewModel.wearerStatus
                }
                WatchAvailabilityStatus.SUCCESS_WITH_SIM_PRE_INSERTED -> {
                    Timber.i("EnterImeiFragment: Watch found with pre-inserted SIM")
                    CrashlyticsLog.log("Watch found with pre-inserted SIM")
                    // Handled in addFirstMomoViewModel.wearerStatus
                }
                WatchAvailabilityStatus.SEARCH_ERROR, 
                WatchAvailabilityStatus.INTERNAL_ERROR, 
                WatchAvailabilityStatus.WATCH_NOT_FOUND -> {
                    Timber.e("EnterImeiFragment: Watch search failed with status: $status")
                    CrashlyticsLog.log("Watch search failed: $status")
                    hideProgressIndicator()
                    showErrorDialog(getString(R.string.add_watch_enter_imei_dialog_error_title), getString(R.string.add_watch_enter_imei_error_invalid))
                }
                WatchAvailabilityStatus.WATCH_ALREADY_LINKED,
                WatchAvailabilityStatus.WATCH_ALREADY_LINKED_MISSING_PRE_INSERTED_SIM_ACTIVATION-> {
                    Timber.w("EnterImeiFragment: Watch already linked to an account: $status")
                    CrashlyticsLog.log("Watch already linked to an account: $status")
                    hideProgressIndicator()
                    navigateById(R.id.action_enterImeiFragment_to_alreadyLinkedFragment)
                }
                WatchAvailabilityStatus.SUCCESS_WATCH_BELONGS_TO_OTHER_USER -> {
                    Timber.w("EnterImeiFragment: Watch belongs to another user")
                    CrashlyticsLog.log("Watch belongs to another user")
                    hideProgressIndicator()
                    navigateById(R.id.action_enterImeiFragment_to_imeiHasAdminFragment)
                }
                else -> {
                    Timber.e("EnterImeiFragment: Unhandled watch availability status: $status")
                    CrashlyticsLog.log("Unhandled watch availability status: $status")
                }
            }
        }

        addFirstMomoViewModel.wearerStatus.observe(viewLifecycleOwner) { status ->
            Timber.d("EnterImeiFragment: WearerStatus changed: $status")
            CrashlyticsLog.log("WearerStatus changed: $status")
            
            when(status) {
                WearerStatus.LINK_SUCCESS -> {
                    val watchAvailabilityStatus = addFirstMomoViewModel.watchAvailabilityStatus.value
                    Timber.i("EnterImeiFragment: Wearer linked successfully, watch status: $watchAvailabilityStatus")
                    CrashlyticsLog.log("Wearer linked successfully, watch status: $watchAvailabilityStatus")
                    
                    when(watchAvailabilityStatus) {
                        WatchAvailabilityStatus.SUCCESS -> {
                            Timber.i("EnterImeiFragment: Navigating to need tools fragment")
                            CrashlyticsLog.log("Navigating to need tools fragment")
                            hideProgressIndicator()
                            navigateById(R.id.action_enterImeiFragment_to_needToolsFragment)
                        }
                        WatchAvailabilityStatus.SUCCESS_WITH_SIM_PRE_INSERTED -> {
                            hideProgressIndicator()
                            if (addFirstMomoViewModel.getWearerModel() is Space3) {
                                Timber.i("EnterImeiFragment: Space3 model detected, navigating to power on device")
                                CrashlyticsLog.log("Space3 model detected, navigating to power on device")
                                navigateById(R.id.action_enterImeiFragment_to_powerOnDeviceFragment)
                            } else {
                                Timber.i("EnterImeiFragment: Non-Space3 model, navigating to first contact")
                                CrashlyticsLog.log("Non-Space3 model, navigating to first contact")
                                navigateById(R.id.action_enterImeiFragment_to_firstContactFragment)
                            }
                        }
                        else -> {
                            Timber.w("EnterImeiFragment: WatchAvailabilityStatus $watchAvailabilityStatus not handled for LINK_SUCCESS")
                            CrashlyticsLog.log("WatchAvailabilityStatus $watchAvailabilityStatus not handled for LINK_SUCCESS")
                        }
                    }
                }
                else -> {
                    Timber.w("EnterImeiFragment: WearerStatus $status not handled here")
                    CrashlyticsLog.log("WearerStatus $status not handled here")
                }
            }
        }
    }

    private fun showProgressIndicator() {
        Timber.d("EnterImeiFragment: Showing progress indicator")
        binding.buttonNext.visibility = View.INVISIBLE
        binding.buttonNext.isClickable = false
        binding.progressIndicator.visibility = View.VISIBLE
    }

    private fun hideProgressIndicator() {
        Timber.d("EnterImeiFragment: Hiding progress indicator")
        binding.buttonNext.visibility = View.VISIBLE
        binding.buttonNext.isClickable = true
        binding.progressIndicator.visibility = View.GONE
    }

    private fun showErrorDialog(title: String, description: String?) {
        Timber.d("EnterImeiFragment: Showing error dialog - $title: $description")
        CrashlyticsLog.log("Showing error dialog - $title: $description")
        val defaultErrorDialog = DefaultErrorDialog()
        defaultErrorDialog.arguments = bundleOf(
            "icon" to "",
            "title" to title,
            "description" to description,
        )
        defaultErrorDialog.show(childFragmentManager, title)
    }

    private fun launchBarcodeScanner() {
        Timber.d("EnterImeiFragment: Attempting to launch barcode scanner")
        CrashlyticsLog.log("Attempting to launch barcode scanner")
        if (isCameraPermissionGranted) {
            Timber.d("EnterImeiFragment: Camera permission already granted")
            CrashlyticsLog.log("Camera permission already granted")
            val intent = Intent(activity, BarcodeScanningActivity::class.java)
            intent.putExtra(Constants.EXTRA_ORIGIN_INTENT, "IMEI")
            startForResult.launch(intent)
        } else {
            Timber.d("EnterImeiFragment: Requesting camera permission")
            CrashlyticsLog.log("Requesting camera permission")
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }
}
