package com.sosmartlabs.momotabletpadres.link

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.barcodescanner.BarcodeScanningActivity
import com.sosmartlabs.momotabletpadres.databinding.ActivityLinkDeviceBinding
import com.sosmartlabs.momotabletpadres.link.model.DeviceColor
import com.sosmartlabs.momotabletpadres.link.model.LinkDeviceStatus
import com.sosmartlabs.momotabletpadres.main.MainActivity
import com.sosmartlabs.momotabletpadres.tablet.model.TabletModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber
import kotlinx.coroutines.Job
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalCoroutinesApi::class)
@AndroidEntryPoint
class LinkDeviceActivity : AppCompatActivity() {

    companion object {
        /** Intent extra used by MainActivity to prefill the tablet-id input
         *  when the user arrived via the soymomo-tablet:// or
         *  https://soymomo.com/link/tablet/<id> deep link. */
        const val EXTRA_PREFILL_TABLET_ID = "extra_prefill_tablet_id"

        /** Tablet-id length at which the input auto-triggers a backend lookup.
         *  Parse object-ids are 10 chars today; LinkInvitationPrefs.TABLET_ID_REGEX
         *  accepts a wider range for future schema changes, so a prefilled id of a
         *  different length is verified explicitly (see applyPrefillTabletIdIfPresent). */
        private const val AUTO_VERIFY_TABLET_ID_LENGTH = 10
    }

    private lateinit var binding: ActivityLinkDeviceBinding

    private lateinit var startForResult: ActivityResultLauncher<Intent>
    private lateinit var requestCameraPermissionLauncher: ActivityResultLauncher<String>
    private lateinit var colorAdapter: LinkSelectDeviceColorAdapter

    private val linkDeviceViewModel: LinkDeviceViewModel by viewModels()

    private var debounceJob: Job? = null
    private val uiScope = MainScope()

    private var deviceModelName: String = ""

    private val deviceColorsMap by lazy {
        mapOf(
            TabletModel.PRO to listOf(
                DeviceColor("black", R.drawable.pro_v1_black),
                DeviceColor("blue", R.drawable.pro_v1_blue),
                DeviceColor("pink", R.drawable.pro_v1_pink)
            ),
            TabletModel.PRO_2 to listOf(
                DeviceColor("black", R.drawable.pro_v1_black),
                DeviceColor("blue", R.drawable.pro_v1_blue),
                DeviceColor("pink", R.drawable.pro_v1_pink)
            ),
            TabletModel.PRO_EU to listOf(
                DeviceColor("black", R.drawable.pro_v1_black),
                DeviceColor("blue", R.drawable.pro_v1_blue),
                DeviceColor("pink", R.drawable.pro_v1_pink)
            ),
            TabletModel.LITE to listOf(
                DeviceColor("blue", R.drawable.lite_v1_blue),
                DeviceColor("pink", R.drawable.lite_v1_pink),
            ),
            TabletModel.LITE_2 to listOf(
                DeviceColor("blue", R.drawable.lite_v1_blue),
                DeviceColor("pink", R.drawable.lite_v1_pink),
            ),
            TabletModel.LITE_3 to listOf(
                DeviceColor("blue", R.drawable.lite_v3_blue),
                DeviceColor("pink", R.drawable.lite_v3_pink),
            ),
            TabletModel.PHONE_1 to listOf(
                DeviceColor("black", R.drawable.momophone_v1_black),
                DeviceColor("green", R.drawable.momophone_v1_green),
                DeviceColor("red", R.drawable.momophone_v1_red)
            )
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        Timber.d("LinkDeviceActivity: onCreate()")

        binding = ActivityLinkDeviceBinding.inflate(layoutInflater)
        setContentView(binding.root)
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.nestedScrollView,
            includeImeBottom = true,
        )
        setupToolbar()
        setupColorSelection()
        setupActivityResultLaunchers()
        setupDataViews()
        observeViewModel()
        applyPrefillTabletIdIfPresent()
    }

    /**
     * If the activity was launched with EXTRA_PREFILL_TABLET_ID (set by
     * MainActivity when draining a deep-link invitation), populate the
     * device-id input field so the parent doesn't have to enter or scan
     * anything. The TextWatcher on this field debounces and kicks off
     * LinkDeviceViewModel verification automatically, but only at the canonical
     * [AUTO_VERIFY_TABLET_ID_LENGTH]. For a deep-link id the validator accepts
     * but whose length differs, we trigger the lookup here so the flow doesn't
     * stall on a prefilled-but-idle screen.
     */
    private fun applyPrefillTabletIdIfPresent() {
        val prefill = intent?.getStringExtra(EXTRA_PREFILL_TABLET_ID)?.takeIf { it.isNotBlank() }
            ?: return
        Timber.i("LinkDeviceActivity: Prefilling deviceIdTextInput with deep-link id=$prefill")
        binding.deviceIdTextInput.editText?.setText(prefill)
        // Guarded so the common 10-char case isn't looked up twice (the watcher
        // already handles it); other accepted lengths are verified explicitly.
        if (prefill.length != AUTO_VERIFY_TABLET_ID_LENGTH) {
            binding.root.hideKeyboard()
            linkDeviceViewModel.checkTabletStatus(prefill)
        }
    }

    private fun setupColorSelection() {
        colorAdapter = LinkSelectDeviceColorAdapter { color ->
            linkDeviceViewModel.setSelectedDeviceColor(color)
        }
        binding.deviceSelectColorRecyclerView.apply {
            adapter = colorAdapter
            layoutManager = LinearLayoutManager(this@LinkDeviceActivity, LinearLayoutManager.HORIZONTAL, false)
        }
    }

    private fun setupToolbar() {
        Timber.d("LinkDeviceActivity: Step 1: Setting up toolbar")
        val toolbar = binding.toolbar
        try {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
                setDisplayShowTitleEnabled(false)
            }
            Timber.d("LinkDeviceActivity: Step 2: Toolbar action bar configured")
            WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = false
            WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightNavigationBars = true
            toolbar.setNavigationOnClickListener {
                Timber.d("LinkDeviceActivity: Step 3: Navigation back clicked")
                supportFinishAfterTransition()
            }
            Timber.d("LinkDeviceActivity: Step 4: Toolbar setup completed")
        } catch (e: NullPointerException) {
            Timber.e(e, "LinkDeviceActivity: Error: Failed to setup toolbar")
            CrashlyticsLog.recordException(e, "LinkDeviceActivity: Toolbar setup failure")
        }
    }

    private fun setupActivityResultLaunchers() {
        Timber.d("LinkDeviceActivity: setupActivityResultLaunchers - Registering activity result launchers")
        startForResult = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            Timber.d("LinkDeviceActivity: startForResult - Activity result received: resultCode=${result.resultCode}")
            if (result.resultCode == Activity.RESULT_OK) {
                val qrCode = result.data?.getStringExtra(BarcodeScanningActivity.QR_CODE)
                if (!qrCode.isNullOrBlank()) {
                    Timber.d("LinkDeviceActivity: startForResult - QR code scanned: $qrCode")
                    binding.deviceIdTextInput.editText!!.setText(qrCode)
                } else {
                    Timber.e("LinkDeviceActivity: startForResult - QR code scan failed or empty")
                    CrashlyticsLog.log("LinkDeviceActivity: QR code scan failed or empty")
                    Toast.makeText(this, getString(R.string.link_tablet_failure), Toast.LENGTH_LONG).show()
                }
            } else {
                Timber.d("LinkDeviceActivity: startForResult - Activity result not OK")
            }
        }

        requestCameraPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            Timber.d("LinkDeviceActivity: requestCameraPermissionLauncher - Camera permission granted: $isGranted")
            if (isGranted) {
                Timber.d("LinkDeviceActivity: requestCameraPermissionLauncher - Permission granted, launching BarcodeScanningActivity")
                startForResult.launch(Intent(this, BarcodeScanningActivity::class.java))
            } else {
                Timber.e("LinkDeviceActivity: requestCameraPermissionLauncher - Camera permission denied")
                CrashlyticsLog.log("LinkDeviceActivity: Camera permission denied")
            }
        }
    }

    private fun observeViewModel() {
        Timber.d("LinkDeviceActivity: setupViewModel - Assigning CustomLinkListener to MainViewModel")

        linkDeviceViewModel.linkDeviceStatus.observe(this) { status ->
            Timber.d("LinkDeviceActivity: Tablet link status updated: $status")
            updateUiForStatus(status)
        }

        linkDeviceViewModel.currentTablet.observe(this) { tablet ->
            Timber.d("LinkDeviceActivity: Current tablet updated: $tablet")
            tablet?.let {
                // Set the device model in the corresponding strings
                deviceModelName = getModelName(it.model)
                binding.selectDeviceColorTitle.text = getString(R.string.link_device_step_2_text, deviceModelName)
                binding.linkDeviceTitle.text = getString(R.string.link_device_step_3_text, deviceModelName)
                binding.goToMainTitle.text = getString(R.string.link_device_step_end_text, deviceModelName)

                // Set the colors to choose in the adapter
                val colors = deviceColorsMap[it.model] ?: deviceColorsMap[TabletModel.PHONE_1]
                colorAdapter.submitList(colors)
            }
        }

        linkDeviceViewModel.selectedDeviceColor.observe(this) { color ->
            binding.linkButton.isEnabled = color != null
            if (color != null) {
                binding.linkButton.backgroundTintList = ContextCompat.getColorStateList(this@LinkDeviceActivity, R.color.colorSecondary)
                binding.linkSecondStepStatusCircle.setImageResource(R.drawable.ic_step_completed)
                binding.linkSecondStepStatusLine.background = ContextCompat.getDrawable(this@LinkDeviceActivity, R.color.colorAccent)
            } else {
                binding.linkButton.backgroundTintList = ContextCompat.getColorStateList(this@LinkDeviceActivity, R.color.not_available_button_color)
                binding.linkSecondStepStatusCircle.setImageResource(R.drawable.ic_step_missing)
                binding.linkSecondStepStatusLine.background = ContextCompat.getDrawable(this@LinkDeviceActivity, R.color.colorPrimary)
            }
        }
    }

    private fun updateUiForStatus(status: LinkDeviceStatus) {
        // Hide all conditional UI elements by default, then show based on state
        binding.searchProgressBar.visibility = View.GONE
        binding.linkingProgressBar.visibility = View.GONE
        binding.deviceIdTextInput.error = null

        if (status != LinkDeviceStatus.AWAITING_COLOR_SELECTION &&
            status != LinkDeviceStatus.READY_TO_LINK &&
            status != LinkDeviceStatus.LINKING_IN_PROGRESS &&
            status != LinkDeviceStatus.DEVICE_LINK_SUCCESS &&
            status != LinkDeviceStatus.DEVICE_BELONGS_TO_OTHER_USER) {
            hideAllStepsAfterFirst()
            binding.deviceIdTextInput.isEnabled = true
        }

        when (status) {
            LinkDeviceStatus.SEARCH_IN_PROGRESS -> {
                binding.searchProgressBar.visibility = View.VISIBLE
                binding.qrCodeScannerButton.visibility = View.INVISIBLE
            }
            LinkDeviceStatus.DEVICE_ALREADY_LINKED -> {
                binding.qrCodeScannerButton.visibility = View.VISIBLE
                binding.deviceIdTextInput.error = getString(R.string.link_device_error_already_linked)
            }
            LinkDeviceStatus.DEVICE_BELONGS_TO_OTHER_USER -> {
                showColorSelectionStep(isCompleted = true)
                binding.deviceIdTextInput.isEnabled = false
                binding.qrCodeScannerButton.visibility = View.INVISIBLE
                binding.linkThirdStepStatusCircle.visibility = View.VISIBLE
                binding.linkDeviceTitle.visibility = View.VISIBLE
                binding.linkButton.visibility = View.VISIBLE
                binding.linkButton.isEnabled = true
                binding.linkButton.backgroundTintList = ContextCompat.getColorStateList(this, R.color.colorSecondary)

                //Hide step 2
                binding.linkSecondStepStatusCircle.visibility = View.GONE
                binding.linkSecondStepStatusLine.visibility = View.GONE
                binding.selectDeviceColorTitle.visibility = View.GONE
                binding.deviceSelectColorRecyclerView.visibility = View.GONE

                //set text for this case
                binding.linkDeviceTitle.text = getString(R.string.link_device_step_3_text_other_user)
            }
            LinkDeviceStatus.AWAITING_COLOR_SELECTION -> {
                showColorSelectionStep(isCompleted = false)
                binding.deviceIdTextInput.isEnabled = false
                binding.qrCodeScannerButton.visibility = View.INVISIBLE
                binding.linkThirdStepStatusCircle.visibility = View.VISIBLE
                binding.linkButton.visibility = View.VISIBLE

                //Show step 2
                binding.linkSecondStepStatusCircle.visibility = View.VISIBLE
                binding.linkSecondStepStatusLine.visibility = View.VISIBLE
                binding.selectDeviceColorTitle.visibility = View.VISIBLE
                binding.deviceSelectColorRecyclerView.visibility = View.VISIBLE
            }
            LinkDeviceStatus.READY_TO_LINK -> {
                showColorSelectionStep(isCompleted = true)
                binding.deviceIdTextInput.isEnabled = false
                binding.qrCodeScannerButton.visibility = View.INVISIBLE
                binding.linkThirdStepStatusCircle.visibility = View.VISIBLE
                binding.linkDeviceTitle.visibility = View.VISIBLE
                binding.linkButton.visibility = View.VISIBLE
                binding.linkButton.isEnabled = true
                binding.linkButton.backgroundTintList = ContextCompat.getColorStateList(this, R.color.colorSecondary)
            }
            LinkDeviceStatus.LINKING_IN_PROGRESS -> {
                showColorSelectionStep(isCompleted = true)
                binding.deviceIdTextInput.isEnabled = false
                binding.qrCodeScannerButton.visibility = View.INVISIBLE
                binding.linkThirdStepStatusCircle.visibility = View.VISIBLE
                binding.linkButton.visibility = View.INVISIBLE
                binding.linkingProgressBar.visibility = View.VISIBLE
            }
            LinkDeviceStatus.DEVICE_LINK_SUCCESS -> {
                showColorSelectionStep(isCompleted = true)
                binding.deviceIdTextInput.isEnabled = false
                binding.qrCodeScannerButton.visibility = View.INVISIBLE

                binding.linkingProgressBar.visibility = View.GONE
                binding.linkButton.visibility = View.VISIBLE
                binding.linkButton.isEnabled = false
                binding.linkButton.text = getString(R.string.link_device_step_3_link_device_success)
                binding.linkButton.setIconResource(R.drawable.ic_check)
                binding.linkButton.backgroundTintList = ContextCompat.getColorStateList(this, R.color.colorSecondary)

                // Complete step 3
                binding.linkThirdStepStatusCircle.visibility = View.VISIBLE
                binding.linkThirdStepStatusCircle.setImageResource(R.drawable.ic_step_completed)
                binding.linkThirdStepStatusLine.visibility = View.VISIBLE
                binding.linkThirdStepStatusLine.background = ContextCompat.getDrawable(this, R.color.colorAccent)

                // Show step 4
                binding.goToMainTitle.visibility = View.VISIBLE
                binding.goToMainButton.visibility = View.VISIBLE
                binding.goToMainButton.isEnabled = true
                binding.goToMainButton.backgroundTintList = ContextCompat.getColorStateList(this, R.color.colorSecondary)
            }
            else -> { // Catches SEARCH_ERROR, DEVICE_NOT_FOUND, ERROR
                binding.deviceIdTextInput.editText?.setText("")
                binding.qrCodeScannerButton.visibility = View.VISIBLE
                binding.deviceIdTextInput.error = getString(R.string.link_device_error_not_found)
            }
        }
    }

    private fun hideAllStepsAfterFirst() {
        // Step 2
        binding.linkSecondStepStatusCircle.visibility = View.GONE
        binding.linkSecondStepStatusLine.visibility = View.GONE
        binding.selectDeviceColorTitle.visibility = View.GONE
        binding.deviceSelectColorRecyclerView.visibility = View.GONE

        // Step 3
        binding.linkThirdStepStatusCircle.visibility = View.GONE
        binding.linkThirdStepStatusLine.visibility = View.GONE
        binding.linkDeviceTitle.visibility = View.GONE
        binding.linkButton.visibility = View.GONE

        // Step 4
        binding.goToMainTitle.visibility = View.GONE
        binding.goToMainButton.visibility = View.GONE
    }

    private fun showColorSelectionStep(isCompleted: Boolean) {
        binding.linkFirstStepStatusCircle.setImageResource(R.drawable.ic_step_completed)
        binding.linkFirstStepStatusLine.background = ContextCompat.getDrawable(this, R.color.colorAccent)

        if (isCompleted) {
            binding.linkSecondStepStatusCircle.setImageResource(R.drawable.ic_step_completed)
            binding.linkSecondStepStatusLine.background = ContextCompat.getDrawable(this, R.color.colorAccent)
        } else {
            binding.linkSecondStepStatusCircle.setImageResource(R.drawable.ic_step_missing)
            binding.linkSecondStepStatusLine.background = ContextCompat.getDrawable(this, R.color.colorPrimary)
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun setupDataViews() {
        Timber.d("LinkDeviceActivity: setupDataViews - Setting up data views and listeners")
        binding.qrCodeScannerButton.setOnClickListener {
            Timber.d("LinkDeviceActivity: setupDataViews - qr code scanner button clicked")
            handleQrScan()
        }

        binding.linkButton.setOnClickListener {
            Timber.d("LinkDeviceActivity: setupDataViews - Link button clicked")
            binding.linkButton.isEnabled = false
            val imei = binding.deviceIdTextInput.editText!!.text.toString()
            val color = linkDeviceViewModel.selectedDeviceColor.value
            if (linkDeviceViewModel.linkDeviceStatus.value == LinkDeviceStatus.DEVICE_BELONGS_TO_OTHER_USER) {
                Timber.d("LinkDeviceActivity: setupDataViews - Attempting to link tablet with objectId: $imei")
                linkDeviceViewModel.linkTabletWithObjectId(imei, "")
                return@setOnClickListener
            }
            if (color == null) {
                Timber.e("LinkDeviceActivity: Link button clicked but no color selected")
                Toast.makeText(this, getString(R.string.link_device_error_select_color), Toast.LENGTH_SHORT).show()
                binding.linkButton.isEnabled = true
                return@setOnClickListener
            }
            Timber.d("LinkDeviceActivity: setupDataViews - Attempting to link tablet with objectId: $imei")
            linkDeviceViewModel.linkTabletWithObjectId(imei, color.id)
        }

        binding.goToMainButton.setOnClickListener {
            val intent = Intent(this@LinkDeviceActivity, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                // Land on the device the user just linked.
                linkDeviceViewModel.currentTablet.value?.objectId?.let {
                    putExtra(MainActivity.EXTRA_SELECT_TABLET_ID, it)
                }
            }
            startActivity(intent)
            finish()
        }

        binding.nestedScrollView.setOnTouchListener { _, _ ->
            binding.root.hideKeyboard()
            false
        }

        setDeviceIdEditTextListener()
    }

    private fun setDeviceIdEditTextListener() {
        Timber.d("LinkDeviceActivity: setDeviceIdEditTextListener - Adding text watcher to IMEI input")
        binding.deviceIdTextInput.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                // No-op
            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.deviceIdTextInput.isErrorEnabled) {
                    Timber.d("LinkDeviceActivity: setDeviceIdEditTextListener - Clearing error on DeviceId input")
                    binding.deviceIdTextInput.isErrorEnabled = false
                }
            }

            override fun afterTextChanged(editable: Editable) {
                Timber.d("LinkDeviceActivity: setDeviceIdEditTextListener - DeviceId input changed: $editable")
                debounceJob?.cancel()
                if (editable.length == AUTO_VERIFY_TABLET_ID_LENGTH) {
                    debounceJob = uiScope.launch {
                        delay(500L)
                        Timber.d("LinkDeviceActivity: setDeviceIdEditTextListener - Debounce triggered, checking tablet status")
                        binding.root.hideKeyboard()
                        linkDeviceViewModel.checkTabletStatus(binding.deviceIdTextInput.editText!!.text.toString())
                    }
                }
            }
        })
    }

    private fun handleQrScan() {
        Timber.d("LinkDeviceActivity: handleQrScan - Checking camera permission and launching scanner if granted")
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            Timber.d("LinkDeviceActivity: handleQrScan - Camera permission granted, launching BarcodeScanningActivity")
            startForResult.launch(Intent(this, BarcodeScanningActivity::class.java))
        } else {
            Timber.d("LinkDeviceActivity: handleQrScan - Camera permission not granted, requesting permission")
            requestCameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun getModelName(model: TabletModel?): String {
        return when (model) {
            TabletModel.LITE -> getString(R.string.lite_model_name)
            TabletModel.LITE_2 -> getString(R.string.lite_2_model_name)
            TabletModel.LITE_3 -> getString(R.string.lite_3_model_name)
            TabletModel.PRO, TabletModel.PRO_EU -> getString(R.string.pro_model_name)
            TabletModel.PRO_2 -> getString(R.string.pro_2_model_name)
            TabletModel.PHONE_1 -> getString(R.string.momophone_1_model_name)
            TabletModel.UNO -> getString(R.string.uno_model_name)
            else -> getString(R.string.unknown_model_name)
        }
    }

    private fun View.hideKeyboard() {
        val inputMethodManager = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        inputMethodManager.hideSoftInputFromWindow(windowToken, 0)
        clearFocus()
    }
}