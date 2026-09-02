package com.sosmartlabs.momo.sim.ui.fragments.transfer

import android.Manifest
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
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.barcodescanner.BarcodeScanningActivity
import com.sosmartlabs.momo.databinding.SubscriptionTransferToSimBinding
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.sim.model.SimStatus
import com.sosmartlabs.momo.sim.model.TransferSubscriptionStatus
import com.sosmartlabs.momo.sim.ui.TransferSubscriptionViewModel
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.hideKeyboard
import com.sosmartlabs.momo.utils.ui.DefaultErrorDialog
import timber.log.Timber

class SubscriptionTransferNewSimFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionTransferToSimBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.subscription_transfer_to_new_sim_title)

    /**
     * ViewModel
     */
    private val transferSubscriptionViewModel: TransferSubscriptionViewModel by activityViewModels()

    /**
     * Start a scanning Activity and listen for result
     */
    private lateinit var startForResult: ActivityResultLauncher<Intent>

    /**
     * Request permissions
     */
    private lateinit var requestPermissionLauncher: ActivityResultLauncher<String>
    private var pendingInputMethod: String? = null

    /**
     * Extension function to context to check permission easier
     */
    private fun Context.hasPermission(permissionType: String): Boolean {
        return ContextCompat.checkSelfPermission(this, permissionType) ==
                PackageManager.PERMISSION_GRANTED
    }

    /**
     * Has Camera Permission
     */
    private val isCameraPermissionGranted
        get() = requireContext().hasPermission(Manifest.permission.CAMERA)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startForResult = registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) {
            if (it.resultCode == Activity.RESULT_OK) {
                val barcode = it.data!!.getStringExtra("barcode")
                if (!barcode.isNullOrBlank()) {
                    with(binding.tilIccId.editText!!) {
                        pendingInputMethod = SimAnalytics.InputMethod.BARCODE
                        setText(barcode)
                    }
                }
            }
        }

        requestPermissionLauncher = registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { isGranted: Boolean ->
            if (isGranted) {
                startForResult.launch(Intent(activity, BarcodeScanningActivity::class.java))
            }
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = SubscriptionTransferToSimBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        observeViewModel()
        setupListeners()
    }

    override fun onPause() {
        super.onPause()
        transferSubscriptionViewModel.resetNewSimStatus()
    }

    private fun setupToolbar() {
        Timber.d("setupToolbar")
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

    private fun observeViewModel() {
        transferSubscriptionViewModel.newSimStatus.observe(viewLifecycleOwner) {
            Timber.d("simStatus is $it")
            when (it) {
                SimStatus.DEFAULT -> {
                    binding.searchSimProgressIndicator.visibility = View.GONE
                    binding.buttonTransfer.isEnabled = false
                    binding.transferToNewSimExplanation.visibility = View.GONE
                }
                SimStatus.SEARCHING -> {
                    binding.searchSimProgressIndicator.visibility = View.VISIBLE
                    binding.buttonTransfer.isEnabled = false
                    binding.transferToNewSimExplanation.visibility = View.GONE
                }
                SimStatus.SIM_AVAILABLE -> {
                    binding.searchSimProgressIndicator.visibility = View.GONE
                    binding.buttonTransfer.isEnabled = true
                    binding.transferToNewSimExplanation.visibility = View.VISIBLE
                }
                SimStatus.ICC_ID_LENGTH -> {
                    binding.searchSimProgressIndicator.visibility = View.GONE
                    binding.buttonTransfer.isEnabled = false
                    binding.transferToNewSimExplanation.visibility = View.GONE
                    with(binding.tilIccId) {
                        if (editText?.text?.length!! >= 19) {
                            showErrorText(R.string.subscription_new_link_sim_error_length)
                        }

                        else isErrorEnabled = false
                    }
                }
                SimStatus.SIM_NOT_FOUND -> {
                    binding.searchSimProgressIndicator.visibility = View.GONE
                    binding.buttonTransfer.isEnabled = false
                    binding.transferToNewSimExplanation.visibility = View.GONE
                    showErrorText(R.string.subscription_new_link_sim_error_not_found)
                }
                SimStatus.SIM_ALREADY_IN_USE -> {
                    binding.searchSimProgressIndicator.visibility = View.GONE
                    binding.buttonTransfer.isEnabled = false
                    binding.transferToNewSimExplanation.visibility = View.GONE
                    showErrorText(R.string.subscription_new_link_sim_error_already_in_use)
                }
                SimStatus.SIM_RETIRED -> {
                    binding.searchSimProgressIndicator.visibility = View.GONE
                    binding.buttonTransfer.isEnabled = false
                    binding.transferToNewSimExplanation.visibility = View.GONE
                    showErrorText(R.string.subscription_new_link_sim_error_retired)
                }
                else -> {
                    binding.searchSimProgressIndicator.visibility = View.GONE
                    binding.buttonTransfer.isEnabled = false
                    binding.transferToNewSimExplanation.visibility = View.GONE
                    showErrorDialog(getString(R.string.subscription_new_link_sim_error_title), it.toString())
                }
            }
        }

        transferSubscriptionViewModel.newTransferSubscriptionStatus.observe(viewLifecycleOwner) {
            Timber.d("newTransferSubscriptionStatus is $it")
            when (it) {
                TransferSubscriptionStatus.TRANSFER_ERROR -> {
                    binding.buttonTransfer.visibility = View.VISIBLE
                    binding.buttonTransfer.isEnabled = true
                    binding.transferProgressIndicator.visibility = View.GONE
                    if (!it.message.isNullOrEmpty()) {
                        showErrorDialog(getString(R.string.subscription_transfer_to_new_sim_error_title), it.message)
                    }
                }
                TransferSubscriptionStatus.TRANSFER_IN_PROGRESS -> {
                    binding.buttonTransfer.visibility = View.INVISIBLE
                    binding.buttonTransfer.isEnabled = false
                    binding.transferProgressIndicator.visibility = View.VISIBLE
                }
                TransferSubscriptionStatus.TRANSFER_SUCCESS -> {
                    binding.buttonTransfer.visibility = View.VISIBLE
                    binding.buttonTransfer.isEnabled = true
                    binding.transferProgressIndicator.visibility = View.GONE
                    navigateById(R.id.action_subscriptionTransferNewSimFragment_to_subscriptionTransferNewSimSuccessFragment)
                }
                else -> {
                    binding.buttonTransfer.visibility = View.VISIBLE
                    binding.buttonTransfer.isEnabled = true
                    binding.transferProgressIndicator.visibility = View.GONE
                }
            }
        }
    }

    private fun setupListeners() {
        binding.parentLayout.setOnClickListener {
            it.hideKeyboard()
        }

        binding.buttonTransfer.setOnClickListener {
            transferSubscriptionViewModel.transferSubscriptionToNewSim()
        }

        binding.tilIccId.setEndIconOnClickListener {
            launchBarcodeScanner()
            binding.tilIccId.isErrorEnabled = false
        }

        binding.tilIccId.setErrorIconOnClickListener {
            launchBarcodeScanner()
            binding.tilIccId.isErrorEnabled = false
        }

        setIccIdEditTextListener()
    }

    private fun launchBarcodeScanner() {
        if (isCameraPermissionGranted) {
            val intent = Intent(activity?.applicationContext, BarcodeScanningActivity::class.java)
            intent.putExtra(Constants.EXTRA_ORIGIN_INTENT, "SIM")
            startForResult.launch(intent)
        } else {
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun showErrorDialog(title: String, description: String?) {
        val defaultErrorDialog = DefaultErrorDialog()
        defaultErrorDialog.arguments = bundleOf(
            "icon" to "",
            "title" to title,
            "description" to description,
        )
        defaultErrorDialog.show(childFragmentManager, title)
    }

    private fun showErrorText(textId: Int) {
        with(binding.tilIccId) {
            isErrorEnabled = true
            error = getString(textId)
        }
    }

    private fun setIccIdEditTextListener() {
        binding.tilIccId.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilIccId.isErrorEnabled) binding.tilIccId.isErrorEnabled = false
                val inputMethod = pendingInputMethod ?: SimAnalytics.InputMethod.MANUAL
                pendingInputMethod = null
                transferSubscriptionViewModel.getSim(charSequence.toString(), inputMethod)
            }

            override fun afterTextChanged(editable: Editable) {

            }
        })
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {

    }
}
