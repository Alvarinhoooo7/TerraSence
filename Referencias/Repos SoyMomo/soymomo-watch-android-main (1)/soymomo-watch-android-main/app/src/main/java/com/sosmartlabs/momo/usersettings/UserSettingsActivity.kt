package com.sosmartlabs.momo.usersettings

import android.app.ProgressDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.PopupMenu
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.sosmartlabs.momo.BuildConfig
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityUserSettingsBinding
import com.sosmartlabs.momo.usersettings.ui.UserSettingsViewModel
import com.sosmartlabs.momo.utils.support.*
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class UserSettingsActivity : AppCompatActivity() {
    private lateinit var binding: ActivityUserSettingsBinding
    private val viewModel: UserSettingsViewModel by viewModels()
    private lateinit var progressDialog: ProgressDialog
    private var appBarOriginalTopMargin = 0
    private var scrollViewOriginalBottomPadding = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("UserSettingsActivity: onCreate")
        CrashlyticsLog.log("UserSettingsActivity onCreate started")

        enableEdgeToEdge()
        binding = ActivityUserSettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()
        
        setupUI()
        observeViewModel()
        viewModel.loadSettingsApp()
    }

    private fun setupEdgeToEdge() {
        Timber.d("UserSettingsActivity: setupEdgeToEdge")

        // Store original values before applying insets
        val appBarParams = binding.appbar.layoutParams as androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
        appBarOriginalTopMargin = appBarParams.topMargin
        scrollViewOriginalBottomPadding = binding.scrollView.paddingBottom

        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("UserSettingsActivity: systemBars $systemBars")
            Timber.d("UserSettingsActivity: displayCutout $displayCutout")
            Timber.d("UserSettingsActivity: navigationBars $navigationBars")

            // Apply top insets to the AppBarLayout for status bar
            appBarParams.topMargin = appBarOriginalTopMargin + systemBars.top.coerceAtLeast(displayCutout.top)
            binding.appbar.layoutParams = appBarParams

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("UserSettingsActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to ScrollView for navigation bar
            binding.scrollView.setPadding(
                binding.scrollView.paddingLeft,
                binding.scrollView.paddingTop,
                binding.scrollView.paddingRight,
                scrollViewOriginalBottomPadding + bottomPadding
            )

            windowInsets
        }
    }

    private fun setupUI() {
        Timber.d("UserSettingsActivity: Setting up UI components")
        CrashlyticsLog.log("UserSettingsActivity setting up UI")
        
        setupToolbar()
        setupAppVersion()
        setupClickListeners()
    }

    private fun setupToolbar() {
        binding.toolbar.apply {
            setSupportActionBar(this)
            supportActionBar?.setDisplayHomeAsUpEnabled(true)
            supportActionBar?.setDisplayShowHomeEnabled(true)
            supportActionBar?.setDisplayShowTitleEnabled(true)
            setNavigationOnClickListener { finish() }
        }
    }

    private fun setupClickListeners() {
        with(binding) {
            measureSystemUnitLayout.setOnClickListener {
                PopupMenu(this@UserSettingsActivity, measureSystemUnitLayout).apply {
                    setOnMenuItemClickListener(onMeasureSystemListener)
                    inflate(R.menu.menu_measure_system)
                    show()
                }
            }

            notificationsLayout.setOnClickListener {
                openAppNotificationSettings()
            }

            faqLayout.setOnClickListener {
                ZendeskSupportLauncher.launchZendeskSupportLauncher(this@UserSettingsActivity)
            }

            contactUsLayout.setOnClickListener {
                ContactSupportLauncher.launchContactSupportLauncher(this@UserSettingsActivity)
            }

            chatWithUsLayout.setOnClickListener {
                WhatsappSupportLauncher.launchWhatsappSupportContact(this@UserSettingsActivity)
            }

            tcLayout.setOnClickListener {
                TermsAndConditionsLauncher.launchTermsAndConditionsLauncher(this@UserSettingsActivity)
            }

            privacyPolicyLayout.setOnClickListener {
                PrivacyPolicyLauncher.launchPrivacyPolicyLauncher(this@UserSettingsActivity)
            }
        }
    }

    private fun showProgress(messageRes: Int) {
        Timber.d("UserSettingsActivity: Showing progress dialog")
        progressDialog.setMessage(getString(messageRes))
        progressDialog.show()
    }

    private fun observeViewModel() {
        Timber.d("UserSettingsActivity: Setting up ViewModel observers")
        CrashlyticsLog.log("UserSettingsActivity setting up observers")
        
        progressDialog = ProgressDialog(this).apply {
            setCancelable(false)
        }

        viewModel.state.observe(this) { state ->
            Timber.d("UserSettingsActivity: State changed to $state")
            CrashlyticsLog.log("UserSettingsActivity state changed to $state")
            
            when (state) {
                UserSettingsViewModel.SettingsState.LOADING -> {
                    showProgress(R.string.loading)
                }
                UserSettingsViewModel.SettingsState.LOADING_SUCCESS -> {
                    progressDialog.dismiss()
                }
                UserSettingsViewModel.SettingsState.ERROR_LOADING -> {
                    progressDialog.dismiss()
                    Toast.makeText(
                        this, R.string.toast_error_could_not_load_settings, Toast.LENGTH_SHORT
                    ).show()
                }
                UserSettingsViewModel.SettingsState.SUCCESS_UPDATE -> {
                    progressDialog.dismiss()
                }
                UserSettingsViewModel.SettingsState.ERROR_UPDATE -> {
                    progressDialog.dismiss()
                }
                else -> {}
            }
        }

        viewModel.isImperialMeasureSystem.observe(this) { isImperial ->
            Timber.d("UserSettingsActivity: Measure system changed to imperial: $isImperial")
            CrashlyticsLog.log("UserSettingsActivity measure system changed to imperial: $isImperial")
            
            with(binding) {
                measureSystemUnit.setText(if (isImperial) R.string.imperial_system else R.string.metric_system)
                measureSystemDescription.setText(if (isImperial) R.string.settings_general_imperial_text else R.string.settings_general_metric_text)
            }
        }
    }

    override fun onPause() {
        super.onPause()
        Timber.d("UserSettingsActivity: onPause")
    }

    override fun onResume() {
        super.onResume()
        Timber.d("UserSettingsActivity: onResume - reloading settings")
        CrashlyticsLog.log("UserSettingsActivity reloading settings on resume")
        viewModel.loadSettingsApp()
    }

    private val onMeasureSystemListener = PopupMenu.OnMenuItemClickListener { item ->
        return@OnMenuItemClickListener when (item.itemId) {
            R.id.item_metric_menu -> {
                Timber.d("UserSettingsActivity: Switching to metric system")
                CrashlyticsLog.log("UserSettingsActivity switching to metric")
                binding.measureSystemUnit.text = getString(R.string.metric_system)
                binding.measureSystemDescription.text = getString(R.string.settings_general_metric_text)
                viewModel.changeMeasureSystem(false)
                true
            }
            R.id.item_imperial_menu -> {
                Timber.d("UserSettingsActivity: Switching to imperial system")
                CrashlyticsLog.log("UserSettingsActivity switching to imperial")
                binding.measureSystemUnit.text = getString(R.string.imperial_system)
                binding.measureSystemDescription.text = getString(R.string.settings_general_imperial_text)
                viewModel.changeMeasureSystem(true)
                true
            }
            else -> false
        }
    }

    private fun setupAppVersion() {
        Timber.d("UserSettingsActivity: Setting app version: ${BuildConfig.VERSION_NAME}")
        CrashlyticsLog.log("UserSettingsActivity setting version ${BuildConfig.VERSION_NAME}")
        binding.appVersion.text = getString(R.string.watch_info_version, BuildConfig.VERSION_NAME)
    }

    fun openAppNotificationSettings() {
        val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
            putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            startActivity(intent)
        } catch (e: ActivityNotFoundException) {
            val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", packageName, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(fallback)
        }
    }
}