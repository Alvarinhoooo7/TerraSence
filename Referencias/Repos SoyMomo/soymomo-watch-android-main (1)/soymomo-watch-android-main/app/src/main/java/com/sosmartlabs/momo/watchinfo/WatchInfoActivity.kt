package com.sosmartlabs.momo.watchinfo

import android.annotation.SuppressLint
import android.app.ProgressDialog
import android.os.Build
import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.snackbar.Snackbar
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityWatchInfoBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarNavigationType
import com.sosmartlabs.momo.watchinfo.ui.PackageInfoAdapter
import com.sosmartlabs.momo.watchinfo.ui.WatchInfoViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.*
import javax.inject.Inject

/**
 * Activity for showing watch information
 */
@AndroidEntryPoint
class WatchInfoActivity : AppCompatActivity() {
    @Inject lateinit var toolbarConstructor: ToolbarConstructor

    /**
     * Wearer for showing the info
     */
    private lateinit var watch: Wearer

    /**
     * ViewBinding for this activity
     */
    private lateinit var binding: ActivityWatchInfoBinding

    /**
     * ViewModel for this activity
     */
    private val viewModel: WatchInfoViewModel by viewModels()

    /**
     * Progress dialog for showing progress
     */
    private lateinit var progressDialog: ProgressDialog

    /**
     * Adapter for showing PackageInfo data in a RecyclerView
     */
    private lateinit var packageInfoAdapter: PackageInfoAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        Timber.d("WatchInfoActivity: onCreate started")
        
        binding = ActivityWatchInfoBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (!intent.hasExtra(Constants.EXTRA_WATCH)) {
            Timber.e("WatchInfoActivity: No watch data provided in intent extras")
            CrashlyticsLog.log("WatchInfoActivity launched without watch data")
            finish()
            return
        }
        
        watch = intent.getParcelableExtra(Constants.EXTRA_WATCH)!!
        Timber.d("WatchInfoActivity: Displaying info for watch ${watch.objectId} (${watch.shortModelName()})")
        
        progressDialog = ProgressDialog(this)

        toolbarConstructor
            .setNavigationOnClick(ToolbarNavigationType.SUPPORT_FINISH_AFTER_TRANSITION)
            .setDisplayShowHome(true)
            .setTitle(R.string.watch_info_activity_title)
            .setErrorName("WatchInfoActivity")
            .build()
        Timber.d("WatchInfoActivity: Toolbar configured")

        setupEdgeToEdge()
        initUi()
        observeViewModel()
        Timber.d("WatchInfoActivity: Setup completed")
    }

    private fun initUi() {
        Timber.d("WatchInfoActivity: Initializing UI components")
        binding.watchDeviceId.text = getString(R.string.watch_info_device_id, watch.deviceId)
        binding.watchModelVersion.text = getString(R.string.watch_info_version, watch.shortModelName())
        binding.imageViewWatch.setImageResource(viewModel.getWatchBlueprint(watch))
        initRecyclerView()
        Timber.d("WatchInfoActivity: UI initialization completed")
    }

    /**
     * Initializes the RecyclerView for showing PackageInfo data when available
     */
    private fun initRecyclerView() {
        Timber.d("WatchInfoActivity: Setting up RecyclerView for package info")
        packageInfoAdapter = PackageInfoAdapter(showLastUpdated = watch.isSpace3OrNewer())
        binding.appsList.apply {
            adapter = packageInfoAdapter
            layoutManager = LinearLayoutManager(this@WatchInfoActivity)
        }
    }

    /**
     * Observes the viewModel for this activity
     */
    private fun observeViewModel() {
        Timber.d("WatchInfoActivity: Setting up ViewModel observers")
        
        viewModel.buildInfo.observe(this) { resource ->
            Timber.d("WatchInfoActivity: Build info update received with status: ${resource.status}")
            when(resource.status) {
                Resource.Status.LOAD_SUCCESS -> {
                    val buildInfo = resource.data!!           
                    val compilationNumber = when {
                        !buildInfo.incremental.isNullOrEmpty() -> buildInfo.incremental
                        !buildInfo.buildNumber.isNullOrEmpty() -> buildInfo.buildNumber
                        else -> ""
                    }
                    binding.watchCompilationNumber.text = getString(R.string.watch_info_compilation_number, compilationNumber)
                }
                Resource.Status.LOAD_ERROR -> {
                    Timber.e("WatchInfoActivity: Failed to load build info")
                    CrashlyticsLog.log("WatchInfoActivity: Failed to load build info for watch ${watch.objectId}")
                    showSnackbar(R.string.watch_info_loading_build_error)
                    binding.watchCompilationNumber.text = getString(R.string.watch_info_compilation_number, "")
                    packageInfoAdapter.submitList(emptyList())
                    progressDialog.dismiss()
                }
                else -> {
                    Timber.d("WatchInfoActivity: Unhandled build info status: ${resource.status}")
                }
            }
        }
        
        viewModel.appsInfo.observe(this) { resource ->
            Timber.d("WatchInfoActivity: Apps info update received with status: ${resource.status}")
            when(resource.status) {
                Resource.Status.LOADING -> {
                    Timber.d("WatchInfoActivity: Loading apps info, showing progress dialog")
                    progressDialog.apply {
                        setMessage(getString(R.string.watch_info_activity_loading))
                        show()
                    }
                }
                Resource.Status.LOAD_SUCCESS -> {
                    val appsInfo = resource.data
                    Timber.d("WatchInfoActivity: Apps info loaded successfully with ${appsInfo?.size ?: 0} items")
                    packageInfoAdapter.submitList(appsInfo)
                    progressDialog.dismiss()
                }
                Resource.Status.LOAD_ERROR -> {
                    Timber.e("WatchInfoActivity: Failed to load apps info")
                    CrashlyticsLog.log("WatchInfoActivity: Failed to load apps info for watch ${watch.objectId}")
                    progressDialog.dismiss()
                    showSnackbar(R.string.watch_info_loading_apps_error)
                }
                else -> {
                    Timber.d("WatchInfoActivity: Unhandled apps info status: ${resource.status}")
                }
            }
        }
        
        Timber.d("WatchInfoActivity: ViewModel observers setup completed")
    }

    override fun onResume() {
        super.onResume()
        Timber.d("WatchInfoActivity: onResume called, loading watch info")
        val language = Locale.getDefault().language
        Timber.d("WatchInfoActivity: Loading watch info for ${watch.objectId} with language: $language")
        viewModel.loadWatchInfo(watch, language)
    }

    private fun setupEdgeToEdge() {
        Timber.d("WatchInfoActivity: setupEdgeToEdge")

        // Set dark status bar appearance (colorPrimary is dark purple)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.container) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("WatchInfoActivity: systemBars $systemBars")
            Timber.d("WatchInfoActivity: displayCutout $displayCutout")
            Timber.d("WatchInfoActivity: navigationBars $navigationBars")

            // Apply top padding to AppBarLayout to extend colorPrimary background into status bar area
            binding.contentAppBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.contentAppBar.paddingBottom
            )

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("WatchInfoActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to NestedScrollView for navigation bar
            // Find the NestedScrollView (it's a child of the CoordinatorLayout)
            val nestedScrollView = binding.container.getChildAt(1) as? androidx.core.widget.NestedScrollView
            nestedScrollView?.setPadding(
                nestedScrollView.paddingLeft,
                nestedScrollView.paddingTop,
                nestedScrollView.paddingRight,
                bottomPadding
            )

            windowInsets
        }
    }

    /**
     * Shows a Snackbar to the user.
     * @param messageId String id for the message to show
     */
    private fun showSnackbar(messageId: Int) {
        Timber.d("WatchInfoActivity: Showing snackbar with message ID: $messageId")
        Snackbar.make(binding.container, messageId, Snackbar.LENGTH_LONG).apply {
            view.setBackgroundColor(ContextCompat.getColor(this@WatchInfoActivity, R.color.colorPrimary))
            show()
        }
    }
}