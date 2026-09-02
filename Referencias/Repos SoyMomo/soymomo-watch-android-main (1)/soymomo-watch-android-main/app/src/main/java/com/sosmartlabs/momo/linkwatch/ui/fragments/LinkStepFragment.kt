package com.sosmartlabs.momo.linkwatch.ui.fragments

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
import android.view.inputmethod.EditorInfo
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momo.BuildConfig
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.model.WearerStatus
import com.sosmartlabs.momo.barcodescanner.BarcodeScanningActivity
import com.sosmartlabs.momo.databinding.LinkwatchFragmentLinkStepBinding
import com.sosmartlabs.momo.linkwatch.LinkWatchActivity
import com.sosmartlabs.momo.linkwatch.data.WearerColor
import com.sosmartlabs.momo.linkwatch.ui.LinkWatchViewModel
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.hideKeyboard
import com.sosmartlabs.momo.utils.support.ZendeskSupportLauncher
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class LinkStepFragment : Fragment() {

    private lateinit var binding: LinkwatchFragmentLinkStepBinding

    private val _linkWatchViewModel: LinkWatchViewModel by activityViewModels()

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.settings_app_link_soymomo_title)

    private val startForResult = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        if (it.resultCode == Activity.RESULT_OK) {
            val barcode = it.data!!.getStringExtra("barcode")
            if (!barcode.isNullOrBlank()) {
                with(binding.imeiTextinput.editText!!) {
                    setText(barcode)
                    _linkWatchViewModel.verifyImeiState(this.text.toString())
                }
            }
        }
    }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            val intent = Intent(activity, BarcodeScanningActivity::class.java)
            intent.putExtra(Constants.EXTRA_ORIGIN_INTENT, "IMEI")
            startForResult.launch(intent)
        } else {
            // Explain to the user that the feature is unavailable because the
            // features requires a permission that the user has denied. At the
            // same time, respect the user's decision. Don't link to system
            // settings in an effort to convince the user to change their
            // decision.
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = LinkwatchFragmentLinkStepBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        setupListeners()
        observeViewModel()
        prefillForm()
    }

    private fun setupToolbar() {
        Timber.d("setupToolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                if (activity is LinkWatchActivity) {
                    setDisplayShowTitleEnabled(true)
                    setDisplayHomeAsUpEnabled(true)
                    setDisplayShowHomeEnabled(true)
                }
            }
            window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
        }
    }

    private fun observeViewModel() {
        _linkWatchViewModel.wearerStatus.observe(viewLifecycleOwner) {
            Timber.d("Wearer Status: $it")
            when(it) {
                WearerStatus.SEARCH_IN_PROGRESS -> {
                    showProgressIndicator()
                }
                WearerStatus.WEARER_ERROR, WearerStatus.SEARCH_ERROR -> {
                    binding.linkStepViewflipper.displayedChild = 3
                    hideProgressIndicator()
                }
                WearerStatus.WEARER_NOT_LINKED -> {
                    binding.linkStepViewflipper.displayedChild = 1
                    selectWatchColorListener()
                    hideProgressIndicator()
                }
                WearerStatus.IMEI_INVALID, WearerStatus.IMEI_UNKNOWN -> {
                    binding.linkStepViewflipper.displayedChild = 2
                    hideProgressIndicator()
                }
                WearerStatus.WEARER_ALREADY_LINKED -> {
                    binding.linkStepViewflipper.displayedChild = 4
                    hideProgressIndicator()
                }
                WearerStatus.WEARER_BELONGS_TO_OTHER_USER -> {
                    eraseImeiFromTil()
                    navigateById(R.id.action_linkStepFragment_to_linkStepAskAdminFragment)
                    hideProgressIndicator()
                }
                else -> {
                    Timber.e(it.toString())
                    hideProgressIndicator()
                }
            }
        }
    }

    private fun showProgressIndicator() {
        binding.progressIndicator.visibility = View.VISIBLE
    }

    private fun hideProgressIndicator() {
        binding.progressIndicator.visibility = View.GONE
    }

    private fun setupListeners() {
        binding.root.setOnClickListener {
            it.hideKeyboard()
        }
        binding.linkButton.setOnClickListener {
            _linkWatchViewModel.incrementCompletedSteps("imei")
            navigateById(R.id.action_linkStepFragment_to_mainViewFragment)
        }

        binding.imeiTextinput.setEndIconOnClickListener {
            launchBarcodeScanner()
        }
        setImeiIdEditTextListener()

        binding.linkStepHintText.setOnClickListener {
            ZendeskSupportLauncher.launchZendeskSupportLauncher(requireContext())
        }
    }


    private fun prefillForm() {
        if (BuildConfig.DEBUG) {
            // binding.imeiTextinput.editText!!.setText("86499505009361")
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    private fun Context.hasPermission(permissionType: String): Boolean {
        return ContextCompat.checkSelfPermission(this, permissionType) ==
                PackageManager.PERMISSION_GRANTED
    }

    private val isCameraPermissionGranted
        get() = requireContext().hasPermission(Manifest.permission.CAMERA)

    private fun launchBarcodeScanner() {
        if (isCameraPermissionGranted) {
            val intent = Intent(activity, BarcodeScanningActivity::class.java)
            intent.putExtra(Constants.EXTRA_ORIGIN_INTENT, "IMEI")
            startForResult.launch(intent)
        } else {
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun setImeiIdEditTextListener() {
        binding.imeiTextinput.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                Timber.d("onText")
                if (binding.imeiTextinput.isErrorEnabled) binding.imeiTextinput.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {
                Timber.d("afterText")
                if (editable.length < 15) {
                    binding.linkStepViewflipper.displayedChild = 0
                } else {
                    _linkWatchViewModel.verifyImeiState(binding.imeiTextinput.editText!!.text.toString())
                }
            }
        })

        // DeviceId Detection.
        binding.imeiTextinput.editText?.setOnEditorActionListener { _, actionId, _ ->
            val editText = binding.imeiTextinput.editText
            if (actionId != EditorInfo.IME_ACTION_DONE || editText == null) {
                return@setOnEditorActionListener false
            }
            if (editText.text?.length == 10) {
                _linkWatchViewModel.verifyDeviceIdState(editText.text.toString())
            }
            return@setOnEditorActionListener true
        }
    }

    private fun selectWatchColorListener() {
        val cardMap = mapOf(
            binding.pinkWatchCard to WearerColor.PINK,
            binding.lightblueWatchCard to WearerColor.BLUE,
            binding.blackWatchCard to WearerColor.BLACK
        )

        cardMap.forEach { (card, color) ->
            card.setOnClickListener {
                _linkWatchViewModel.setWearerColor(color)
                cardMap.keys.forEach { it.isChecked = it == card }
                enableButton()
            }
        }
    }

    private fun enableButton(){
        binding.linkButton.isEnabled = true
        binding.linkButton.setBackgroundColor(ContextCompat.getColor(requireContext(), R.color.add_button_background))
        binding.linkButton.setTextColor(ContextCompat.getColor(requireContext(), R.color.white))
    }

    private fun eraseImeiFromTil(){
        _linkWatchViewModel.resetWearerStatus()
        binding.imeiTextinput.editText!!.setText("")
    }

}