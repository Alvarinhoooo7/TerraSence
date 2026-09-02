package com.sosmartlabs.momo.sim.ui.fragments.newsubscription

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.airbnb.lottie.LottieDrawable
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.AddFirstMomoActivity
import com.sosmartlabs.momo.barcodescanner.BarcodeScanningActivity
import com.sosmartlabs.momo.databinding.SubscriptionNewLinkSimFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.linkwatch.LinkWatchActivity
import com.sosmartlabs.momo.sim.SimActivity
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.testlab.TestLab
import com.sosmartlabs.momo.sim.model.SimStatus
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.hideKeyboard
import com.sosmartlabs.momo.utils.ui.DefaultErrorDialog
import timber.log.Timber
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import androidx.lifecycle.lifecycleScope
import java.util.concurrent.TimeUnit
import com.sosmartlabs.momo.sim.model.Sim
import com.sosmartlabs.momo.sim.ui.dialogs.PreInsertedSimDialog

class NewSubscriptionLinkSimFragment : Fragment() {

    private lateinit var binding: SubscriptionNewLinkSimFragmentBinding
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()
    private lateinit var startForResult: ActivityResultLauncher<Intent>
    private lateinit var requestPermissionLauncher: ActivityResultLauncher<String>
    private var iccIdDebounceJob: Job? = null
    private val iccIdDebouncePeriod: Long = TimeUnit.MILLISECONDS.toMillis(500)
    private var pendingInputMethod: String? = null

    val toolbar: Toolbar get() = binding.toolbar
    private val toolbarTitle: String get() = getString(R.string.subscription_new_link_sim_title)

    private fun Context.hasPermission(permissionType: String): Boolean {
        return ContextCompat.checkSelfPermission(this, permissionType) == PackageManager.PERMISSION_GRANTED
    }

    private val isCameraPermissionGranted get() = requireContext().hasPermission(Manifest.permission.CAMERA)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("NewSubscriptionLinkSimFragment: onCreate")
        CrashlyticsLog.log("NewSubscriptionLinkSimFragment: onCreate")
        
        newSubscriptionViewModel.getCurrentUser()
        setupActivityResultLaunchers()
    }

    private fun setupActivityResultLaunchers() {
        Timber.d("NewSubscriptionLinkSimFragment: Setting up activity result launchers")
        startForResult = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            Timber.d("NewSubscriptionLinkSimFragment: Barcode scan result received with code: ${result.resultCode}")
            if (result.resultCode == Activity.RESULT_OK) {
                val barcode = result.data?.getStringExtra("barcode")
                if (!barcode.isNullOrBlank()) {
                    Timber.d("NewSubscriptionLinkSimFragment: Valid barcode scanned")
                    CrashlyticsLog.log("NewSubscriptionLinkSimFragment: Valid barcode scanned")
                    pendingInputMethod = SimAnalytics.InputMethod.BARCODE
                    binding.tilIccId.editText?.setText(barcode)
                } else {
                    Timber.w("NewSubscriptionLinkSimFragment: Empty barcode received")
                    CrashlyticsLog.log("NewSubscriptionLinkSimFragment: Empty barcode received from scanner")
                }
            } else {
                Timber.w("NewSubscriptionLinkSimFragment: Scan cancelled or failed with result code: ${result.resultCode}")
                CrashlyticsLog.log("NewSubscriptionLinkSimFragment: Scan cancelled or failed")
            }
        }

        requestPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            Timber.d("NewSubscriptionLinkSimFragment: Camera permission result: $isGranted")
            if (isGranted) {
                Timber.d("NewSubscriptionLinkSimFragment: Camera permission granted, launching scanner")
                startForResult.launch(Intent(activity, BarcodeScanningActivity::class.java))
            } else {
                Timber.w("NewSubscriptionLinkSimFragment: Camera permission denied")
                CrashlyticsLog.log("NewSubscriptionLinkSimFragment: Camera permission denied")
            }
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("NewSubscriptionLinkSimFragment: onCreateView")
        binding = SubscriptionNewLinkSimFragmentBinding.inflate(inflater, container, false)
        setAnimation()
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("NewSubscriptionLinkSimFragment: onViewCreated")
        CrashlyticsLog.log("NewSubscriptionLinkSimFragment: onViewCreated")
        setupToolbar()
        setupListeners()
        observeViewModel()
        prefillForm()
        setupTestLabGesture()

        if (activity is SimActivity && binding.tilIccId.editText?.text.isNullOrBlank()) {
            newSubscriptionViewModel.checkPreInsertedSimForDialog()
        }
    }

    /** Debug builds only: long-press the header title to toggle the Test Lab skip-payment route. */
    private fun setupTestLabGesture() {
        if (!TestLab.isAvailable) return
        binding.headerTitle.setOnLongClickListener {
            val enabled = TestLab.toggleSkipPayment()
            android.widget.Toast.makeText(
                requireContext(),
                if (enabled) "Test Lab: skip payment ON" else "Test Lab: skip payment OFF",
                android.widget.Toast.LENGTH_SHORT
            ).show()
            true
        }
    }

    override fun onResume() {
        super.onResume()
        Timber.d("NewSubscriptionLinkSimFragment: onResume")
    }

    private fun setupToolbar() {
        Timber.d("NewSubscriptionLinkSimFragment: Setting up toolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                if (activity is SimActivity) {
                    Timber.d("NewSubscriptionLinkSimFragment: Configuring toolbar for SimActivity")
                    setDisplayShowTitleEnabled(true)
                    setDisplayHomeAsUpEnabled(true)
                    setDisplayShowHomeEnabled(true)
                }
            }
            window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
        }
    }

    private fun setAnimation() {
        Timber.d("NewSubscriptionLinkSimFragment: Setting up animation")
        with(binding.headerAnimation) {
            setAnimation(R.raw.enter_iccid)
            repeatCount = LottieDrawable.INFINITE
            playAnimation()
        }
    }

    @SuppressLint("SetTextI18n")
    private fun prefillForm() {
        Timber.d("NewSubscriptionLinkSimFragment: Prefilling form")
        arguments?.getString("prefilledIccId")?.let { iccId ->
            if (iccId.isNotBlank()) {
                Timber.d("NewSubscriptionLinkSimFragment: Prefilling with ICCID")
                CrashlyticsLog.log("NewSubscriptionLinkSimFragment: Prefilling with ICCID")
                pendingInputMethod = SimAnalytics.InputMethod.PREFILLED
                binding.tilIccId.editText?.setText(iccId)
            }
        }
    }

    private fun setupListeners() {
        Timber.d("NewSubscriptionLinkSimFragment: Setting up listeners")
        
        binding.parentLayout.setOnClickListener {
            Timber.d("NewSubscriptionLinkSimFragment: Parent layout clicked, hiding keyboard")
            it.hideKeyboard()
        }

        binding.buttonBind.setOnClickListener {
            Timber.d("NewSubscriptionLinkSimFragment: Bind button clicked")
            CrashlyticsLog.log("NewSubscriptionLinkSimFragment: Bind button clicked")
            when (activity) {
                is SimActivity -> {
                    Timber.d("NewSubscriptionLinkSimFragment: Navigating from SimActivity to choose plan")
                    navigateById(R.id.action_add_sim_newSubscriptionLinkSimFragment_to_newSubscriptionChoosePlanFragment)
                }
                is AddFirstMomoActivity -> {
                    Timber.d("NewSubscriptionLinkSimFragment: Navigating from AddFirstMomoActivity to choose plan")
                    navigateById(R.id.action_add_momo_newSubscriptionLinkSimFragment_to_newSubscriptionChoosePlanFragment)
                }
                is LinkWatchActivity -> {
                    Timber.d("NewSubscriptionLinkSimFragment: Navigating from LinkWatchActivity to choose plan")
                    navigateById(R.id.action_add_sim_newSubscriptionLinkSimFragment_to_newSubscriptionChoosePlanFragment)
                }
                else -> {
                    Timber.e("NewSubscriptionLinkSimFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                    CrashlyticsLog.log("NewSubscriptionLinkSimFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                }
            }
        }

        binding.tilIccId.setEndIconOnClickListener {
            Timber.d("NewSubscriptionLinkSimFragment: End icon clicked, launching barcode scanner")
            launchBarcodeScanner()
            binding.tilIccId.isErrorEnabled = false
        }

        binding.tilIccId.setErrorIconOnClickListener {
            Timber.d("NewSubscriptionLinkSimFragment: Error icon clicked, launching barcode scanner")
            launchBarcodeScanner()
            binding.tilIccId.isErrorEnabled = false
        }

        setIccIdEditTextListener()
    }

    private fun observeViewModel() {
        Timber.d("NewSubscriptionLinkSimFragment: Setting up ViewModel observers")
        
        newSubscriptionViewModel.simStatus.observe(viewLifecycleOwner) { status ->
            Timber.d("NewSubscriptionLinkSimFragment: SimStatus changed to $status")
            CrashlyticsLog.log("NewSubscriptionLinkSimFragment: SimStatus changed to $status")
            
            when (status) {
                SimStatus.DEFAULT -> {
                    Timber.d("NewSubscriptionLinkSimFragment: Processing DEFAULT status")
                    hideProgressIndicator()
                    hideValidSimViews()
                }
                SimStatus.SEARCHING -> {
                    Timber.d("NewSubscriptionLinkSimFragment: Processing SEARCHING status")
                    showProgressIndicator()
                    hideValidSimViews()
                }
                SimStatus.SIM_AVAILABLE -> {
                    Timber.d("NewSubscriptionLinkSimFragment: Processing SIM_AVAILABLE status")
                    hideProgressIndicator()
                    showValidSimViews()
                }
                SimStatus.ICC_ID_LENGTH -> {
                    Timber.d("NewSubscriptionLinkSimFragment: Processing ICC_ID_LENGTH status")
                    hideProgressIndicator()
                    hideValidSimViews()
                    with(binding.tilIccId) {
                        val textLength = editText?.text?.length ?: 0
                        Timber.d("NewSubscriptionLinkSimFragment: ICCID length: $textLength")
                        if (textLength >= 19) {
                            Timber.w("NewSubscriptionLinkSimFragment: ICCID too long")
                            showErrorText(R.string.subscription_new_link_sim_error_length)
                        } else {
                            isErrorEnabled = false
                        }
                    }
                }
                SimStatus.SIM_NOT_FOUND -> {
                    Timber.w("NewSubscriptionLinkSimFragment: Processing SIM_NOT_FOUND status")
                    hideValidSimViews()
                    hideProgressIndicator()
                    showErrorText(R.string.subscription_new_link_sim_error_not_found)
                    CrashlyticsLog.log("NewSubscriptionLinkSimFragment: SIM not found error")
                }
                SimStatus.SIM_ALREADY_IN_USE -> {
                    Timber.w("NewSubscriptionLinkSimFragment: Processing SIM_ALREADY_IN_USE status")
                    hideValidSimViews()
                    hideProgressIndicator()
                    showErrorText(R.string.subscription_new_link_sim_error_already_in_use)
                    CrashlyticsLog.log("NewSubscriptionLinkSimFragment: SIM already in use error")
                }
                SimStatus.SIM_RETIRED -> {
                    Timber.w("NewSubscriptionLinkSimFragment: Processing SIM_RETIRED status")
                    hideValidSimViews()
                    hideProgressIndicator()
                    showErrorText(R.string.subscription_new_link_sim_error_retired)
                    CrashlyticsLog.log("NewSubscriptionLinkSimFragment: SIM retired error")
                }
                SimStatus.ALAI -> {
                    Timber.w("NewSubscriptionLinkSimFragment: Processing ALAI status")
                    hideValidSimViews()
                    hideProgressIndicator()
                    showErrorDialog(getString(R.string.dialog_alai_sim_title), getString(R.string.dialog_alai_sim_description))
                    CrashlyticsLog.log("NewSubscriptionLinkSimFragment: ALAI SIM error")
                }
                else -> {
                    Timber.e("NewSubscriptionLinkSimFragment: Processing unknown status: $status")
                    hideValidSimViews()
                    hideProgressIndicator()
                    showErrorDialog(getString(R.string.subscription_new_link_sim_error_title), status.toString())
                    CrashlyticsLog.log("NewSubscriptionLinkSimFragment: Unknown SIM status error: $status")
                }
            }
        }

        newSubscriptionViewModel.currentSim.observe(viewLifecycleOwner) { sim ->
            if (sim != null) {
                Timber.d("NewSubscriptionLinkSimFragment: Current SIM updated for MNO: ${sim.mnoProvider.name}")
                CrashlyticsLog.log("NewSubscriptionLinkSimFragment: Current SIM updated for MNO: ${sim.mnoProvider.name}")
                
                Timber.d("NewSubscriptionLinkSimFragment: Fetching subscription plans for SIM")
                newSubscriptionViewModel.getSubscriptionPlansForSim(sim)
                
                val currentUser = newSubscriptionViewModel.currentUser.value
                if (currentUser != null) {
                    Timber.d("NewSubscriptionLinkSimFragment: Fetching subscription user info for country: ${sim.mnoProvider.country}")
                    newSubscriptionViewModel.getSubscriptionUserInfo(currentUser, sim.mnoProvider.country)
                } else {
                    Timber.e("NewSubscriptionLinkSimFragment: Current user is null when trying to get subscription info")
                    CrashlyticsLog.log("NewSubscriptionLinkSimFragment: Current user is null when trying to get subscription info")
                }
            }
        }

        newSubscriptionViewModel.preInsertedSimForDialog.observe(viewLifecycleOwner) { sim ->
            if (sim != null) {
                Timber.d("NewSubscriptionLinkSimFragment: Showing pre-inserted SIM dialog")
                showPreInsertedSimDialog(sim)
            }
        }
    }

    private fun launchBarcodeScanner() {
        Timber.d("NewSubscriptionLinkSimFragment: Launching barcode scanner")
        if (isCameraPermissionGranted) {
            Timber.d("NewSubscriptionLinkSimFragment: Camera permission already granted")
            val intent = Intent(activity?.applicationContext, BarcodeScanningActivity::class.java)
            intent.putExtra(Constants.EXTRA_ORIGIN_INTENT, "SIM")
            startForResult.launch(intent)
        } else {
            Timber.d("NewSubscriptionLinkSimFragment: Requesting camera permission")
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun showProgressIndicator() {
        Timber.d("NewSubscriptionLinkSimFragment: Showing progress indicator")
        binding.progressIndicator.visibility = View.VISIBLE
    }

    private fun hideProgressIndicator() {
        Timber.d("NewSubscriptionLinkSimFragment: Hiding progress indicator")
        binding.progressIndicator.visibility = View.GONE
    }

    private fun showValidSimViews() {
        Timber.d("NewSubscriptionLinkSimFragment: Showing valid SIM views")
        with(binding) {
            enterIccIdSelectPlan.visibility = View.VISIBLE
            buttonBind.isEnabled = true
        }
    }

    private fun hideValidSimViews() {
        Timber.d("NewSubscriptionLinkSimFragment: Hiding valid SIM views")
        with(binding) {
            enterIccIdSelectPlan.visibility = View.GONE
            buttonBind.isEnabled = false
        }
    }

    private fun showPreInsertedSimDialog(sim: Sim) {
        val dialog = PreInsertedSimDialog.newInstance(sim)
        dialog.show(childFragmentManager, "PreinstalledSimDialog")
    }

    private fun showErrorDialog(title: String, description: String?) {
        Timber.w("NewSubscriptionLinkSimFragment: Showing error dialog")
        CrashlyticsLog.log("NewSubscriptionLinkSimFragment: Showing error dialog")
        val defaultErrorDialog = DefaultErrorDialog()
        defaultErrorDialog.arguments = bundleOf(
            "icon" to "",
            "title" to title,
            "description" to description,
        )
        defaultErrorDialog.show(childFragmentManager, title)
    }

    private fun showErrorText(textId: Int) {
        Timber.w("NewSubscriptionLinkSimFragment: Showing error text: ${getString(textId)}")
        with(binding.tilIccId) {
            isErrorEnabled = true
            error = getString(textId)
        }
    }

    private fun setIccIdEditTextListener() {
        Timber.d("NewSubscriptionLinkSimFragment: Setting up ICCID edit text listener")
        binding.tilIccId.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                // No action needed
            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                Timber.d("NewSubscriptionLinkSimFragment: ICCID text changed: ${charSequence.length} chars")
                if (binding.tilIccId.isErrorEnabled) {
                    Timber.d("NewSubscriptionLinkSimFragment: Clearing previous error state")
                    binding.tilIccId.isErrorEnabled = false
                }
                iccIdDebounceJob?.cancel()
                iccIdDebounceJob = viewLifecycleOwner.lifecycleScope.launch {
                    delay(iccIdDebouncePeriod)
                    val inputMethod = pendingInputMethod ?: SimAnalytics.InputMethod.MANUAL
                    pendingInputMethod = null
                    newSubscriptionViewModel.getSim(charSequence.toString(), inputMethod)
                }
            }

            override fun afterTextChanged(editable: Editable) {
                // No action needed
            }
        })
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("NewSubscriptionLinkSimFragment: Navigating to destination ID: $navId")
        CrashlyticsLog.log("NewSubscriptionLinkSimFragment: Navigating to destination ID: $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        Timber.d("NewSubscriptionLinkSimFragment: onDestroyView")
        iccIdDebounceJob?.cancel()
        iccIdDebounceJob = null
    }

    override fun onPause() {
        super.onPause()
        Timber.d("NewSubscriptionLinkSimFragment: onPause")
        CrashlyticsLog.log("NewSubscriptionLinkSimFragment: onPause, resetting SIM status")
        newSubscriptionViewModel.resetSimStatus()
        newSubscriptionViewModel.resetPreInsertedSimDialogState()
    }
}
