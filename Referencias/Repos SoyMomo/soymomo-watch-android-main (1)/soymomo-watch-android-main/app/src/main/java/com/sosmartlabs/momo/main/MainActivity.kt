package com.sosmartlabs.momo.main

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager

import android.content.pm.PackageManager
import android.location.Location

import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.PagerSnapHelper
import androidx.recyclerview.widget.RecyclerView
import android.animation.ArgbEvaluator
import android.content.res.ColorStateList
import com.sosmartlabs.momo.main.ui.adapter.WatchSelectorViewHolder
import kotlin.math.abs
import kotlin.math.roundToInt
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.parse.ParseCloud
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.AddFirstMomoActivity
import com.sosmartlabs.momo.databinding.ActivityMainBinding
import com.sosmartlabs.momo.dispatch.DispatchActivity
import com.sosmartlabs.momo.firebase.CrashlyticsLog.recordNonFatalError
import com.sosmartlabs.momo.firebase.FirebaseRemoteConfigRepository
import com.sosmartlabs.momo.main.model.LoginStatus
import com.sosmartlabs.momo.main.model.MainCardWatchUser
import com.sosmartlabs.momo.main.model.SaveNumberStatus
import com.sosmartlabs.momo.main.model.WatchUserError
import com.sosmartlabs.momo.main.model.googlemap.GoogleMapRetriever
import com.sosmartlabs.momo.ble.BleProximityScanner
import com.sosmartlabs.momo.ble.ProximityLocationUploader
import com.sosmartlabs.momo.main.model.locations.LocationsRetriever
import com.sosmartlabs.momo.main.ui.MainViewModel
import com.sosmartlabs.momo.main.ui.WatchListener
import com.sosmartlabs.momo.main.ui.adapter.WatchCardAdapter
import com.sosmartlabs.momo.main.ui.adapter.WatchSelectorAdapter
import com.sosmartlabs.momo.main.ui.dialog.AddedSuccessNumberDialogFragment
import com.sosmartlabs.momo.main.ui.dialog.InvalidWatchNumberDialogFragment
import com.sosmartlabs.momo.main.ui.dialog.VideocallNotificationChannelDisabledDialog
import com.sosmartlabs.momo.main.ui.map.BALANCED_SINGLE_WATCH_ZOOM
import com.sosmartlabs.momo.main.ui.map.DisconnectedCardState
import com.sosmartlabs.momo.main.ui.map.FocusWearerResult
import com.sosmartlabs.momo.main.ui.map.InitialCameraPlan
import com.sosmartlabs.momo.main.ui.map.InitialCameraResolverInput
import com.sosmartlabs.momo.main.ui.map.InitialMapCameraResolver
import com.sosmartlabs.momo.main.ui.map.MainMapLayoutSnapshot
import com.sosmartlabs.momo.main.ui.map.MainMapPaddingCalculator
import com.sosmartlabs.momo.main.ui.map.SelectionStateResolver
import com.sosmartlabs.momo.main.ui.map.WatchSelectionSnapshot
import com.sosmartlabs.momo.main.ui.map.findWearerIndex
import com.sosmartlabs.momo.main.ui.map.isMappableForMap
import com.sosmartlabs.momo.main.ui.map.toWatchCameraStates
import com.sosmartlabs.momo.models.NPSScheduler
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.nps.inapp.NPSController
import com.sosmartlabs.momo.pushnotifications.model.NotificationChannelCategory
import com.sosmartlabs.momo.pushnotifications.ui.NotificationChannelChecker
import com.sosmartlabs.momo.pushnotifications.ui.handlers.GeofenceNotificationHandler
import com.sosmartlabs.momo.review.ReviewPromptRepository
import com.sosmartlabs.momo.review.ReviewViewModel
import com.sosmartlabs.momo.settingsapp.SettingsAppActivity
import com.sosmartlabs.momo.sharedprefs.SharedPrefs
import com.sosmartlabs.momo.sim.SimActivity
import com.sosmartlabs.momo.sim.ui.RequestSimViewModel
import com.sosmartlabs.momo.sim.ui.UpgradePlanPopupViewModel
import com.sosmartlabs.momo.sim.ui.dialogs.RequestSimDialogFragment
import com.sosmartlabs.momo.sim.ui.dialogs.UpgradePlanPopupDialogFragment
import com.sosmartlabs.momo.sim.ui.fragments.forms.RequestSimFormFragment
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.DateUtil
import com.sosmartlabs.momo.utils.NetworkStateReceiver
import com.sosmartlabs.momo.utils.NetworkStateReceiver.NetworkStateListener
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.ui.MomoDialogFragment
import com.sosmartlabs.momo.videocall.CallActivity
import com.sosmartlabs.momo.watchsettings.WatchSettingsActivity
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.util.Calendar
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import androidx.core.content.edit
import androidx.core.view.WindowCompat
import com.sosmartlabs.momo.chat.presentation.activity.ChatListActivity
import com.sosmartlabs.momo.nps.subscription.ui.SubscriptionNpsDialog
import com.sosmartlabs.momo.nps.subscription.ui.SubscriptionNpsSubmitDialog
import com.sosmartlabs.momo.nps.subscription.ui.SubscriptionNpsViewModel
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import androidx.core.view.isVisible

@OptIn(ExperimentalCoroutinesApi::class)
@AndroidEntryPoint
class MainActivity : AppCompatActivity(), OnMapReadyCallback,
    MomoDialogFragment.MomoDialogListener, WatchListener, NetworkStateListener {

    // =============================================================================
    // COMPANION OBJECT & CONSTANTS
    // =============================================================================

    companion object {
        private const val REQUEST_RESOLVE_ERROR = 1001
        private const val STATE_RESOLVING_ERROR = "resolving_error"
        private const val DIALOG_ERROR = "dialog_error"
        private const val SUBSCRIPTION_NPS_DIALOG_TAG = "SubscriptionNpsDialog"
        private const val SUBSCRIPTION_NPS_SUBMIT_DIALOG_TAG = "SubscriptionNpsSubmitDialog"
        private const val SUBSCRIPTION_NPS_SHOW_DELAY_MS = 3_000L
        private const val REQUEST_SIM_DIALOG_TAG = "RequestSimDialog"
        private const val UPGRADE_PLAN_POPUP_DIALOG_TAG = "UpgradePlanPopupDialog"

        // Beyond this many cards away, a tap does an instant hop next to the target
        // then glides the final card, instead of blurring through everything between.
        private const val FAR_JUMP_THRESHOLD = 4

        // Show delays for the disconnected card. Data-driven evaluations (list
        // reload, LiveQuery update) wait longer because on resume the ViewModel
        // first re-posts CACHED data whose stale lastTKQ misreads online watches
        // as offline — the fresh update lands within this window and cancels the
        // show. A user-driven selection (tap/swipe) evaluates the freshly loaded
        // list, so it shows almost immediately.
        private const val DISCONNECTED_CARD_SHOW_DELAY_DATA_MS = 1200L
        private const val DISCONNECTED_CARD_SHOW_DELAY_USER_MS = 50L
        private const val DISCONNECTED_CARD_FADE_MS = 200L

        // How often the banner reformats its elapsed time while visible. One minute is
        // the resolution the displayed string itself has, so ticking faster would repaint
        // identical text. Costs one string format per minute — no query, no network.
        private const val DISCONNECTED_CARD_TICK_MS = 60_000L
    }

    // =============================================================================
    // PROPERTIES & DEPENDENCIES
    // =============================================================================

    // UI Components
    private lateinit var binding: ActivityMainBinding
    private lateinit var watchCardsAdapter: WatchCardAdapter
    private lateinit var watchSelectorAdapter: WatchSelectorAdapter
    private lateinit var mapFragment: SupportMapFragment

    // ViewModels
    private val mainViewModel: MainViewModel by viewModels()
    private val requestSimViewModel: RequestSimViewModel by viewModels()
    private val upgradePlanPopupViewModel: UpgradePlanPopupViewModel by viewModels()
    private val reviewViewModel: ReviewViewModel by viewModels()
    private val subscriptionNpsViewModel: SubscriptionNpsViewModel by viewModels()

    // Dependency Injection
    @Inject
    lateinit var googleMapRetriever: GoogleMapRetriever

    @Inject
    lateinit var locationsRetriever: LocationsRetriever

    @Inject
    lateinit var bleProximityScanner: BleProximityScanner

    @Inject
    lateinit var proximityLocationUploader: ProximityLocationUploader

    @Inject
    lateinit var notificationChannelChecker: NotificationChannelChecker

    @Inject
    lateinit var npsController: NPSController

    @Inject
    lateinit var reviewPromptRepository: ReviewPromptRepository

    @Inject
    lateinit var sharedPrefs: SharedPrefs

    // State Variables
    private var resolvingError = false
    private var phoneNumber = ""
    private var pendingFocusWearerId: String? = null
    private var pendingFocusNotificationSource: String? = null
    private var pendingOpenLingoProgress: Boolean = false
    private var hasAppliedInitialCameraForNonEmptyData = false
    private var hasCompletedInitialWatchLoad = false
    private var hasShownReviewDialog = false
    private var subscriptionNpsShowJob: Job? = null
    private var shouldSendCR = true
    private var hasNetworkConnection = true
    private var user: ParseUser? = null
    private var latestUserLocation: Location? = null
    // Selected watch identity, persisted in the ViewModel's SavedStateHandle so it
    // survives rotation and process death; the per-load reconciliation restores the
    // selection from it by objectId once the watch list commits.
    private var selectedWearerId: String?
        get() = mainViewModel.selectedWatchId
        set(value) {
            mainViewModel.selectedWatchId = value
        }
    private var selectionReconcileToken = 0
    private var fabOriginalBottomMargin: Int = 0
    private var chatListFabOriginalBottomMargin: Int = 0

    // Selector ⇄ card coordination. The card pager is the source of truth for live
    // motion; the selector strip follows it. All selection mutation funnels through
    // selectIndex(), which keeps the two in sync and breaks the feedback loop.
    private val mainSnapHelper = PagerSnapHelper()
    private var selectedIndex = RecyclerView.NO_POSITION
    // The settle/track listeners ignore events until the per-load identity restore
    // has run, so RecyclerView's own saved-state scroll restore can't masquerade as
    // a user selection.
    private var restoreApplied = false
    // True only while the user is physically dragging/flinging the pager, so the
    // ring cross-fade runs for real gestures but not programmatic glides.
    private var pagerDraggedByUser = false
    private val ringArgb = ArgbEvaluator()
    private val ringSelectedColor by lazy { ContextCompat.getColor(this, R.color.momo_background) }
    private val ringDisconnectedColor by lazy { ContextCompat.getColor(this, R.color.momo_error_background) }
    private val ringUnselectedColor by lazy { ContextCompat.getColor(this, R.color.white) }
    // Connection state per position, snapshotted at the start of each drag so the
    // ring cross-fade fades toward the correct tone (purple/red) from the first
    // frame. Avoids calling the allocating, logging Wearer.isConnected() per frame.
    private var dragConnectedByPosition: List<Boolean> = emptyList()
    // Pending debounced show of the disconnected card; cancelled when a connected
    // update arrives within the window (see showDisconnectedCardDebounced).
    private var pendingDisconnectedCardShow: Job? = null
    private var pendingDisconnectedCardShowAt = 0L
    // State the disconnected card is currently rendering. Held so the elapsed-time ticker
    // can re-render without another Parse read, and so the debounced show can re-bind
    // immediately before it fades in (see showDisconnectedCardDebounced).
    private var disconnectedCardState: DisconnectedCardState? = null
    // Repaints the elapsed time while the card is on screen. The card shows a relative
    // time ("3 hr. ago"), which reads as live and so must not be allowed to freeze; the
    // ticker only reformats a timestamp already in memory — no query, no network.
    private var disconnectedCardTicker: Job? = null

    // Network & Receivers
    private val networkStateReceiver = NetworkStateReceiver(this)

    // Permission Launchers
    private val requestBluetoothPermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        // No-Op
    }

    private val requestNotificationPermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        // No-Op
    }

    private val requestLocationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        ) {
            enableMyLocationButton()
        } else {
            Toast.makeText(
                this, R.string.toast_error_no_location_permissions, Toast.LENGTH_LONG
            ).show()
        }
    }

    private val requestCallPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            makeCall()
        } else {
            Toast.makeText(
                this, R.string.toast_error_no_call_permissions, Toast.LENGTH_LONG
            ).show()
        }
    }

    // =============================================================================
    // LIFECYCLE METHODS
    // =============================================================================

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("MainActivity: onCreate")
        enableEdgeToEdge()
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()

        lifecycle.addObserver(mainViewModel)
        lifecycle.addObserver(locationsRetriever)
        lifecycle.addObserver(bleProximityScanner)
        resolvingError = savedInstanceState?.getBoolean(STATE_RESOLVING_ERROR, false) ?: false

        setupClickListeners()
        initViewAdapter()
        setupMap()

        reviewPromptRepository.incrementRunCount()
        saveCurrentUserEmailInPreferences()
        observeMainViewModel()
        observeRequestSim()
        observeUpgradePlanPopup()
        observeLocationUpdates()
        observeBleProximity()
        checkVideocallNotificationCategory()
        searchForNPS()
        searchForSubscriptionNps()
        subscriptionNpsViewModel.scheduleEvaluation.observe(this) {
            tryShowSubscriptionNpsIfReady()
        }
        subscriptionNpsViewModel.submitResult.observe(this) { success ->
            if (success) {
                showSubscriptionNpsConfirmation()
            } else {
                Toast.makeText(
                    this,
                    R.string.subscription_nps_submit_error,
                    Toast.LENGTH_LONG,
                ).show()
            }
        }
        reviewViewModel.reviewDialogVisible.observe(this) { isVisible ->
            if (!isVisible) tryShowSubscriptionNpsIfReady()
        }
    }

    override fun onResume() {
        super.onResume()
        Timber.d("MainActivity: onResume")

        registerReceiver(networkStateReceiver, IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION))

        handleWearerFocusIntent(intent)

        if (hasCompletedInitialWatchLoad && !hasShownReviewDialog) {
            hasShownReviewDialog = true
            // Deferred out of the resume transaction on purpose: showing a dialog straight
            // from onResume runs inside ActivityThread.performResumeActivity, before our own
            // window token is reliably valid, and a BadTokenException there escapes as a fatal
            // "Unable to resume activity" rather than a failed dialog.
            window.decorView.post {
                if (!isFinishing && !isDestroyed) {
                    reviewViewModel.showIfNeeded(this)
                }
            }
        }

        checkBluetoothPermissions()
        checkNotificationPermissions()

        requestSimViewModel.showPendingPopupIfNeeded()

        // Re-evaluate eligibility on every resume — subscription list may not be
        // populated yet on first resume; the observer in observeUpgradePlanPopup
        // also forwards subsequent updates.
        upgradePlanPopupViewModel.evaluate(mainViewModel.subscriptionList.value ?: emptyList())
        upgradePlanPopupViewModel.showPendingPopupIfNeeded(
            siblingPopupVisible = requestSimViewModel.showPopup.value == true
        )

        subscriptionNpsViewModel.onMainAppearance()
        tryShowSubscriptionNpsIfReady()

        drainPendingInvitationLink()
    }

    /**
     * Drain any watch-invitation deep link that was parked by DispatchActivity
     * (custom-scheme tap or App Link match). Routing through SharedPreferences
     * instead of intent extras keeps the link alive across the auth/login flow
     * and across process recreation. Triggered on every onResume — the prefs
     * consumer clears the value once read, so a single deep-link tap only fires
     * the receiver flow once.
     */
    private fun drainPendingInvitationLink() {
        val deviceId = sharedPrefs.consumePendingInvitationDeviceId() ?: return
        Timber.i("MainActivity: Draining pending invitation deep link for deviceId=$deviceId")
        startActivity(
            Intent(this, AddFirstMomoActivity::class.java)
                .putExtra(AddFirstMomoActivity.EXTRA_PREFILL_DEVICE_ID, deviceId)
        )
    }

    private fun observeRequestSim() {
        requestSimViewModel.showPopup.observe(this) { shouldShow ->
            val tag = REQUEST_SIM_DIALOG_TAG
            val existing = supportFragmentManager.findFragmentByTag(tag)
            if (shouldShow && existing == null) {
                RequestSimDialogFragment().show(supportFragmentManager, tag)
            } else if (!shouldShow) {
                tryShowSubscriptionNpsIfReady()
            }
        }

        requestSimViewModel.showForm.observe(this) { shouldShowForm ->
            if (shouldShowForm) {
                val tag = "RequestSimForm"
                if (supportFragmentManager.findFragmentByTag(tag) == null) {
                    RequestSimFormFragment().show(supportFragmentManager, tag)
                }
                requestSimViewModel.consumeShowForm()
            }
        }
    }

    private fun observeUpgradePlanPopup() {
        // Re-evaluate whenever the subscription list arrives or refreshes.
        mainViewModel.subscriptionList.observe(this) { subs ->
            upgradePlanPopupViewModel.evaluate(subs)
        }

        upgradePlanPopupViewModel.showPopup.observe(this) { shouldShow ->
            val tag = UPGRADE_PLAN_POPUP_DIALOG_TAG
            val existing = supportFragmentManager.findFragmentByTag(tag)
            if (shouldShow && existing == null) {
                UpgradePlanPopupDialogFragment().show(supportFragmentManager, tag)
            } else if (!shouldShow) {
                tryShowSubscriptionNpsIfReady()
            }
        }

        upgradePlanPopupViewModel.navigateToUpgrade.observe(this) { shouldNavigate ->
            if (shouldNavigate) {
                val subscriptionId = upgradePlanPopupViewModel.primarySubscription.value?.objectId
                val intent = Intent(this, SimActivity::class.java).apply {
                    if (!subscriptionId.isNullOrEmpty()) {
                        putExtra(Constants.EXTRA_DEEP_LINK_SUBSCRIPTION_ID, subscriptionId)
                        putExtra(Constants.EXTRA_DEEP_LINK_SCROLL_TO_UPGRADE, true)
                    } else {
                        Timber.w("MainActivity: upgrade popup CTA tapped without primarySubscription - falling back to subscription list")
                    }
                }
                startActivity(intent)
                upgradePlanPopupViewModel.consumeNavigateToUpgrade()
            }
        }
    }

    override fun onPause() {
        super.onPause()
        Timber.d("MainActivity: onPause")

        try {
            unregisterReceiver(networkStateReceiver)
        } catch (e: IllegalArgumentException) {
            Timber.e(e, "Receiver not registered")
        }

        // Hide disconnected card so it doesn't show stale state when returning.
        // The correct state will be re-evaluated on resume when watch data refreshes.
        hideDisconnectedCard()
        subscriptionNpsShowJob?.cancel()
    }

    override fun onDestroy() {
        if (::googleMapRetriever.isInitialized) {
            googleMapRetriever.clearMapArtifacts()
        }
        super.onDestroy()
    }

    override fun onLowMemory() {
        super.onLowMemory()
        Timber.d("MainActivity: onLowMemory")
        mapFragment.onLowMemory()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        Timber.d("MainActivity: onSaveInstanceState")
        outState.putBoolean(STATE_RESOLVING_ERROR, resolvingError)
    }

    @Deprecated("This method has been deprecated in favor of using the Activity Result API")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_RESOLVE_ERROR) {
            resolvingError = false
            if (resultCode == RESULT_OK) {
                mapFragment.requireView().visibility = View.VISIBLE
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        Timber.d("MainActivity: onNewIntent")
        setIntent(intent)
        handleWearerFocusIntent(intent)
    }

    // =============================================================================
    // SETUP METHODS
    // =============================================================================

    private fun setupClickListeners() {
        binding.buttonAddWatch.setOnClickListener {
            val intent = Intent(this@MainActivity, AddFirstMomoActivity::class.java)
            startActivity(intent)
        }

        binding.buttonBuyWatch.setOnClickListener {
            val browserIntent = Intent(Intent.ACTION_VIEW, "http://www.soymomo.com/".toUri())
            try {
                startActivity(browserIntent)
            } catch (e: ActivityNotFoundException) {
                recordNonFatalError(e, "MainActivity: no app available to open the buy-watch URL")
                Toast.makeText(this, R.string.toast_error_opening_url, Toast.LENGTH_LONG).show()
            }
        }

        binding.toolbarOpen.setOnClickListener {
            startActivity(Intent(this@MainActivity, SettingsAppActivity::class.java))
        }

        // The whole banner is the tap target now — the old full-width button was 48dp of
        // inherited AppCompat minHeight spent on four words, and its unbounded label was
        // what made the card grow taller in long locales.
        binding.disconnectedCard.setOnClickListener {
            // Read the state at click time, not capture it: this listener is registered once
            // at startup and the selection changes underneath it on every swipe.
            val state = disconnectedCardState
            val intent = Intent(this@MainActivity, DisconnectionActivity::class.java).apply {
                state?.let {
                    putExtra(Constants.EXTRA_WEARER_ID, it.wearerId)
                    putExtra(Constants.EXTRA_DEVICE_ID, it.deviceId)
                }
            }
            startActivity(intent)
        }

        binding.buttonChatList.setOnClickListener {
            val intent = Intent(this@MainActivity, ChatListActivity::class.java)
            startActivity(intent)
        }
    }

    private fun setupMap() {
        mapFragment = supportFragmentManager.findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    /**
     * Sets up edge-to-edge display with proper window insets handling
     */
    private fun setupEdgeToEdge() {
        Timber.d("MainActivity: setupEdgeToEdge")

        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = true

        // Store original my location FAB margin before any modifications
        val fabLayoutParams = binding.buttonMyLocation.layoutParams as androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
        fabOriginalBottomMargin = fabLayoutParams.bottomMargin
        Timber.d("MainActivity: my location FAB original bottom margin: $fabOriginalBottomMargin")

        // Store original chat list FAB margin before any modifications
        val chatListFabLayoutParams = binding.buttonChatList.layoutParams as androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
        chatListFabOriginalBottomMargin = chatListFabLayoutParams.bottomMargin
        Timber.d("MainActivity: chat list FAB original bottom margin: $chatListFabOriginalBottomMargin")

        // Handle system bars (status bar and navigation bar) insets
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("MainActivity: systemBars $systemBars")
            Timber.d("MainActivity: displayCutout $displayCutout")
            Timber.d("MainActivity: navigationBars $navigationBars")

            // Apply top padding to toolbar layout to avoid status bar overlap
            binding.toolbarLayout.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                0
            )

            // Only apply bottom padding if device uses button navigation (not gesture navigation)
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("MainActivity: hasButtonNavigation=$shouldApplyBottomInsets, bottomPadding=$bottomPadding")

            // Apply bottom padding to layouts that are positioned at the bottom
            binding.loadingLayout.setPadding(
                binding.loadingLayout.paddingLeft,
                binding.loadingLayout.paddingTop,
                binding.loadingLayout.paddingRight,
                bottomPadding
            )

            binding.noWearersLayout.setPadding(
                binding.noWearersLayout.paddingLeft,
                binding.noWearersLayout.paddingTop,
                binding.noWearersLayout.paddingRight,
                bottomPadding
            )

            binding.wearersLayout.setPadding(
                binding.wearersLayout.paddingLeft,
                binding.wearersLayout.paddingTop,
                binding.wearersLayout.paddingRight,
                bottomPadding
            )

            // Adjust my location FAB margin to account for navigation bar (always update, even if 0)
            val fabParams = binding.buttonMyLocation.layoutParams as androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
            val newFabBottomMargin = fabOriginalBottomMargin + bottomPadding
            fabParams.bottomMargin = newFabBottomMargin
            binding.buttonMyLocation.layoutParams = fabParams
            Timber.d("MainActivity: FAB bottom margin set to: $newFabBottomMargin (original: $fabOriginalBottomMargin + padding: $bottomPadding)")

            // Adjust chat list FAB margin to account for navigation bar (always update, even if 0)
            val chatListFabParams = binding.buttonChatList.layoutParams as androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
            val newChatListFabBottomMargin = chatListFabOriginalBottomMargin + bottomPadding
            chatListFabParams.bottomMargin = newChatListFabBottomMargin
            binding.buttonChatList.layoutParams = chatListFabParams
            Timber.d("MainActivity: Chat list FAB bottom margin set to: $newChatListFabBottomMargin (original: $chatListFabOriginalBottomMargin + padding: $bottomPadding)")

            updateMapPaddingForCurrentState()

            windowInsets
        }
    }

    // =============================================================================
    // UI INITIALIZATION
    // =============================================================================

    private fun initViewAdapter() {
        // Watch main card pager (one full-width card per page).
        binding.wearersRecyclerView.setHasFixedSize(true)
        binding.wearersRecyclerView.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        watchCardsAdapter = WatchCardAdapter(
            activity = this,
            watchListener = this,
            onReviewPositiveAction = reviewPromptRepository::recordPositiveUserAction
        )
        binding.wearersRecyclerView.adapter = watchCardsAdapter
        mainSnapHelper.attachToRecyclerView(binding.wearersRecyclerView)

        // Selector strip (small avatars). No PagerSnapHelper here: it is a dense
        // strip, not a pager. It is panned programmatically to follow the card.
        binding.wearerSelectorRecyclerView.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        watchSelectorAdapter = WatchSelectorAdapter()
        binding.wearerSelectorRecyclerView.adapter = watchSelectorAdapter

        // Tapping an avatar selects that watch (and smooth-scrolls the pager to it).
        // Dragging the strip is pure browse — it never writes back the selection.
        watchSelectorAdapter.onWatchSelected = { position ->
            selectIndex(position, scrollCard = true, smooth = true)
        }

        // The selector follows the main pager. While the pager scrolls (drag, fling
        // or a programmatic glide) the strip pans proportionally in real time so it
        // never lurches; on settle it snaps exactly and commits the selection.
        binding.wearersRecyclerView.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                if (dx == 0 || !restoreApplied) return
                val fractionalCenter = mainFractionalPosition()
                // Absolute (not incremental) positioning so RecyclerView clamps the
                // strip naturally at the list ends instead of drifting out and
                // snapping back on settle.
                applySelectorOffset(fractionalCenter)
                // While the user drags/flings, cross-fade the highlight ring between
                // the outgoing and incoming avatar (skipped for programmatic scrolls
                // so it never fights a tap).
                if (pagerDraggedByUser) paintSelectorRings(fractionalCenter)
            }

            override fun onScrollStateChanged(recyclerView: RecyclerView, newState: Int) {
                if (newState == RecyclerView.SCROLL_STATE_DRAGGING) {
                    if (restoreApplied) {
                        pagerDraggedByUser = true
                        // Snapshot connection state per position so the ring cross-fade
                        // targets the right colour (purple/red) from the first frame
                        // instead of fading to purple and popping to red on landing.
                        dragConnectedByPosition = watchCardsAdapter.currentList.map {
                            it.watchUser.watch?.isConnected() == true
                        }
                    }
                    return
                }
                if (newState != RecyclerView.SCROLL_STATE_IDLE) return
                val wasDragged = pagerDraggedByUser
                pagerDraggedByUser = false
                if (!restoreApplied) return
                val lm = recyclerView.layoutManager as? LinearLayoutManager
                val snapView = lm?.let { mainSnapHelper.findSnapView(it) }
                val pos = snapView?.let { recyclerView.getChildAdapterPosition(it) }
                    ?: RecyclerView.NO_POSITION
                when {
                    pos !in 0 until watchCardsAdapter.itemCount -> { /* unresolved; refresh below */ }
                    // Already selected (e.g. settle after a programmatic scroll, or a
                    // drag that snapped back): just correct sub-pixel drift.
                    pos == selectedIndex -> centerSelector(pos)
                    else -> selectIndex(pos, scrollCard = false, smooth = true)
                }
                // A user drag leaves the avatars mid-cross-fade; re-assert the clean
                // discrete highlight so an incomplete swipe that snapped back to the
                // same card never ends up looking unselected.
                if (wasDragged) watchSelectorAdapter.refreshHighlight()
            }
        })
    }

    // =============================================================================
    // SELECTOR ⇄ CARD COORDINATION
    // =============================================================================

    /**
     * The single funnel for "which watch is selected". Idempotent: calling it with
     * the value already showing is a cheap no-op for the highlight and the scroll,
     * which is what breaks the two-way feedback loop between the pager and the
     * selector.
     *
     * @param scrollCard whether to move the main pager (false when the call
     *   originates from the pager settling on that card already).
     * @param smooth animate the scroll/recenter (false for an instant move).
     */
    private fun selectIndex(index: Int, scrollCard: Boolean, smooth: Boolean) {
        if (index !in 0 until watchCardsAdapter.itemCount) return
        val watchUser = watchCardsAdapter.currentList[index]
        moveSelectionTo(index, scrollCard, smooth)
        applySelectionSideEffects(watchUser)
    }

    /**
     * Moves the highlight + (optionally) the pager + recenters the strip, with no
     * map/banner side-effects. Used by the camera/restore paths, which manage the
     * map themselves.
     */
    private fun moveSelectionTo(index: Int, scrollCard: Boolean, smooth: Boolean) {
        if (index !in 0 until watchCardsAdapter.itemCount) return
        selectedIndex = index
        watchSelectorAdapter.setSelectedIndex(index)
        if (scrollCard) {
            scrollMainTo(index, smooth)
            // A smooth pager glide drags the strip live via onScrolled (once
            // restoreApplied); an instant move — or a move before the restore has
            // run — needs an explicit recenter.
            if (!smooth || !restoreApplied) centerSelector(index)
        } else {
            // Settle from a user swipe: the strip already tracked the card, so just
            // snap it exactly onto the centre.
            centerSelector(index)
        }
    }

    /** Map focus + disconnected banner for the newly-selected watch. */
    private fun applySelectionSideEffects(selectedWatchUser: MainCardWatchUser) {
        val wearer = selectedWatchUser.watchUser.watch
        if (wearer != null) {
            selectedWearerId = wearer.objectId
            // User-driven selection (tap/swipe) evaluates the freshly loaded list —
            // no stale-cache risk — so the card shows with the short delay.
            renderDisconnectedCardFor(selectedWatchUser, DISCONNECTED_CARD_SHOW_DELAY_USER_MS)
            googleMapRetriever.setActiveWearer(wearer.objectId)
            if (selectedWatchUser.isMappableForMap()) {
                googleMapRetriever.locateWearer(wearer.objectId)
            }
        } else {
            selectedWearerId = null
            renderDisconnectedCardFor(null)
            googleMapRetriever.setActiveWearer(null)
        }
    }

    private fun scrollMainTo(index: Int, smooth: Boolean) {
        val rv = binding.wearersRecyclerView
        if (index !in 0 until watchCardsAdapter.itemCount) return
        val lm = rv.layoutManager as? LinearLayoutManager
        if (!smooth || lm == null) {
            lm?.scrollToPositionWithOffset(index, 0) ?: rv.scrollToPosition(index)
            return
        }
        // For a far jump, instantly hop next to the target then smooth-settle the
        // last card, instead of animating through every card in between.
        val current = mainSnapHelper.findSnapView(lm)
            ?.let { rv.getChildAdapterPosition(it) }
            ?.takeIf { it != RecyclerView.NO_POSITION }
            ?: selectedIndex
        val distance = if (current == RecyclerView.NO_POSITION) Int.MAX_VALUE
        else abs(index - current)
        if (distance > FAR_JUMP_THRESHOLD) {
            val prelanding = (if (index > current) index - 1 else index + 1)
                .coerceIn(0, watchCardsAdapter.itemCount - 1)
            lm.scrollToPositionWithOffset(prelanding, 0)
            // Mirror the instant hop on the selector; the final glide then pulls it
            // the last avatar via onScrolled.
            centerSelector(prelanding)
            rv.post { rv.smoothScrollToPosition(index) }
        } else {
            rv.smoothScrollToPosition(index)
        }
    }

    private fun scrollMainToInstant(index: Int) {
        val lm = binding.wearersRecyclerView.layoutManager as? LinearLayoutManager
        if (lm != null) lm.scrollToPositionWithOffset(index, 0)
        else binding.wearersRecyclerView.scrollToPosition(index)
    }

    /**
     * Positions the selector strip so the avatar at [fractionalCenter] (the pager's
     * fractional position) sits in the centre. Absolute positioning, so
     * RecyclerView clamps it at the list ends — the first/last avatars can't be
     * centred, and clamping keeps the strip pinned there instead of drifting past.
     */
    private fun applySelectorOffset(fractionalCenter: Float) {
        val rv = binding.wearerSelectorRecyclerView
        val lm = rv.layoutManager as? LinearLayoutManager ?: return
        val watchCount = watchCardsAdapter.itemCount
        if (watchCount == 0 || rv.width == 0) return
        val fc = fractionalCenter.coerceIn(0f, (watchCount - 1).toFloat())
        val index = fc.toInt()
        val frac = fc - index
        val avatarWidth = lm.findViewByPosition(index)?.width ?: rv.getChildAt(0)?.width ?: 0
        if (avatarWidth == 0) return
        val offset = (rv.width / 2f - avatarWidth / 2f - frac * avatarWidth).roundToInt()
        lm.scrollToPositionWithOffset(index, offset)
    }

    /** Centres the avatar at [index]; posted if the strip is not yet measured. */
    private fun centerSelector(index: Int) {
        if (index !in 0 until watchSelectorAdapter.itemCount) return
        val rv = binding.wearerSelectorRecyclerView
        // Posted when not yet measured (rv.width == 0 during a submitList commit),
        // which would otherwise collapse the centre offset to 0 and pin the avatar
        // to the left edge.
        if (rv.width == 0 || rv.childCount == 0) rv.post { applySelectorOffset(index.toFloat()) }
        else applySelectorOffset(index.toFloat())
    }

    /**
     * The pager's current position as a fraction (e.g. 3.4 = 40% of the way from
     * card 3 to card 4), used to pan the strip and drive the ring cross-fade.
     */
    private fun mainFractionalPosition(): Float {
        val safeSelected = selectedIndex.coerceAtLeast(0).toFloat()
        val lm = binding.wearersRecyclerView.layoutManager as? LinearLayoutManager
            ?: return safeSelected
        val firstPos = lm.findFirstVisibleItemPosition()
        if (firstPos == RecyclerView.NO_POSITION) return safeSelected
        val firstChild = lm.findViewByPosition(firstPos) ?: return firstPos.toFloat()
        val width = firstChild.width
        if (width == 0) return firstPos.toFloat()
        val fraction = (-firstChild.left.toFloat() / width).coerceIn(0f, 1f)
        return firstPos + fraction
    }

    /**
     * Cross-fades each visible avatar's ring (stroke colour + opacity) by how close
     * it is to [fractionalCenter]: the centred avatar is fully ringed, its
     * neighbour fades in as the pager crosses toward it. At an integer centre this
     * matches the adapter's discrete highlight, so committing on settle is seamless.
     */
    private fun paintSelectorRings(fractionalCenter: Float) {
        val rv = binding.wearerSelectorRecyclerView
        val watchCount = watchCardsAdapter.itemCount
        for (i in 0 until rv.childCount) {
            val child = rv.getChildAt(i)
            val pos = rv.getChildAdapterPosition(child)
            if (pos == RecyclerView.NO_POSITION || pos >= watchCount) continue
            val avatar = (rv.getChildViewHolder(child) as? WatchSelectorViewHolder)
                ?.vProfilePicture ?: continue
            val strength = (1f - abs(pos - fractionalCenter)).coerceIn(0f, 1f)
            // Fade toward THIS avatar's own selected colour (purple if connected, red
            // if disconnected — from the drag-start snapshot) so the ring never pops
            // colour when the swipe lands. Mirrors applyHighlight's discrete rule.
            val target = if (dragConnectedByPosition.getOrElse(pos) { false }) ringSelectedColor
            else ringDisconnectedColor
            val color = ringArgb.evaluate(strength, ringUnselectedColor, target) as Int
            avatar.strokeColor = ColorStateList.valueOf(color)
            avatar.imageAlpha = (127 + 128 * strength).roundToInt()
        }
    }

    // =============================================================================
    // VIEWMODEL OBSERVERS
    // =============================================================================

    private fun observeMainViewModel() {
        mainViewModel.watchUserList.observe(this) { (status, data, statusType) ->
            Timber.d("MainActivity: watchUserList $status with data ${data?.size}")
            when (status) {
                Resource.Status.LOADING -> {
                    binding.toolbarProgressBar.visibility = View.VISIBLE
                }
                Resource.Status.LOAD_SUCCESS -> {
                    binding.toolbarProgressBar.visibility = View.GONE
                    handleLoadingWatchUserSuccess(data!!)
                }
                Resource.Status.LOAD_ERROR -> {
                    when (statusType) {
                        WatchUserError.CONNECTION_ERROR -> binding.noNetworkLayout.visibility = View.VISIBLE
                        WatchUserError.INVALID_SESSION -> {
                            Toast.makeText(this@MainActivity, R.string.toast_error_log_in_again, Toast.LENGTH_LONG).show()
                            mainViewModel.logout()
                        }
                        WatchUserError.TIMEOUT -> binding.noNetworkLayout.visibility = View.VISIBLE
                        WatchUserError.UNKNOWN_ERROR -> Toast.makeText(this@MainActivity, R.string.toast_error_loading_momos, Toast.LENGTH_SHORT).show()
                        else -> {
                            // Do nothing
                        }
                    }
                    binding.toolbarProgressBar.visibility = View.GONE
                }
                else -> {
                    // Do nothing
                }
            }
        }

        mainViewModel.saveNumberStatus.observe(this) { saveNumberStatus: SaveNumberStatus? ->
            when (saveNumberStatus) {
                SaveNumberStatus.LOADING_SAVE -> {
                    binding.toolbarProgressBar.visibility = View.VISIBLE
                }
                SaveNumberStatus.SAVE_SUCCESS -> {
                    binding.toolbarProgressBar.visibility = View.GONE
                    val wearer = mainViewModel.watchUserUpdate.value?.watchUser?.watch
                    if (wearer != null) {
                        AddedSuccessNumberDialogFragment(wearer).show(supportFragmentManager, "Success add number dialog")
                    }
                }
                SaveNumberStatus.ERROR_SAVE -> {
                    binding.toolbarProgressBar.visibility = View.GONE
                    Toast.makeText(this@MainActivity, R.string.add_watch_kid_profile_label_error_phone_number, Toast.LENGTH_LONG).show()
                }
                else -> {
                    // Do nothing
                }
            }
        }

        mainViewModel.watchUserUpdate.observe(this) { mainCardWatchUser: MainCardWatchUser? ->
            mainCardWatchUser?.let { updatedWatch ->
                watchCardsAdapter.updateElement(updatedWatch)
                watchSelectorAdapter.updateElement(updatedWatch)
                if (updatedWatch.matchesWearerIdentifier(selectedWearerId)) {
                    renderDisconnectedCardFor(updatedWatch)
                }
                googleMapRetriever.setMarkerVisibility(updatedWatch) {
                    if (!hasAppliedInitialCameraForNonEmptyData &&
                        watchCardsAdapter.currentList.isNotEmpty() &&
                        (pendingFocusWearerId != null || updatedWatch.isMappableForMap())
                    ) {
                        applyInitialCameraPlan(
                            mainCardWatchUsers = watchCardsAdapter.currentList,
                            source = "watch_update_retry"
                        )
                    }
                }
            }
        }

        mainViewModel.currentUser.observe(this) { user: ParseUser? ->
            this.user = user
            if (user == null) {
                mainViewModel.logout()
                return@observe
            }
            shouldSendCR = false
            if (GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(this) == ConnectionResult.SUCCESS) {
                mapFragment.requireView().visibility = View.VISIBLE
                observeGeofences()
                handleWearerFocusIntent(intent)
            } else {
                mapFragment.requireView().visibility = View.INVISIBLE
            }
        }

        mainViewModel.loginStatus.observe(this) {
            when (it) {
                LoginStatus.LOGGING_OUT -> {
                    binding.toolbarProgressBar.visibility = View.VISIBLE
                }
                LoginStatus.LOGGED_OUT -> {
                    binding.toolbarProgressBar.visibility = View.GONE
                    startActivity(Intent(baseContext, DispatchActivity::class.java).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
                    finish()
                }
                LoginStatus.LOGOUT_ERROR -> {
                    binding.toolbarProgressBar.visibility = View.GONE
                    Toast.makeText(this, R.string.unknown_error, Toast.LENGTH_LONG).show()
                }
                else -> {
                    // Do nothing
                }
            }
        }

        mainViewModel.liveDataSendCr.observe(this) {
            when (it.status) {
                Resource.Status.LOADING -> {
                    binding.toolbarProgressBar.visibility = View.VISIBLE
                }
                Resource.Status.LOAD_SUCCESS -> {
                    binding.toolbarProgressBar.visibility = View.GONE
                }
                else -> {
                    // Do nothing
                }
            }
        }

        mainViewModel.setParseUser.observe(this) {
            when (it.status) {
                Resource.Status.LOADING -> {
                    binding.toolbarProgressBar.visibility = View.VISIBLE
                }
                Resource.Status.LOAD_SUCCESS -> {
                    binding.toolbarProgressBar.visibility = View.GONE
                }
                else -> {
                    // Do nothing
                }
            }
        }

        mainViewModel.hasPendingPayment.observe(this) { hasPending ->
            binding.toolbarAlert.visibility = if (hasPending) View.VISIBLE else View.GONE
        }
    }

    private fun observeGeofences() {
        mainViewModel.userGeofence.observe(this) { (status, data, statusType) ->
            when (status) {
                Resource.Status.LOAD_SUCCESS -> {
                    if (data != null) {
                        googleMapRetriever.setGeoFence(data)
                    }
                }
                Resource.Status.LOAD_ERROR -> Timber.e(statusType)
                else -> {
                    // Do nothing
                }
            }
        }
    }

    private fun observeLocationUpdates() {
        locationsRetriever.locations.observe(this) { location ->
            val hadLocation = latestUserLocation != null
            latestUserLocation = location
            if (!hadLocation &&
                hasCompletedInitialWatchLoad &&
                watchCardsAdapter.currentList.isEmpty() &&
                pendingFocusWearerId.isNullOrEmpty()
            ) {
                applyInitialCameraPlan(emptyList(), source = "location_update_empty_state")
            }
        }
    }

    private fun observeBleProximity() {
        var lastSentIds: Set<String> = emptySet()
        bleProximityScanner.nearbyWatchIds.observe(this) { nearbyIds ->
            if (nearbyIds.isNullOrEmpty()) {
                lastSentIds = emptySet()
                return@observe
            }
            val newIds = nearbyIds - lastSentIds
            if (newIds.isEmpty()) return@observe

            lastSentIds = nearbyIds
            proximityLocationUploader.uploadIfValid(latestUserLocation, newIds)
            snapNearbyWatchMarkersToParentPosition(newIds)
        }
    }

    private fun snapNearbyWatchMarkersToParentPosition(deviceIds: Set<String>) {
        val location = latestUserLocation ?: return
        val parentPosition = LatLng(location.latitude, location.longitude)

        // Resolve deviceId → objectId using the current watch user list
        val watchUsers = watchCardsAdapter.currentList
        deviceIds.forEach { deviceId ->
            val objectId = watchUsers
                .firstOrNull { it.watchUser.watch?.deviceId == deviceId }
                ?.watchUser?.watch?.objectId
                ?: return@forEach
            googleMapRetriever.snapWearerToProximityPosition(objectId, parentPosition)
        }
    }

    // =============================================================================
    // DATA HANDLING
    // =============================================================================

    private fun handleLoadingWatchUserSuccess(mainCardWatchUsers: List<MainCardWatchUser>) {
        Timber.d("MainActivity: handleLoadingWatchUserSuccess for ${mainCardWatchUsers.size} watch(es)")

        // Log details about each watch user
        mainCardWatchUsers.forEachIndexed { index, watchUser ->
            val wearer = watchUser.watchUser.watch
            Timber.d("MainActivity: Watch $index - objectId: ${wearer?.objectId}, name: ${wearer?.name()}, connected: ${wearer?.isConnected()}")
        }

        binding.noNetworkLayout.visibility = View.GONE
        if (mainCardWatchUsers.isEmpty()) {
            showNoWearersState(mainCardWatchUsers)
        } else {
            showWearersState(mainCardWatchUsers)
        }
        if (shouldSendCR) {
            shouldSendCR = false
            val deviceIds = mainCardWatchUsers.mapNotNull { it.watchUser.watch?.deviceId }
            if (deviceIds.isNotEmpty()) {
                mainViewModel.sendCR(deviceIds)
            }
        }
        // Feed known deviceIds to the BLE proximity scanner
        val deviceIds = mainCardWatchUsers.mapNotNull { it.watchUser.watch?.deviceId }
        bleProximityScanner.setKnownDeviceIds(deviceIds.toSet())
        hasCompletedInitialWatchLoad = true
        tryShowSubscriptionNpsIfReady()
    }

    /**
     * Empty-state rendering and initial camera fallback when there are no watches.
     */
    private fun showNoWearersState(mainCardWatchUsers: List<MainCardWatchUser>) {
        Timber.d("MainActivity: No watch users, showing empty state")
        binding.loadingLayout.visibility = View.GONE
        binding.noWearersLayout.visibility = View.VISIBLE
        binding.wearersLayout.visibility = View.GONE
        binding.buttonMyLocation.visibility = View.GONE
        binding.buttonChatList.visibility = View.GONE
        hideDisconnectedCard()
        selectedWearerId = null
        googleMapRetriever.setActiveWearer(null)
        googleMapRetriever.loadingWatchUserIntoMap(emptyList())
        applyInitialCameraPlan(mainCardWatchUsers, source = "watch_load_empty")
        updateMapPaddingForCurrentState()
    }

    /**
     * Non-empty rendering path. Camera decision is deferred until:
     * 1) both adapters commit their lists and
     * 2) map markers are rebuilt.
     */
    private fun showWearersState(mainCardWatchUsers: List<MainCardWatchUser>) {
        Timber.d("MainActivity: Loading ${mainCardWatchUsers.size} watch users into UI")
        binding.loadingLayout.visibility = View.GONE
        binding.noWearersLayout.visibility = View.GONE
        binding.wearersLayout.visibility = View.VISIBLE

        // Capture current selection BEFORE submitList triggers DiffUtil which can
        // cause PagerSnapHelper to snap to a wrong item and overwrite selectedWearerId.
        val selectionToRestore = selectedWearerId
        val token = ++selectionReconcileToken
        // Disable live tracking/settle until the identity restore lands, so neither
        // DiffUtil's re-layout nor the programmatic restore scroll is misread as a
        // user selection.
        restoreApplied = false

        val commitState = InitialWatchRenderCommitState()
        val runWhenReady = {
            if (commitState.isReady()) {
                onWatchListsCommitted(mainCardWatchUsers, selectionToRestore, token)
            }
        }

        watchCardsAdapter.submitList(mainCardWatchUsers) {
            commitState.cardsListCommitted = true
            runWhenReady()
        }
        watchSelectorAdapter.submitList(mainCardWatchUsers) {
            commitState.selectorListCommitted = true
            runWhenReady()
        }

        Timber.d("MainActivity: Loading watch users into map")
        googleMapRetriever.loadingWatchUserIntoMap(mainCardWatchUsers) {
            commitState.mapMarkersCommitted = true
            runWhenReady()
        }

        binding.buttonMyLocation.visibility = View.VISIBLE
        binding.buttonChatList.visibility =
            if (FirebaseRemoteConfigRepository.chatGroupListIsHidden) View.GONE else View.VISIBLE
        updateMapPaddingForCurrentState()
    }

    /**
     * Tracks one-time completion of the initial non-empty render pipeline.
     */
    private class InitialWatchRenderCommitState {
        var cardsListCommitted: Boolean = false
        var selectorListCommitted: Boolean = false
        var mapMarkersCommitted: Boolean = false
        private var initialRenderHandled: Boolean = false

        fun isReady(): Boolean {
            if (initialRenderHandled) return false
            if (!cardsListCommitted || !selectorListCommitted || !mapMarkersCommitted) return false
            initialRenderHandled = true
            return true
        }
    }

    private fun onWatchListsCommitted(
        mainCardWatchUsers: List<MainCardWatchUser>,
        selectionToRestore: String?,
        token: Int
    ) {
        if (mainCardWatchUsers.isEmpty()) {
            restoreApplied = true
            return
        }

        // Honour a selection the user made during the async-diff window. The avatar
        // tap callback is intentionally NOT gated by restoreApplied (taps are always
        // actioned), and the scroll listener IS gated, so during this window
        // selectedWearerId can only have diverged from the captured value via a
        // deliberate tap. Reconcile to it rather than reverting to the pre-refresh
        // selection. Falls back to the captured value (e.g. first load: both null).
        val restoreId = selectedWearerId ?: selectionToRestore
        // reconcile sets selectedIndex + the discrete highlight for the restored
        // watch (or returns null when a pending notification focus owns selection).
        reconcileSelectionAfterListCommit(mainCardWatchUsers, restoreId)
        // applyInitialCameraPlan may override the selection (e.g. a deep-link focus)
        // via selectWatchByObjectId/focusOnWatch; both update selectedIndex too.
        applyInitialCameraPlan(mainCardWatchUsers, source = "watch_load_non_empty")

        // Land the pager instantly on whatever ended up selected, then re-enable
        // live tracking. Posted so DiffUtil's layout has settled; absolute-offset
        // positioning lands deterministically, so no verify-and-re-scroll is needed.
        // The token check ensures a stale cycle never re-enables a newer cycle's.
        binding.wearersRecyclerView.post {
            if (token != selectionReconcileToken) return@post
            val landing = selectedIndex.takeIf { it in mainCardWatchUsers.indices }
            if (landing != null) {
                scrollMainToInstant(landing)
                centerSelector(landing)
            }
            // Re-assert a clean discrete highlight across the strip. If this refresh
            // interrupted a user drag, the settle handler bailed (restoreApplied was
            // already false) before it could clear the transient cross-fade colours;
            // DiffUtil won't rebind unchanged avatars, so do it here.
            watchSelectorAdapter.refreshHighlight()
            restoreApplied = true
        }
    }

    private fun applyInitialCameraPlan(
        mainCardWatchUsers: List<MainCardWatchUser>,
        source: String
    ) {
        val watchCameraStates = mainCardWatchUsers.toWatchCameraStates()
        val resolverInput = InitialCameraResolverInput(
            watches = watchCameraStates,
            pendingFocusWearerId = pendingFocusWearerId,
            notificationSource = pendingFocusNotificationSource,
            hasUserLocation = latestUserLocation != null,
            isFirstNonEmptyRender = mainCardWatchUsers.isNotEmpty() && !hasAppliedInitialCameraForNonEmptyData
        )
        val resolution = InitialMapCameraResolver.resolve(resolverInput)

        Timber.i(
            "MainActivity: startup_camera_decision source=%s notificationSource=%s totalWatches=%d mappableWatches=%d pendingFocus=%s plan=%s fallbackUsed=%b",
            source,
            pendingFocusNotificationSource ?: "none",
            watchCameraStates.size,
            watchCameraStates.count { it.isMappable },
            pendingFocusWearerId ?: "none",
            resolution.plan::class.simpleName,
            resolution.fallbackUsed
        )

        if (resolution.selectionWearerId != null &&
            (resolution.plan !is InitialCameraPlan.FocusWearer ||
                resolution.plan.wearerId != resolution.selectionWearerId)
        ) {
            selectWatchByObjectId(resolution.selectionWearerId)
        }

        val executionResult = when (val plan = resolution.plan) {
            is InitialCameraPlan.FocusWearer -> {
                val focusResult = focusOnWatch(plan.wearerId, plan.zoom)
                "focus(found=${focusResult.watchFound},selected=${focusResult.watchSelected},mappable=${focusResult.watchMappable})"
            }
            InitialCameraPlan.FitAllMappable -> {
                googleMapRetriever.fitMappableWearers()
                "fit_all_mappable"
            }
            InitialCameraPlan.CenterOnUser -> {
                val location = latestUserLocation
                if (location != null) {
                    googleMapRetriever.centerOnUser(location)
                    "center_on_user"
                } else {
                    "center_on_user_skipped_no_location"
                }
            }
            InitialCameraPlan.NoOp -> "no_op"
        }

        if (resolution.consumePendingFocus) {
            pendingFocusWearerId = null
            pendingFocusNotificationSource = null
        }

        if (pendingOpenLingoProgress && resolution.selectionWearerId != null) {
            val watch = watchCardsAdapter.currentList
                .find { it.watchUser.watch?.objectId == resolution.selectionWearerId }
                ?.watchUser?.watch
            if (watch != null) {
                Timber.d("MainActivity: Auto-opening Lingo Progress for wearerId=${watch.objectId}")
                startActivity(Intent(this, WatchSettingsActivity::class.java).apply {
                    putExtra(Constants.EXTRA_WEARER_ID, watch.objectId)
                    putExtra(Constants.EXTRA_DEVICE_ID, watch.deviceId)
                    putExtra(Constants.EXTRA_OPEN_LINGO_PROGRESS, true)
                })
                pendingOpenLingoProgress = false
            }
        }

        if (mainCardWatchUsers.isNotEmpty() && !hasAppliedInitialCameraForNonEmptyData) {
            hasAppliedInitialCameraForNonEmptyData = when (resolution.plan) {
                is InitialCameraPlan.FocusWearer,
                InitialCameraPlan.FitAllMappable -> true
                InitialCameraPlan.CenterOnUser,
                InitialCameraPlan.NoOp -> false
            }
        }

        Timber.i(
            "MainActivity: startup_camera_outcome source=%s execution=%s selectedWearer=%s pendingConsumed=%b",
            source,
            executionResult,
            resolution.selectionWearerId ?: "none",
            resolution.consumePendingFocus
        )
    }

    private fun selectWatchByObjectId(objectId: String): Boolean {
        val position = watchCardsAdapter.currentList.findWearerIndex(objectId)
        if (position < 0) return false

        selectedWearerId = watchCardsAdapter.currentList[position].watchUser.watch?.objectId
        renderDisconnectedCardFor(watchCardsAdapter.currentList[position])
        // Highlight + scroll the pager to it. Map focus is owned by the camera plan,
        // so this does not run the map side-effects. Instant during the initial
        // restore (before live tracking is on), smooth afterwards.
        moveSelectionTo(position, scrollCard = true, smooth = restoreApplied)
        return true
    }

    /**
     * Restores the selection (selectedIndex, highlight, banner, active wearer) by
     * watch identity against the freshly-committed list, falling back to the first
     * watch. Skipped (returns null) when a pending notification focus owns the
     * selection or the list is empty; the caller lands the pager afterwards.
     */
    private fun reconcileSelectionAfterListCommit(
        mainCardWatchUsers: List<MainCardWatchUser>,
        selectionToRestore: String?
    ): Int? {
        if (pendingFocusWearerId != null) return null
        if (mainCardWatchUsers.isEmpty()) {
            selectedWearerId = null
            renderDisconnectedCardFor(null)
            return null
        }
        val selectedPosition = selectionToRestore
            ?.let { id -> mainCardWatchUsers.findWearerIndex(id).takeIf { it >= 0 } }
            ?: 0
        val selectedWatch = mainCardWatchUsers[selectedPosition]
        selectedWearerId = selectedWatch.watchUser.watch?.objectId
        renderDisconnectedCardFor(selectedWatch)
        googleMapRetriever.setActiveWearer(selectedWearerId)
        selectedIndex = selectedPosition
        watchSelectorAdapter.setSelectedIndex(selectedPosition)
        return selectedPosition
    }

    private fun renderDisconnectedCardFor(
        selectedWatch: MainCardWatchUser?,
        showDelayMs: Long = DISCONNECTED_CARD_SHOW_DELAY_DATA_MS
    ) {
        val snapshot = selectedWatch?.watchUser?.watch?.let { wearer ->
            WatchSelectionSnapshot(
                wearerId = wearer.objectId,
                deviceId = wearer.deviceId,
                isConnected = wearer.isConnected()
            )
        }
        if (SelectionStateResolver.shouldShowDisconnectedCard(snapshot)) {
            disconnectedCardState = selectedWatch?.watchUser?.watch?.let { buildDisconnectedCardState(it) }
            bindDisconnectedCard()
            showDisconnectedCardDebounced(showDelayMs)
        } else {
            hideDisconnectedCard()
        }
    }

    /**
     * Reads the presentation data the banner needs off the wearer.
     *
     * Every column is `has()`-guarded on purpose: `ParseDelegate<T>` returns null for a
     * column that isn't present even when the property is declared non-null, and reading
     * one unguarded is the crash class behind several production incidents here.
     * `lastTKQ` has no typed accessor at all, so it goes through `getDate`.
     */
    private fun buildDisconnectedCardState(wearer: Wearer): DisconnectedCardState =
        DisconnectedCardState(
            wearerId = wearer.objectId,
            deviceId = if (wearer.has("deviceId")) wearer.deviceId else null,
            lastSeenAt = wearer.lastCheckInAt(),
            batteryPercentage = wearer.reportedBatteryPercentage(),
            causeIsBattery = wearer.ranOutOfBattery()
        )

    /**
     * Renders [disconnectedCardState] into the banner. Safe to call repeatedly — it is
     * invoked on every evaluation, immediately before the fade-in, and once a minute by
     * [startDisconnectedCardTicker].
     */
    private fun bindDisconnectedCard() {
        val state = disconnectedCardState ?: return
        binding.disconnectedCardCauseIcon.setImageResource(
            if (state.causeIsBattery) R.drawable.ic_no_battery else R.drawable.no_sim
        )

        val lastSeenAt = state.lastSeenAt
        val elapsedText = if (lastSeenAt == null) {
            getString(R.string.last_update_unavailable)
        } else {
            DateUtil.getElapsedSince(lastSeenAt).toString()
        }

        // The watch has never checked in: give the whole row to saying so. A watch with no
        // check-in on record has no battery reading worth trusting either, and this copy is
        // long enough to need two lines in most locales ("Letztes Update: nicht verfügbar").
        val hasLastSeen = lastSeenAt != null
        // When the battery is what took the watch off the air, report it as flat rather
        // than echoing the last reading. The final number the watch managed to send (7%,
        // 4%) is not the level it is at now — it is the level it had on the way down — and
        // pairing a live-looking percentage with "Disconnected" reads as "it still has
        // charge, so why is it offline?". Above the threshold the reading is shown as-is:
        // there, a healthy battery is exactly the point, because it says the watch is fine
        // and the problem is signal.
        val batteryPercentage = when {
            !hasLastSeen -> null
            state.causeIsBattery -> 0
            else -> state.batteryPercentage
        }
        val batteryText = batteryPercentage?.let { getString(R.string.item_watch_battery, it) }

        binding.disconnectedCardTimeIcon.isVisible = hasLastSeen
        binding.disconnectedCardLastSeen.maxLines = if (hasLastSeen) 1 else 2

        // Only write when the value actually changed. The ticker re-runs this every minute,
        // and each mutation of a view inside the card notifies the accessibility subtree —
        // including a same-value setVisibility, which is why these are guarded too rather
        // than assigned unconditionally.
        val showBattery = batteryText != null
        if (binding.disconnectedCardBatteryIcon.isVisible != showBattery) {
            binding.disconnectedCardBatteryIcon.isVisible = showBattery
        }
        if (binding.disconnectedCardBattery.isVisible != showBattery) {
            binding.disconnectedCardBattery.isVisible = showBattery
        }
        if (binding.disconnectedCardLastSeen.text?.toString() != elapsedText) {
            binding.disconnectedCardLastSeen.text = elapsedText
        }
        if (batteryPercentage != null) {
            binding.disconnectedCardBatteryIcon.setImageResource(batteryLevelIcon(batteryPercentage))
            if (binding.disconnectedCardBattery.text?.toString() != batteryText) {
                binding.disconnectedCardBattery.text = batteryText
            }
            dropBatteryIfItCrowdsTheElapsedTime()
        }

        // Built here rather than pinned in XML: the children are excluded from the
        // accessibility tree so one node speaks for the card, which means anything not
        // folded in here is invisible to a screen reader — including the elapsed time and
        // battery this redesign exists to surface. It is deliberately NOT enough to guard
        // this assignment and leave a live region armed: the elapsed string really does
        // change every minute for the first hour, so the card is only a live region for its
        // appearance (see showDisconnectedCardDebounced).
        val spoken = listOfNotNull(
            getString(R.string.main_prompt_device_disconnected_title),
            elapsedText,
            batteryText,
            getString(R.string.main_prompt_device_disconnected_button)
        ).joinToString(". ")
        if (binding.disconnectedCard.contentDescription?.toString() != spoken) {
            binding.disconnectedCard.contentDescription = spoken
        }
    }

    /**
     * Picks the gauge matching a reported battery level.
     *
     * The row shows a percentage, so it needs a level indicator. `ic_no_battery` — the
     * empty-shell-with-warning glyph — stays reserved for the cause icon, where "the watch
     * died" is actually what happened.
     */
    private fun batteryLevelIcon(percentage: Int): Int = when {
        // Empty gauge, red fill. Deliberately NOT ic_no_battery: that vector is 24x34dp
        // portrait and would letterbox to a speck inside this 20x10dp landscape slot. It
        // stays on the 28dp cause glyph, where it fits and where it is already shown.
        percentage <= 0 -> R.drawable.ic_space_2_battery_0
        percentage <= 35 -> R.drawable.ic_space_2_battery_25
        percentage <= 60 -> R.drawable.ic_space_2_battery_50
        percentage <= 85 -> R.drawable.ic_space_2_battery_75
        else -> R.drawable.ic_space_2_battery_full
    }

    /**
     * When the meta row runs out of width, give it up from the battery rather than the
     * elapsed time.
     *
     * The elapsed time takes the row's slack (weight 1) and so is the value that
     * ellipsizes first — at a 2.0 font scale "vor 3 Std." was clipping to "vor", losing
     * precisely the information this banner exists to carry, while a redundant "14%" kept
     * its space. Battery is already on the wearer card below; elapsed time is not shown
     * anywhere else on this screen.
     *
     * Measured rather than thresholded on fontScale, so it also covers long locales at
     * normal scale and small screens. Self-correcting: every bind re-shows the battery
     * before this runs again, so a later, shorter string brings it back.
     */
    private fun dropBatteryIfItCrowdsTheElapsedTime() {
        val elapsed = binding.disconnectedCardLastSeen
        elapsed.post {
            val ellipsisCount = elapsed.layout?.getEllipsisCount(0) ?: 0
            if (ellipsisCount > 0) {
                binding.disconnectedCardBatteryIcon.isVisible = false
                binding.disconnectedCardBattery.isVisible = false
            }
        }
    }

    /**
     * Keeps the relative time honest while the card sits on screen.
     *
     * The banner shows an elapsed duration, which a reader takes to be live, but nothing
     * else on this screen re-evaluates on a timer — data refreshes are event-driven by
     * design. So the ticker exists purely to reformat the timestamp already held in
     * [disconnectedCardState]: no query, no network, no Parse read.
     *
     * Cancelled by [hideDisconnectedCard], which onPause calls. It is only ever started
     * from a reveal that has already checked the Activity is at least STARTED, so it
     * cannot be spun up behind a backgrounded screen.
     */
    private fun startDisconnectedCardTicker() {
        disconnectedCardTicker?.cancel()
        disconnectedCardTicker = lifecycleScope.launch {
            while (isActive) {
                delay(DISCONNECTED_CARD_TICK_MS)
                bindDisconnectedCard()
            }
        }
    }

    /**
     * Shows the disconnected card only after the disconnected state has persisted
     * for [delayMs]; a connected update within the window cancels the pending show
     * (see the delay constants for why). A new request only ever TIGHTENS the
     * pending deadline — e.g. a user swipe (300ms) shortens a pending data-driven
     * show (1200ms) — never extends it, so repeated LiveQuery refreshes can't
     * starve the card from ever appearing.
     */
    private fun showDisconnectedCardDebounced(delayMs: Long) {
        if (binding.disconnectedCard.isVisible) return
        val deadline = SystemClock.elapsedRealtime() + delayMs
        if (pendingDisconnectedCardShow?.isActive == true && pendingDisconnectedCardShowAt <= deadline) return
        pendingDisconnectedCardShow?.cancel()
        pendingDisconnectedCardShowAt = deadline
        pendingDisconnectedCardShow = lifecycleScope.launch {
            delay(delayMs)
            // Re-bind before revealing. renderDisconnectedCardFor already bound when it
            // scheduled this, but a swipe from wearer A to wearer B inside the window
            // replaces the state without rescheduling (the deadline only tightens), so
            // without this the card would fade in showing A's data under B's selection.
            // onPause hides the card, but a LiveQuery push or list commit delivered in the
            // onPause -> onStop gap can schedule a fresh show whose delay outlives onStop.
            // lifecycleScope only cancels at ON_DESTROY, so without this the card would be
            // revealed — and the ticker started — while the Activity is off screen.
            if (!lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) return@launch
            bindDisconnectedCard()
            binding.disconnectedCard.apply {
                alpha = 0f
                // Armed for the appearance only, then disarmed. Left armed permanently it
                // would re-speak the whole card on every ticker repaint — and the elapsed
                // string genuinely changes each minute for the first hour, so no
                // same-value guard can suppress that.
                accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
                visibility = View.VISIBLE
                animate()
                    .alpha(1f)
                    .setDuration(DISCONNECTED_CARD_FADE_MS)
                    .withEndAction { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_NONE }
                    .start()
            }
            startDisconnectedCardTicker()
        }
    }

    /**
     * Hides the card instantly — no fade-out. The disconnected state clearing is
     * good news and shouldn't linger; only the appearance is animated (see
     * [showDisconnectedCardDebounced]). Cancels any pending/in-flight show so a
     * queued fade-in can't resurrect the card right after we hide it. Doubles as
     * the pause / empty-state reset, so resume always starts from a clean slate.
     */
    private fun hideDisconnectedCard() {
        pendingDisconnectedCardShow?.cancel()
        pendingDisconnectedCardShow = null
        disconnectedCardTicker?.cancel()
        disconnectedCardTicker = null
        disconnectedCardState = null
        binding.disconnectedCard.animate().cancel()
        binding.disconnectedCard.visibility = View.GONE
        binding.disconnectedCard.alpha = 1f
        // Cancelling the animator skips its end action, so disarm here too — otherwise a
        // hide mid-fade would leave the region armed for the next show's repaints.
        binding.disconnectedCard.accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_NONE
    }

    private fun MainCardWatchUser.matchesWearerIdentifier(identifier: String?): Boolean {
        if (identifier.isNullOrEmpty()) return false
        val watch = watchUser.watch ?: return false
        return watch.objectId == identifier || watch.deviceId == identifier
    }

    private fun updateMapPaddingForCurrentState() {
        binding.root.post {
            val padding = MainMapPaddingCalculator.calculate(
                MainMapLayoutSnapshot(
                    rootHeightPx = binding.root.height,
                    isWearersLayoutVisible = binding.wearersLayout.isVisible,
                    wearersLayoutHeightPx = binding.wearersLayout.height,
                    wearersLayoutTopPx = binding.wearersLayout.top,
                    wearersRecyclerTopInLayoutPx = binding.wearersRecyclerView.top.takeIf { binding.wearersRecyclerView.height > 0 },
                    wearerSelectorTopInLayoutPx = binding.wearerSelectorRecyclerView.top.takeIf { binding.wearerSelectorRecyclerView.height > 0 },
                    isNoWearersLayoutVisible = binding.noWearersLayout.isVisible,
                    noWearersLayoutHeightPx = binding.noWearersLayout.height,
                    isLoadingLayoutVisible = binding.loadingLayout.isVisible,
                    loadingLayoutHeightPx = binding.loadingLayout.height
                )
            )
            googleMapRetriever.updateMapPadding(padding.bottomPaddingPx)
        }
    }

    // =============================================================================
    // MAP IMPLEMENTATION
    // =============================================================================

    override fun onMapReady(googleMap: GoogleMap) {
        Timber.d("MainActivity: onMapReady called")

        Timber.d("MainActivity: Setting up GoogleMapRetriever with map")
        googleMapRetriever.setMap(googleMap, binding.mapInfoOverlayContainer)
        updateMapPaddingForCurrentState()

        checkLocationPermission()
        // Native My Location feature is now enabled in GoogleMapRetriever.setMap()
        // No need to manually set user marker - Google Maps handles this automatically
        enableMyLocationButton()

        Timber.d("MainActivity: Map setup completed")
    }

    private fun enableMyLocationButton() {
        with(binding.buttonMyLocation) {
            setOnClickListener {
                googleMapRetriever.showAllMarkersInMap()
            }
            // Visibility will be set when data is loaded, not here
        }
    }

    // =============================================================================
    // PERMISSION HANDLING
    // =============================================================================

    private fun checkLocationPermission() {
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED -> {
                // Permission granted, do nothing
            }
            shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION) -> {
                // onMapReady is delivered asynchronously by Play Services and can arrive after the
                // activity is backgrounded and its state saved (Crashlytics 17417f37...); committing
                // a DialogFragment then throws IllegalStateException. Skip — the next onMapReady
                // (next launch/recreation) re-runs this check.
                if (isFinishing || supportFragmentManager.isStateSaved) {
                    Timber.w("MainActivity: skipping location permission rationale dialog, activity state already saved")
                    return
                }
                val fragmentTag = "momoDialog"
                if (supportFragmentManager.findFragmentByTag(fragmentTag) == null) {
                    val dialogFragment = MomoDialogFragment.Builder(this)
                        .setType(Constants.PERMISSION_LOCATION)
                        .build()
                    dialogFragment.show(supportFragmentManager, fragmentTag)
                }
            }
            else -> {
                requestLocationPermissionLauncher.launch(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    )
                )
            }
        }
    }

    /**
     * For phones with Android S or higher, checks if the user has the proper Bluetooth permissions
     * and requests them if necessary
     */
    private fun checkBluetoothPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
                    && ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED -> {
                // Permission granted, do nothing
            }
            shouldShowRequestPermissionRationale(Manifest.permission.BLUETOOTH_CONNECT)
                    || shouldShowRequestPermissionRationale(Manifest.permission.BLUETOOTH_SCAN) -> {
                // TODO: Show message explaining why we need this permission
            }
            else -> {
                requestBluetoothPermissionsLauncher.launch(
                    arrayOf(
                        Manifest.permission.BLUETOOTH_SCAN,
                        Manifest.permission.BLUETOOTH_CONNECT
                    )
                )
            }
        }
    }

    /**
     * For phones with Android T or higher, checks if the user has the proper Notification permissions
     * and requests them if necessary
     */
    private fun checkNotificationPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED -> {
                // Permission granted, do nothing
            }
            shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) -> {
                // TODO: Show message explaining why we need this permission
            }
            else -> {
                requestNotificationPermissionsLauncher.launch(arrayOf(Manifest.permission.POST_NOTIFICATIONS))
            }
        }
    }

    // =============================================================================
    // DIALOG INTERFACE IMPLEMENTATIONS
    // =============================================================================

    fun onDialogDismissed() {
        resolvingError = false
    }

    override fun onMomoDialogContinue(type: Int) {
        when (type) {
            Constants.PERMISSION_LOCATION -> {
                requestLocationPermissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
            }
            Constants.PERMISSION_PHONE -> {
                requestCallPermissionLauncher.launch(Manifest.permission.CALL_PHONE)
            }
        }
    }

    override fun onMomoDialogDismiss() {
        // Intentionally left blank.
    }

    // =============================================================================
    // NOTIFICATION INTENT HANDLING
    // =============================================================================

    /**
     * Handle intent extras for wearer focus (from SOS/geofence notifications).
     * If watches are already loaded, focuses immediately. Otherwise, stores the ID
     * to focus when watches finish loading.
     */
    private fun handleWearerFocusIntent(intent: Intent) {
        val notificationSource = intent.getStringExtra(Constants.EXTRA_NOTIFICATION_SOURCE)
        if (notificationSource == Constants.NOTIFICATION_SOURCE_GEOFENCE) {
            Timber.d("MainActivity: Cancelling all geofence notifications")
            GeofenceNotificationHandler.cancelAllGeofenceNotifications(this)
        }
        intent.removeExtra(Constants.EXTRA_NOTIFICATION_SOURCE)

        if (intent.hasExtra(Constants.EXTRA_WEARER_ID)) {
            pendingFocusWearerId = intent.getStringExtra(Constants.EXTRA_WEARER_ID)
            pendingFocusNotificationSource = notificationSource
            intent.removeExtra(Constants.EXTRA_WEARER_ID)
            Timber.d("MainActivity: Received wearer focus intent for wearerId: $pendingFocusWearerId")

            if (intent.getBooleanExtra(Constants.EXTRA_OPEN_LINGO_PROGRESS, false)) {
                pendingOpenLingoProgress = true
                intent.removeExtra(Constants.EXTRA_OPEN_LINGO_PROGRESS)
                Timber.d("MainActivity: Lingo Progress deep-link requested")
            }

            if (watchCardsAdapter.currentList.isNotEmpty() && !pendingFocusWearerId.isNullOrEmpty()) {
                applyInitialCameraPlan(watchCardsAdapter.currentList, source = "intent_focus")
            }
        }
    }

    /**
     * Focus on a specific watch by its objectId.
     * Scrolls the watch list and focuses the map marker.
     * Always selects the watch card if found; map movement only happens for mappable watches.
     */
    private fun focusOnWatch(objectId: String, zoom: Float = BALANCED_SINGLE_WATCH_ZOOM): FocusWearerResult {
        Timber.d("MainActivity: focusOnWatch called for objectId: $objectId")
        val position = watchCardsAdapter.currentList.findWearerIndex(objectId)
        if (position < 0) {
            Timber.w("MainActivity: Could not find watch with objectId: $objectId")
            return FocusWearerResult(
                watchFound = false,
                watchSelected = false,
                watchMappable = false
            )
        }

        // Highlight + scroll the pager to it; map focus handled explicitly below.
        moveSelectionTo(position, scrollCard = true, smooth = restoreApplied)
        val watchCard = watchCardsAdapter.currentList[position]
        val selectedWatchId = watchCard.watchUser.watch?.objectId ?: objectId
        selectedWearerId = selectedWatchId
        renderDisconnectedCardFor(watchCard)
        googleMapRetriever.setActiveWearer(selectedWatchId)
        val watchMappable = watchCard.isMappableForMap()
        if (watchMappable) {
            googleMapRetriever.focusWearer(selectedWatchId, zoom)
        }
        return FocusWearerResult(
            watchFound = true,
            watchSelected = true,
            watchMappable = watchMappable
        )
    }

    // =============================================================================
    // WATCH LISTENER INTERFACE IMPLEMENTATIONS
    // =============================================================================

    override fun onLocateWearer(objectId: String) {
        googleMapRetriever.locateWearer(objectId)
    }

    override fun onPerformCall(wearer: Wearer) {
        val items = mutableListOf(getString(R.string.main_perform_call_dialog_phone))

        if (wearer.hasVideocall()) {
            items.add(getString(R.string.main_perform_call_dialog_video))
        }

        MaterialAlertDialogBuilder(this)
            .setTitle(getString(R.string.main_perform_call_dialog_title))
            .setItems(items.toTypedArray()) { dialog, which ->
                when (which) {
                    0 -> callWearer(wearer)
                    1 -> videocallWearer(wearer)
                }
                dialog.dismiss()
            }
            .show()
    }

    override fun onNoPhoneNumber(wearer: Wearer) {
        val dialogFragment = InvalidWatchNumberDialogFragment.newInstance(wearer)
        dialogFragment.setListener(object :
            InvalidWatchNumberDialogFragment.InvalidWatchNumberDialogListener {
            override fun onNumberEnter(phone: String) {
                mainViewModel.saveNumberEnter(phone, wearer)
            }

            override fun onCancel() {
                // No action needed on cancel
            }
        })
        dialogFragment.show(
            supportFragmentManager,
            "Invalid watch number dialog"
        )
    }

    override fun onOpenSettings(watchUser: MainCardWatchUser, image: View, name: View) {
        val newIntent = Intent(this, WatchSettingsActivity::class.java).apply {
            val watch = watchUser.watchUser.watch!!
            putExtra(Constants.EXTRA_WEARER_ID, watch.objectId)
            putExtra(Constants.EXTRA_DEVICE_ID, watch.deviceId)
        }
        startActivity(newIntent)
    }

    // =============================================================================
    // NETWORK STATE LISTENER IMPLEMENTATION
    // =============================================================================

    override fun onNetworkAvailable() {
        hasNetworkConnection = true
        binding.noNetworkLayout.visibility = View.GONE
    }

    override fun onNetworkUnavailable() {
        hasNetworkConnection = false
        binding.noNetworkLayout.visibility = View.VISIBLE
    }

    // =============================================================================
    // CALL FUNCTIONALITY
    // =============================================================================

    private fun callWearer(wearer: Wearer) {
        this.phoneNumber = wearer.phone
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED -> {
                makeCall()
            }
            shouldShowRequestPermissionRationale(Manifest.permission.CALL_PHONE) -> {
                val fragmentTag = "momoDialog"
                if (supportFragmentManager.findFragmentByTag(fragmentTag) == null) {
                    val dialogFragment = MomoDialogFragment.Builder(this)
                        .setType(Constants.PERMISSION_PHONE)
                        .build()
                    supportFragmentManager
                        .beginTransaction()
                        .add(dialogFragment, fragmentTag)
                        .commitAllowingStateLoss()
                }
            }
            else -> {
                requestCallPermissionLauncher.launch(Manifest.permission.CALL_PHONE)
            }
        }
    }

    private fun videocallWearer(wearer: Wearer) {
        if (!hasNetworkConnection) {
            Toast.makeText(this, R.string.network_disconnected, Toast.LENGTH_LONG).show()
            return
        }
        val userId = user?.objectId ?: run {
            Timber.w("MainActivity: videocallWearer skipped — no current user")
            return
        }
        val url = if (wearer.has("image")) wearer.getParseFile("image")?.url else ""
        val intent = Intent(this, CallActivity::class.java).apply {
            putExtra("type", "user")
            putExtra("typeId", userId)
            putExtra("contactName", wearer.name())
            putExtra("contactImage", url)
            putExtra("isOutgoing", true)
            putExtra("intentAction", "")
            putExtra("wearerDeviceId", wearer.deviceId)
            putExtra("wearerModel", wearer.modelInt)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(intent)
    }

    private fun makeCall() {
        try {
            val phone = getString(R.string.uri_call, phoneNumber).toUri()
            val intent = Intent(Intent.ACTION_CALL).apply {
                data = phone
            }
            if (intent.resolveActivity(packageManager) != null) {
                startActivity(intent)
            }
        } catch (e: SecurityException) {
            Timber.e(e)
            recordNonFatalError(e, "Error on trying to make call")
        }
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    private fun saveCurrentUserEmailInPreferences() {
        user?.email?.let { userEmail ->
            getSharedPreferences(Constants.MOMO_PREFS, 0).edit {
                putString("lastSessionMail", userEmail)
            }
        }
    }

    private fun checkVideocallNotificationCategory() {
        val channelId = NotificationChannelCategory.VIDEOCALL.id
        val isChannelEnabled = notificationChannelChecker.isNotificationChannelEnabled(this, channelId)

        if (!isChannelEnabled) {
            VideocallNotificationChannelDisabledDialog().show(supportFragmentManager, channelId)
        }
    }

    private fun tryShowSubscriptionNpsIfReady() {
        if (!subscriptionNpsViewModel.canShowPending(hasCompletedInitialWatchLoad)) {
            return
        }
        if (subscriptionNpsShowJob?.isActive == true) {
            return
        }

        subscriptionNpsShowJob = lifecycleScope.launch {
            delay(SUBSCRIPTION_NPS_SHOW_DELAY_MS)
            if (!subscriptionNpsViewModel.canShowPending(hasCompletedInitialWatchLoad)) {
                return@launch
            }
            if (supportFragmentManager.findFragmentByTag(SUBSCRIPTION_NPS_DIALOG_TAG) != null) {
                return@launch
            }
            // Don't stack the survey on top of another prompt that may have appeared during the delay.
            if (isAnotherPromptVisible()) {
                Timber.d("MainActivity: deferring subscription NPS, another prompt is visible")
                return@launch
            }
            // The activity may have been backgrounded during the delay; committing the dialog
            // after onSaveInstanceState throws IllegalStateException (same class as the onMapReady
            // path above). Guard before consuming the pending scheduler so the survey re-shows on
            // the next resume.
            if (isFinishing || supportFragmentManager.isStateSaved) {
                Timber.w("MainActivity: skipping subscription NPS, activity state already saved")
                return@launch
            }

            val scheduler = subscriptionNpsViewModel.consumePendingScheduler() ?: return@launch
            Timber.d("MainActivity: showing subscription NPS dialog schedulerId=${scheduler.schedulerId}")
            SubscriptionNpsDialog.newInstance(scheduler)
                .show(supportFragmentManager, SUBSCRIPTION_NPS_DIALOG_TAG)
        }
    }

    /** True if any other survey/prompt is currently on screen and the NPS dialog must not overlay it. */
    private fun isAnotherPromptVisible(): Boolean {
        if (reviewViewModel.reviewDialogVisible.value == true) return true
        if (requestSimViewModel.showPopup.value == true) return true
        if (upgradePlanPopupViewModel.showPopup.value == true) return true
        val fm = supportFragmentManager
        return fm.findFragmentByTag(NPSController.NPS_DIALOG_TAG) != null ||
            fm.findFragmentByTag(REQUEST_SIM_DIALOG_TAG) != null ||
            fm.findFragmentByTag(UPGRADE_PLAN_POPUP_DIALOG_TAG) != null
    }

    private fun showSubscriptionNpsConfirmation() {
        if (isFinishing || supportFragmentManager.isStateSaved) return
        if (supportFragmentManager.findFragmentByTag(SUBSCRIPTION_NPS_SUBMIT_DIALOG_TAG) != null) return
        SubscriptionNpsSubmitDialog().show(supportFragmentManager, SUBSCRIPTION_NPS_SUBMIT_DIALOG_TAG)
    }

    private fun searchForSubscriptionNps() {
        val userId = ParseUser.getCurrentUser()?.objectId ?: return
        subscriptionNpsViewModel.checkForNps(userId)
    }

    private fun searchForNPS() {
        val prefs = application.applicationContext.getSharedPreferences("MyPrefs", MODE_PRIVATE)
        val lastExecutionTime = prefs.getLong("lastExecutionTime", 0)
        val currentTime = Calendar.getInstance().timeInMillis
        if (currentTime - lastExecutionTime >= TimeUnit.DAYS.toMillis(1)) {
            // lifecycleScope (not an unscoped CoroutineScope): the Parse round-trip is
            // cancelled if the activity is destroyed, so the dialog can never be shown
            // against a dead FragmentManager; onSuccess runs on Main.
            lifecycleScope.launch {
                runCatching {
                    withContext(Dispatchers.IO) {
                        val params = mapOf(
                            "userId" to ParseUser.getCurrentUser().objectId
                        )
                        ParseCloud.callFunction<NPSScheduler?>("findNPSScheduler", params)
                    }
                }.onFailure {
                    recordNonFatalError(it, "Error on searching for NPS")
                }.onSuccess { scheduler ->
                    if (scheduler == null) {
                        // Nothing pending — stamp so we don't re-query for a day.
                        prefs.edit { putLong("lastExecutionTime", currentTime) }
                        return@onSuccess
                    }
                    // The activity may have been backgrounded during the round-trip:
                    // lifecycleScope only cancels at destroy, so this still runs while
                    // stopped, and committing the dialog after onSaveInstanceState
                    // fails (Crashlytics 69f12062) — while the cooldown was stamped
                    // anyway, silently losing the survey for another day. Skip WITHOUT
                    // stamping so the next launch retries (same guard as the
                    // subscription NPS above).
                    if (isFinishing || supportFragmentManager.isStateSaved) {
                        Timber.w("MainActivity: skipping NPS dialog, activity state already saved")
                        return@onSuccess
                    }
                    npsController.showNPS(scheduler, this@MainActivity.supportFragmentManager)
                    prefs.edit { putLong("lastExecutionTime", currentTime) }
                }
            }
        }
    }

    // =============================================================================
    // ERROR DIALOG FRAGMENT
    // =============================================================================

    class ErrorDialogFragment : androidx.fragment.app.DialogFragment() {
        override fun onCreateDialog(savedInstanceState: Bundle?): android.app.Dialog {
            val errorCode = requireArguments().getInt(DIALOG_ERROR)
            return GoogleApiAvailability.getInstance().getErrorDialog(
                requireActivity(), errorCode, REQUEST_RESOLVE_ERROR
            )!!
        }

        override fun onDismiss(dialog: android.content.DialogInterface) {
            (activity as? MainActivity)?.onDialogDismissed()
            super.onDismiss(dialog)
        }
    }
}
