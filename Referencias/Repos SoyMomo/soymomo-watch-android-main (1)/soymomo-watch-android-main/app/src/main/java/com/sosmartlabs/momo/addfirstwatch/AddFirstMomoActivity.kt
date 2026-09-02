package com.sosmartlabs.momo.addfirstwatch

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.view.View
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.model.WearerStatus
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.databinding.ActivityAddFirstMomoBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.main.MainActivity
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class AddFirstMomoActivity: AppCompatActivity() {

    private lateinit var binding: ActivityAddFirstMomoBinding
    private val addFirstMomoViewModel: AddFirstMomoViewModel by viewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by viewModels()
    private var progressBarOriginalTopMargin = 0

    companion object {
        /** Intent extra used by MainActivity to prefill the device-id input
         *  when the user arrived via the soymomo-watch:// or
         *  https://soymomo.com/link/watch/<id> deep link. Read by
         *  EnterImeiFragment (the nav-graph start destination). */
        const val EXTRA_PREFILL_DEVICE_ID = "extra_prefill_device_id"
    }

    private val firstInteractionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Timber.d("AddFirstMomoActivity: Received first interaction broadcast")
            CrashlyticsLog.log("AddFirstMomoActivity: Received first interaction broadcast")
            addFirstMomoViewModel.refreshCurrentWearer()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Capture before EnterImeiFragment consumes the extra in onViewCreated.
        val launchedFromDeepLink = intent.hasExtra(EXTRA_PREFILL_DEVICE_ID)
        Timber.d("AddFirstMomoActivity: onCreate() started")
        CrashlyticsLog.log("AddFirstMomoActivity: Starting activity creation")

        enableEdgeToEdge()
        binding = ActivityAddFirstMomoBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()
        setupDeepLinkBackButton(launchedFromDeepLink)
        setViewModel()
        observeViewModel()
        
        ContextCompat.registerReceiver(
            this,
            firstInteractionReceiver,
            IntentFilter(Constants.ACTION_FIRST_INTERACTION),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
        Timber.d("AddFirstMomoActivity: First interaction receiver registered")
        CrashlyticsLog.log("AddFirstMomoActivity: Activity creation completed")
    }

    override fun onDestroy() {
        super.onDestroy()
        Timber.d("AddFirstMomoActivity: onDestroy() called")
        CrashlyticsLog.log("AddFirstMomoActivity: Destroying activity")
        unregisterReceiver(firstInteractionReceiver)
    }

    /**
     * The add-watch onboarding is a forward-only wizard with no back chrome.
     * When opened from a share deep link the receiver needs an explicit way
     * out, so show a back button that finishes back to MainActivity (which
     * launched this activity while draining the parked invitation).
     */
    private fun setupDeepLinkBackButton(launchedFromDeepLink: Boolean) {
        if (!launchedFromDeepLink) return
        binding.buttonBack.visibility = View.VISIBLE
        binding.buttonBack.setOnClickListener {
            Timber.d("AddFirstMomoActivity: deep-link back pressed, returning to Main")
            // Go to Main explicitly rather than relying on the back stack: a
            // deep-link cold start may have a shallow task where plain back/
            // finish would drop the user to the launcher. Main is singleTask,
            // so this brings the existing instance forward and clears the wizard.
            startActivity(
                Intent(this, MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            )
            finish()
        }
    }

    private fun setViewModel() {
        Timber.d("AddFirstMomoActivity: Setting up ViewModel")
        CrashlyticsLog.log("AddFirstMomoActivity: Initializing ViewModel")
        addFirstMomoViewModel.trackAddWatchStarted()
        newSubscriptionViewModel.setAddWatchAnalyticsContext(addFirstMomoViewModel.addWatchFlowId)
        addFirstMomoViewModel.setCurrentCountry(this)
    }

    fun observeViewModel() {
        Timber.d("AddFirstMomoActivity: Setting up ViewModel observers")
        CrashlyticsLog.log("AddFirstMomoActivity: Setting up ViewModel observers")

        addFirstMomoViewModel.currentProgressStep.observe(this) {
            Timber.d("AddFirstMomoActivity: Progress step changed to $it")
            setProgressBarView(it)
        }

        addFirstMomoViewModel.wearerStatus.observe(this) { status ->
            Timber.d("AddFirstMomoActivity: Wearer status changed to $status")
            CrashlyticsLog.log("AddFirstMomoActivity: Wearer status changed to $status")
            when (status) {
                WearerStatus.LINK_SUCCESS -> {
                    addFirstMomoViewModel.getUserLastLocation(applicationContext)
                }
                else -> {
                    // NO-OP
                }
            }
        }

        addFirstMomoViewModel.userLastLocation.observe(this) { location ->
            Timber.d("AddFirstMomoActivity: User location updated")
            CrashlyticsLog.log("AddFirstMomoActivity: User location updated")
            addFirstMomoViewModel.setInitialWatchLocation(location)
        }

        addFirstMomoViewModel.currentCountry.observe(this) { country ->
            Timber.d("AddFirstMomoActivity: Current country changed to $country")
            CrashlyticsLog.log("AddFirstMomoActivity: Current country updated to $country")
            addFirstMomoViewModel.getMobileNetworkOperatorByCountry(country)
        }

        addFirstMomoViewModel.currentWearer.observe(this) { currentWearer ->
            Timber.d("AddFirstMomoActivity: Current wearer updated")
            CrashlyticsLog.log("AddFirstMomoActivity: Current wearer updated")
            currentWearer?.let {
                newSubscriptionViewModel.setCurrentWearer(it)
            }
        }
    }

    private fun setProgressBarView(step: Int) {
        Timber.d("AddFirstMomoActivity: Setting progress bar to step $step")
        val resourceId = when (step) {
            -1 -> 0
            0 -> R.drawable.progress_1
            1 -> R.drawable.progress_2
            2 -> R.drawable.progress_3
            3 -> R.drawable.progress_4
            4 -> R.drawable.progress_5
            5 -> 0
            else -> 0
        }
        binding.progressBar.setImageResource(resourceId)
    }

    private fun setupEdgeToEdge() {
        Timber.d("AddFirstMomoActivity: setupEdgeToEdge")

        // Store original values before applying insets
        val progressBarParams = binding.progressBar.layoutParams as androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
        progressBarOriginalTopMargin = progressBarParams.topMargin

        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime())

            Timber.d("AddFirstMomoActivity: systemBars $systemBars")
            Timber.d("AddFirstMomoActivity: displayCutout $displayCutout")
            Timber.d("AddFirstMomoActivity: navigationBars $navigationBars")
            Timber.d("AddFirstMomoActivity: ime $ime")

            val topInset = systemBars.top.coerceAtLeast(displayCutout.top)

            // Apply top insets to the progress bar for status bar
            progressBarParams.topMargin = progressBarOriginalTopMargin + topInset
            binding.progressBar.layoutParams = progressBarParams

            // Apply top padding to NavHostFragment for status bar (below progress bar)
            binding.navHostFragmentAddFirstMomo.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                0, // No top padding needed since progress bar handles top spacing
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.navHostFragmentAddFirstMomo.paddingBottom
            )

            // Handle bottom insets: combine navigation bars and IME (keyboard)
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            
            // Calculate bottom padding considering both navigation bar and keyboard
            val navigationBarPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }
            
            // IME inset represents the keyboard height
            val keyboardPadding = ime.bottom
            
            // Use the larger of keyboard or navigation bar
            val bottomPadding = keyboardPadding.coerceAtLeast(navigationBarPadding)

            Timber.d("AddFirstMomoActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, navigationBarPadding $navigationBarPadding")
            Timber.d("AddFirstMomoActivity: keyboardPadding $keyboardPadding, bottomPadding $bottomPadding")

            // Apply bottom padding to NavHostFragment for navigation bar and keyboard
            binding.navHostFragmentAddFirstMomo.setPadding(
                binding.navHostFragmentAddFirstMomo.paddingLeft,
                binding.navHostFragmentAddFirstMomo.paddingTop,
                binding.navHostFragmentAddFirstMomo.paddingRight,
                bottomPadding
            )

            windowInsets
        }
    }
}
