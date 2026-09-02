package com.sosmartlabs.momotabletpadres.main

import android.Manifest
import android.animation.ArgbEvaluator
import android.app.Dialog
import android.content.DialogInterface
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.fragment.app.DialogFragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.PagerSnapHelper
import androidx.recyclerview.widget.RecyclerView
import com.google.android.gms.common.GoogleApiAvailability
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog.recordNonFatalError
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.SettingsConstants
import com.sosmartlabs.momotabletpadres.settings.SettingsActivity
import com.sosmartlabs.momotabletpadres.tabletsettings.TabletActivity
import com.sosmartlabs.momotabletpadres.databinding.ActivityMainBinding
import com.sosmartlabs.momotabletpadres.geofences.ui.GeofenceViewModel
import com.sosmartlabs.momotabletpadres.link.LinkDeviceActivity
import com.sosmartlabs.momotabletpadres.dispatch.DispatchActivity
import com.sosmartlabs.momotabletpadres.models.LoginStatus
import com.sosmartlabs.momotabletpadres.sharedprefs.LinkInvitationPrefs
import com.sosmartlabs.momotabletpadres.main.ui.fragment.MainFragment
import com.sosmartlabs.momotabletpadres.main.ui.adapter.TabletMainAdapter
import com.sosmartlabs.momotabletpadres.main.ui.adapter.TabletSelectorAdapter
import com.sosmartlabs.momotabletpadres.main.ui.adapter.TabletSelectorViewHolder
import com.sosmartlabs.momotabletpadres.models.MainCardTabletUser
import com.sosmartlabs.momotabletpadres.nps.FeedbackNPSController
import com.sosmartlabs.momotabletpadres.utils.Constants
import com.sosmartlabs.momotabletpadres.utils.NetworkStateReceiver
import com.sosmartlabs.momotabletpadres.main.model.TabletListener
import com.sosmartlabs.momotabletpadres.main.ui.MainViewModel
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.viewmodels.KidProfileViewModel
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.utils.EdgeToEdgeUtils
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber
import javax.inject.Inject
import kotlin.math.roundToInt
import androidx.core.net.toUri
import androidx.core.view.isEmpty

@OptIn(ExperimentalCoroutinesApi::class)
@AndroidEntryPoint
class MainActivity : AppCompatActivity(), TabletListener, NetworkStateReceiver.NetworkStateListener {

    @Inject lateinit var feedbackNPSController: FeedbackNPSController

    @Inject lateinit var linkInvitationPrefs: LinkInvitationPrefs

    companion object {
        private const val REQUEST_RESOLVE_ERROR = 1001
        private const val STATE_RESOLVING_ERROR = "resolving_error"
        private const val DIALOG_ERROR = "dialog_error"
        private const val NAV_FILLER_VIEW_TAG = "nav_filler_view"
        // Card distance beyond which we instant-hop then glide the last card,
        // rather than smooth-scrolling through every card in between.
        private const val FAR_JUMP_THRESHOLD = 4
        /** objectId of a tablet to pre-select on launch (e.g. just-linked device). */
        const val EXTRA_SELECT_TABLET_ID = "extra_select_tablet_id"
    }

    private lateinit var binding: ActivityMainBinding
    private lateinit var tabletMainAdapter: TabletMainAdapter
    private lateinit var tabletSelectorAdapter: TabletSelectorAdapter
    private lateinit var currentFragment: MainFragment
    
    // Store original values to prevent accumulation on re-apply
    private var originalToolbarTopPadding: Int = -1
    private var originalBottomMargin: Int = -1
    private lateinit var currentParseUser: ParseUser
    
    private val mainViewModel: MainViewModel by viewModels()
    private val tabletViewModel: TabletViewModel by viewModels()
    private val kidProfileViewModel: KidProfileViewModel by viewModels()
    private val geofenceViewModel: GeofenceViewModel by viewModels()

    private var resolvingError = false
    private var hasNetworkConnection = true

    // --- Selector / main-card synchronization state ---
    // The PagerSnapHelper for the main pager; used to detect the settled card.
    private val mainSnapHelper = PagerSnapHelper()
    // The index currently rendered on screen (main card position == selector
    // highlight). NO_POSITION until the first list load resolves a selection.
    // The durable identity of the selection lives in mainViewModel.selectedTabletId.
    private var selectedIndex = RecyclerView.NO_POSITION
    // True only after the per-load restore has run; the main-card scroll
    // listener ignores settle events until then, so RecyclerView's own
    // scroll-state restore (e.g. on rotation) can never override the
    // identity-based restore.
    private var restoreApplied = false
    private var mainDiffDone = false
    private var selectorDiffDone = false
    private var pendingKeepId: String? = null
    // Incremented per list load; submitList commit callbacks captured against an
    // older generation are ignored, so a rapid double-resume can't let a stale
    // callback restore against a newer list.
    private var loadGeneration = 0
    // True while the user is physically dragging/flinging the pager, so the ring
    // cross-fade only runs for user gestures (never for tap/restore animations).
    private var pagerDraggedByUser = false
    private val ringArgb = ArgbEvaluator()
    private val ringSelectedColor by lazy { ContextCompat.getColor(this, R.color.colorPrimary) }
    private val ringUnselectedColor by lazy { ContextCompat.getColor(this, R.color.white) }

    private val requestNotificationPermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()) { _ ->
        // No-Op
    }

    private val requestLocationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        // No-Op
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Enable edge-to-edge with transparent system bars (no scrim)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT)
        )
        super.onCreate(savedInstanceState)
        Timber.d("MainActivity: onCreate started")
        
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupToolbar()
        adjustTopForStatusBar()
        adjustBottomForNavigationMode()

        resolvingError = savedInstanceState?.getBoolean(STATE_RESOLVING_ERROR, false) ?: false
        currentParseUser = ParseUser.getCurrentUser()

        // If launched to focus a specific device (e.g. just linked), seed the
        // selection so the first load's identity-restore lands on it.
        intent?.getStringExtra(EXTRA_SELECT_TABLET_ID)?.takeIf { it.isNotBlank() }?.let {
            mainViewModel.selectedTabletId = it
        }

        tabletMainAdapter = TabletMainAdapter(this)
        tabletSelectorAdapter = TabletSelectorAdapter()

        initViewAdapter()
        observeMainViewModel()
        setupClickListeners()

        feedbackNPSController.searchForNSP(this)

        Timber.d("MainActivity: onCreate completed")
    }

    override fun onResume() {
        super.onResume()
        Timber.d("MainActivity: onResume")

        checkNotificationPermissions()
        checkLocationPermission()
        mainViewModel.getTabletsByUserV2(currentParseUser)
        drainPendingInvitationLink()
    }

    /**
     * Drain any tablet-invitation deep link that was parked by
     * DispatchActivity (custom-scheme tap or App Link match). Routing
     * through SharedPreferences instead of intent extras keeps the link
     * alive across the auth/login flow and across process recreation.
     * Triggered on every onResume — the prefs consumer clears the value
     * once read, so a single deep-link tap only fires the receiver flow
     * once.
     */
    private fun drainPendingInvitationLink() {
        val tabletId = linkInvitationPrefs.consumePendingTabletId() ?: return
        Timber.i("MainActivity: Draining pending invitation deep link for tabletId=$tabletId")
        startActivity(
            Intent(this, LinkDeviceActivity::class.java)
                .putExtra(LinkDeviceActivity.EXTRA_PREFILL_TABLET_ID, tabletId)
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        Timber.d("MainActivity: onDestroy")
    }

    private fun setupToolbar() {
        Timber.d("MainActivity: setupToolbar() - started")
        try {
            // Make status bar transparent so the toolbar background extends behind it
            window.statusBarColor = Color.TRANSPARENT
            window.navigationBarColor = Color.TRANSPARENT
            WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = false
            Timber.d("MainActivity: setupToolbar() - finished")
        } catch (e: Exception) {
            Timber.e(e, "MainActivity: Error setting up toolbar")
            CrashlyticsLog.recordException(e, "MainActivity: Error setting up toolbar")
        }
    }

    /**
     * Adjusts the top toolbar layout to account for the status bar height dynamically.
     * This ensures the toolbar is positioned correctly on all devices regardless of
     * their status bar height.
     */
    private fun adjustTopForStatusBar() {
        Timber.d("MainActivity: adjustTopForStatusBar() - started")
        try {
            val additionalPadding = resources.getDimensionPixelSize(R.dimen.horizontal_margin_small)
            
            // Store original padding only once
            if (originalToolbarTopPadding < 0) {
                originalToolbarTopPadding = binding.toolbarLayout.paddingTop
            }
            
            ViewCompat.setOnApplyWindowInsetsListener(binding.toolbarLayout) { view, windowInsets ->
                val statusBarInsets = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars())
                val topInset = originalToolbarTopPadding + statusBarInsets.top + additionalPadding
                
                view.setPadding(view.paddingLeft, topInset, view.paddingRight, view.paddingBottom)
                
                // Remove listener after application
                ViewCompat.setOnApplyWindowInsetsListener(view, null)
                windowInsets
            }
            ViewCompat.requestApplyInsets(binding.toolbarLayout)
            
            Timber.d("MainActivity: adjustTopForStatusBar() - finished")
        } catch (e: Exception) {
            Timber.e(e, "MainActivity: Error adjusting top for status bar")
            CrashlyticsLog.recordException(e, "MainActivity: Error adjusting top for status bar")
        }
    }

    private fun adjustBottomForNavigationMode() {
        val hasButtonNavigation = EdgeToEdgeUtils.hasButtonNavigation(this)
        val navColorInt = ContextCompat.getColor(this, R.color.colorPrimary)

        if (originalBottomMargin < 0) {
            val lp = binding.bottom.layoutParams as? ViewGroup.MarginLayoutParams
            originalBottomMargin = lp?.bottomMargin ?: 0
        }

        // When using gesture navigation, restore original navigation bar and hide filler.
        if (!hasButtonNavigation) {
            window.navigationBarColor = Color.TRANSPARENT
            try {
                val existing = binding.root.findViewWithTag<View>(NAV_FILLER_VIEW_TAG)
                existing?.visibility = View.GONE
            } catch (e: Exception) {
                Timber.d(e, "MainActivity: Failed to hide nav filler view for gesture navigation")
            }
            applyBottomMargin(originalBottomMargin)
            return
        }

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, windowInsets ->
            val navBarInsets = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val navBarHeight = navBarInsets.bottom

            val extraOffset = try {
                resources.getDimensionPixelSize(R.dimen.button_navigation_offset)
            } catch (e: Exception) { 0 }

            val rawInset = if (navBarHeight > 0) {
                navBarHeight - extraOffset
            } else {
                try {
                    resources.getDimensionPixelSize(R.dimen.button_navigation_margin) - extraOffset
                } catch (e: Exception) { 0 }
            }
            val navInset = rawInset.coerceAtLeast(0)
            val bottomMargin = originalBottomMargin + navInset
            
            applyBottomMargin(bottomMargin)
            updateNavFillerView(navInset, navColorInt)
            
            // Remove listener after application
            ViewCompat.setOnApplyWindowInsetsListener(view, null)
            windowInsets
        }
        ViewCompat.requestApplyInsets(binding.root)

        try {
            window.navigationBarColor = navColorInt
        } catch (e: Exception) {
            Timber.d(e, "MainActivity: Failed to set navigation bar color")
        }
    }

    private fun applyBottomMargin(bottomMargin: Int) {
        try {
            val lp = binding.bottom.layoutParams as? ViewGroup.MarginLayoutParams
            if (lp != null) {
                lp.bottomMargin = bottomMargin
                binding.bottom.layoutParams = lp
            } else {
                Timber.w("MainActivity: bottom view layoutParams is not MarginLayoutParams")
            }
        } catch (e: Exception) {
            Timber.w(e, "MainActivity: Failed to adjust bottom margin for navigation mode")
        }
    }

    private fun updateNavFillerView(height: Int, navColor: Int) {
        try {
            val root = binding.root
            val existing = root.findViewWithTag<View>(NAV_FILLER_VIEW_TAG)

            if (height <= 0) {
                existing?.visibility = View.GONE
                return
            }

            if (existing == null) {
                // Only add filler if root is a ConstraintLayout
                if (root is androidx.constraintlayout.widget.ConstraintLayout) {
                    val filler = View(this).apply {
                        tag = NAV_FILLER_VIEW_TAG
                        setBackgroundColor(navColor)
                        id = View.generateViewId()
                    }
                    val params = androidx.constraintlayout.widget.ConstraintLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        height
                    )
                    params.bottomToBottom = androidx.constraintlayout.widget.ConstraintLayout.LayoutParams.PARENT_ID
                    root.addView(filler, params)
                } else {
                    Timber.w("MainActivity: Root layout is not a ConstraintLayout, cannot add nav filler view")
                }
            } else {
                existing.setBackgroundColor(navColor)
                existing.layoutParams.height = height
                existing.requestLayout()
                existing.visibility = View.VISIBLE
            }
        } catch (e: Exception) {
            Timber.w(e, "MainActivity: Failed to update nav filler view")
        }
    }

    private fun checkLocationPermission() {
        when {
            ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_COARSE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED -> {
                // Permission granted, do nothing
            }
            shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION) -> {
                requestLocationPermissionLauncher.launch(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    )
                )
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

    private fun setupClickListeners() {
        Timber.d("MainActivity: Setting up click listeners")
        with(binding) {
            emptyStateAddButton.setOnClickListener {
                onTabletAddClicked()
            }

            emptyStateBuyButton.setOnClickListener {
                val browserIntent = Intent(Intent.ACTION_VIEW, "http://www.soymomo.com/".toUri())
                startActivity(browserIntent)
            }

            toolbarOpen.setOnClickListener {
                val intent = Intent(this@MainActivity, SettingsActivity::class.java)
                startActivity(intent)
            }

            loadErrorRetry.setOnClickListener {
                loadError.visibility = View.GONE
                loading.visibility = View.VISIBLE
                mainViewModel.getTabletsByUserV2(currentParseUser)
            }
        }
    }

    private fun initViewAdapter() {
        Timber.d("MainActivity: Initializing view adapters")

        // Main card pager (one full-width card per page).
        binding.tabletsRecyclerView.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        binding.tabletsRecyclerView.adapter = tabletMainAdapter
        mainSnapHelper.attachToRecyclerView(binding.tabletsRecyclerView)

        // Selector strip (many small avatars). No PagerSnapHelper here: it is a
        // dense strip, not a pager. Recentering is handled explicitly on select.
        binding.tabletSelectorRecyclerView.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        binding.tabletSelectorRecyclerView.adapter = tabletSelectorAdapter

        // Selector taps drive the selection. Resolve the tapped avatar to a main-
        // list index BY IDENTITY (objectId), so a tap during a reload's commit
        // window can't land on the wrong device; ignore if not yet in the list.
        tabletSelectorAdapter.onTabletSelected = { tabletId ->
            val pos = tabletId?.let { id ->
                tabletMainAdapter.currentList.indexOfFirst { it.tablet?.objectId == id }
            } ?: -1
            if (pos >= 0) selectIndex(pos, scrollMainCard = true, smooth = true)
        }
        tabletSelectorAdapter.onAddClicked = { onTabletAddClicked() }

        // Selector follows the main pager. While the pager scrolls (drag, fling
        // or a programmatic glide) the strip pans proportionally in real time so
        // it never lurches; on settle it snaps exactly and commits the selection.
        binding.tabletsRecyclerView.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                if (dx == 0 || !restoreApplied) return
                val fractionalCenter = mainFractionalPosition()
                // Position the strip by the pager's fractional position (absolute,
                // not incremental) so RecyclerView clamps it naturally at the list
                // ends: near the first/last avatars centring is impossible, and
                // this keeps the strip pinned there instead of drifting out during
                // the drag and snapping back on settle.
                applySelectorOffset(fractionalCenter)
                // While the user drags/flings, cross-fade the highlight ring
                // between the outgoing and incoming avatar in step with the pager
                // (skipped for programmatic scrolls so it never fights a tap).
                if (pagerDraggedByUser) paintSelectorRings(fractionalCenter)
            }

            override fun onScrollStateChanged(recyclerView: RecyclerView, newState: Int) {
                if (newState == RecyclerView.SCROLL_STATE_DRAGGING) {
                    if (restoreApplied) pagerDraggedByUser = true
                    return
                }
                if (newState != RecyclerView.SCROLL_STATE_IDLE) return
                pagerDraggedByUser = false
                // Ignore settles until the identity-based restore has run for
                // this list generation (defends against RecyclerView's own
                // scroll-position restore on rotation overriding the restore).
                if (!restoreApplied) return
                val lm = recyclerView.layoutManager as? LinearLayoutManager ?: return
                val snapView = mainSnapHelper.findSnapView(lm) ?: return
                val pos = recyclerView.getChildAdapterPosition(snapView)
                if (pos !in 0 until tabletMainAdapter.itemCount) return
                if (pos == selectedIndex) {
                    // Already selected (e.g. settle after a programmatic scroll):
                    // just correct any sub-pixel drift from the live tracking.
                    centerSelector(pos)
                    return
                }
                selectIndex(pos, scrollMainCard = false, smooth = true)
            }
        })

        // Dragging the selector strip just pans the avatars (browse). Selection
        // changes only via a tap or a main-card swipe, so scrolling the strip
        // never hijacks the selection; the highlight re-centers on the next
        // select.
    }

    /**
     * The single funnel for "which tablet is selected". Idempotent: calling it
     * with the value already showing is a cheap no-op for the highlight and the
     * main scroll, which is what breaks the two-way feedback loop between the
     * pager and the selector. Always runs on the main thread.
     *
     * @param scrollMainCard whether to move the main pager (false when the call
     *   originates from the pager settling on that card already).
     * @param smooth animate the scroll/recenter (false for instant restore).
     */
    private fun selectIndex(index: Int, scrollMainCard: Boolean, smooth: Boolean) {
        if (index !in 0 until tabletMainAdapter.itemCount) return
        val tablet = tabletMainAdapter.currentList[index].tablet ?: return

        selectedIndex = index
        mainViewModel.selectedTabletId = tablet.objectId

        tabletSelectorAdapter.setSelectedIndex(index)

        if (scrollMainCard) {
            scrollMainTo(index, smooth)
            // When the pager scrolls smoothly the selector follows it live via
            // onScrolled; only an instant pager move needs an explicit recenter.
            if (!smooth) centerSelector(index)
        } else {
            // Settle from a user swipe: the strip already tracked the card, so
            // just snap it exactly onto the centre.
            centerSelector(index)
        }

        // Push the tablet to the fragment whenever it is a different OBJECT (a
        // reload brings a fresh instance for the same device), so battery /
        // location / DUG state aren't left stale after resume or returning from
        // settings. A genuine no-op (identical instance) is skipped.
        if (tabletViewModel.currentTablet.value !== tablet) {
            tabletViewModel.setCurrentTablet(tablet)
            kidProfileViewModel.setCurrentTablet(tablet)
        }
    }

    private fun scrollMainTo(index: Int, smooth: Boolean) {
        val rv = binding.tabletsRecyclerView
        if (index !in 0 until tabletMainAdapter.itemCount) return
        val lm = rv.layoutManager as? LinearLayoutManager
        if (!smooth || lm == null) {
            // Instant + cancels any pending saved-state scroll so the
            // identity-based restore wins over RecyclerView's own restore.
            lm?.scrollToPositionWithOffset(index, 0) ?: rv.scrollToPosition(index)
            return
        }
        // For a far jump, instantly hop next to the target then smooth-settle the
        // last card, instead of animating through dozens of full-width cards.
        val current = mainSnapHelper.findSnapView(lm)
            ?.let { rv.getChildAdapterPosition(it) }
            ?.takeIf { it != RecyclerView.NO_POSITION }
            ?: selectedIndex
        val distance = if (current == RecyclerView.NO_POSITION) Int.MAX_VALUE
        else kotlin.math.abs(index - current)
        if (distance > FAR_JUMP_THRESHOLD) {
            val prelanding = (if (index > current) index - 1 else index + 1)
                .coerceIn(0, tabletMainAdapter.itemCount - 1)
            lm.scrollToPositionWithOffset(prelanding, 0)
            // Mirror the instant hop on the selector; the final glide then pulls
            // it the last avatar via onScrolled.
            centerSelector(prelanding)
            rv.post { rv.smoothScrollToPosition(index) }
        } else {
            rv.smoothScrollToPosition(index)
        }
    }

    /**
     * Positions the selector strip so the avatar at [fractionalCenter] (the
     * pager's fractional position) sits in the centre. Absolute positioning, so
     * RecyclerView clamps it at the list ends — the first/last few avatars can't
     * be centred, and clamping keeps the strip pinned there instead of drifting
     * past and snapping back. A whole index gives an exact centre, matching the
     * adapter's discrete highlight on settle.
     */
    private fun applySelectorOffset(fractionalCenter: Float) {
        val rv = binding.tabletSelectorRecyclerView
        val lm = rv.layoutManager as? LinearLayoutManager ?: return
        val tabletCount = tabletMainAdapter.itemCount
        if (tabletCount == 0 || rv.width == 0) return
        val fc = fractionalCenter.coerceIn(0f, (tabletCount - 1).toFloat())
        val index = fc.toInt()
        val frac = fc - index
        val avatarWidth = lm.findViewByPosition(index)?.width
            ?: rv.getChildAt(0)?.width ?: 0
        if (avatarWidth == 0) return
        val offset = (rv.width / 2f - avatarWidth / 2f - frac * avatarWidth).roundToInt()
        lm.scrollToPositionWithOffset(index, offset)
    }

    /** Centres the avatar at [index]; posted if the strip is not yet measured. */
    private fun centerSelector(index: Int) {
        if (index !in 0 until tabletSelectorAdapter.itemCount) return
        val rv = binding.tabletSelectorRecyclerView
        // Posted when not yet measured — during a submitList commit callback (the
        // restore path) the strip may have rv.width == 0, which would collapse
        // the centre offset to 0 and pin the avatar to the left edge.
        if (rv.width == 0 || rv.isEmpty()) rv.post { applySelectorOffset(index.toFloat()) }
        else applySelectorOffset(index.toFloat())
    }

    /**
     * The pager's current position as a fraction (e.g. 3.4 = 40% of the way from
     * card 3 to card 4), used to drive the selector ring cross-fade.
     */
    private fun mainFractionalPosition(): Float {
        // Never return NO_POSITION (-1) — it would feed a negative centre into
        // the ring cross-fade math; fall back to a non-negative index.
        val safeSelected = selectedIndex.coerceAtLeast(0).toFloat()
        val lm = binding.tabletsRecyclerView.layoutManager as? LinearLayoutManager
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
     * Cross-fades each visible avatar's ring (stroke colour + opacity) by how
     * close it is to [fractionalCenter]: the centred avatar is fully ringed, its
     * neighbour fades in as the pager crosses toward it. At an integer centre
     * this matches the adapter's discrete highlight exactly, so committing the
     * selection on settle is seamless.
     */
    private fun paintSelectorRings(fractionalCenter: Float) {
        val rv = binding.tabletSelectorRecyclerView
        val tabletCount = tabletMainAdapter.itemCount
        for (i in 0 until rv.childCount) {
            val child = rv.getChildAt(i)
            val pos = rv.getChildAdapterPosition(child)
            if (pos == RecyclerView.NO_POSITION) continue
            val avatar = (rv.getChildViewHolder(child) as? TabletSelectorViewHolder)
                ?.vProfilePicture ?: continue
            if (pos >= tabletCount) { // the trailing add button
                avatar.setStrokeColorResource(R.color.white)
                avatar.imageAlpha = 255
                continue
            }
            val strength = (1f - kotlin.math.abs(pos - fractionalCenter)).coerceIn(0f, 1f)
            val color = ringArgb.evaluate(strength, ringUnselectedColor, ringSelectedColor) as Int
            avatar.strokeColor = ColorStateList.valueOf(color)
            avatar.imageAlpha = (127 + 128 * strength).roundToInt()
        }
    }

    /**
     * Restores the selection by tablet identity once BOTH adapters' diffs have
     * committed, so the selector and the main pager always agree on a list shape
     * that actually exists. Falls back to the first tablet when the previously
     * selected device is gone or was never identified.
     */
    private fun maybeRestoreSelection() {
        if (!mainDiffDone || !selectorDiffDone) return
        if (restoreApplied) return
        val list = tabletMainAdapter.currentList
        if (list.isEmpty()) {
            restoreApplied = true
            return
        }
        val keepId = pendingKeepId
        val resolved = when {
            keepId != null ->
                list.indexOfFirst { it.tablet?.objectId == keepId }.takeIf { it >= 0 } ?: 0
            else ->
                selectedIndex.takeIf { it in list.indices } ?: 0
        }
        restoreApplied = true
        selectIndex(resolved, scrollMainCard = true, smooth = false)
    }

    private fun observeMainViewModel() {
        Timber.d("MainActivity: Setting up ViewModel observers")

        mainViewModel.tabletList.observe(this) { tablets ->
            Timber.d("MainActivity: Received tablet list update with ${tablets.size} tablets")
            // currentTablet is driven centrally by selectIndex (via the restore
            // below), so no separate first-tablet seeding here.
            handleLoadingTabletUserSuccess(tablets)
        }

        // A failed load (non-auth) shows a retry instead of an endless skeleton —
        // but only when there is no data yet; a background refresh failure keeps
        // the current list on screen.
        mainViewModel.tabletLoadFailed.observe(this) { failed ->
            if (failed == true && tabletMainAdapter.currentList.isEmpty()) {
                binding.loading.visibility = View.GONE
                binding.cardLayout.visibility = View.GONE
                binding.emptyStateView.visibility = View.GONE
                binding.loadError.visibility = View.VISIBLE
            } else if (failed == false) {
                binding.loadError.visibility = View.GONE
            }
        }

        // Session died server-side (handled in getTabletsByUserV2) -> route to
        // login, mirroring the settings screens.
        mainViewModel.loginStatus.observe(this) { status ->
            if (status == LoginStatus.LOGGED_OUT) {
                startActivity(
                    Intent(this, DispatchActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                )
                finish()
            }
        }
    }

    private fun handleLoadingTabletUserSuccess(mainCardTabletUsers: List<Tablet>) {
        Timber.d("MainActivity: Processing tablet list success")
        val generation = ++loadGeneration
        binding.noNetwork.visibility = View.GONE
        binding.loadError.visibility = View.GONE

        if (mainCardTabletUsers.isEmpty()) {
            binding.loading.visibility = View.GONE
            binding.cardLayout.visibility = View.GONE
            binding.emptyStateView.visibility = View.VISIBLE
            // Clear both strips and the selection so no consumer keeps a handle
            // on a removed tablet and no stale avatars linger.
            selectedIndex = RecyclerView.NO_POSITION
            mainViewModel.selectedTabletId = null
            restoreApplied = true
            tabletMainAdapter.submitList(emptyList())
            tabletSelectorAdapter.submitList(emptyList())
            if (::currentFragment.isInitialized) currentFragment.noTabletView()
            return
        }

        // Capture the selected identity BEFORE submitting (synchronous, so it is
        // immune to async list/postValue lag) and restore by it after the diffs
        // commit — surviving reorders, removals, resume and rotation.
        pendingKeepId = mainViewModel.selectedTabletId
            ?: tabletMainAdapter.currentList.getOrNull(selectedIndex)?.tablet?.objectId

        // Stable, user-friendly order (by name, then objectId) so devices keep
        // a predictable position across sessions — the backend list order is
        // not deterministic, and restore-by-objectId makes sorting safe.
        val tabletList = mainCardTabletUsers
            // Drop accidental duplicates (e.g. a dangling Parse relation pointer)
            // so DiffUtil's identity contract holds and restore-by-id is unambiguous.
            .distinctBy { it.objectId }
            .sortedWith(
                compareBy(nullsLast<String>()) { t: Tablet -> t.profileName?.lowercase() }
                    .thenBy { it.objectId ?: "" }
            )
            .map { MainCardTabletUser(it) }
        val tabletListWithAdd = tabletList.toMutableList().apply {
            add(MainCardTabletUser(null))
        }

        binding.loading.visibility = View.GONE
        binding.emptyStateView.visibility = View.GONE
        binding.cardLayout.visibility = View.VISIBLE

        // New load generation: gate settle events and wait for both diffs.
        restoreApplied = false
        mainDiffDone = false
        selectorDiffDone = false

        tabletSelectorAdapter.submitList(tabletListWithAdd) {
            if (generation != loadGeneration) return@submitList // superseded
            selectorDiffDone = true
            maybeRestoreSelection()
        }
        tabletMainAdapter.submitList(tabletList) {
            if (generation != loadGeneration) return@submitList // superseded
            mainDiffDone = true
            maybeRestoreSelection()
        }
    }

    private fun checkNotificationPermissions() {
        Timber.d("MainActivity: Checking notification permissions")
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == 
                    PackageManager.PERMISSION_GRANTED -> {
                Timber.d("MainActivity: Notification permissions already granted")
            }
            shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) -> {
                Timber.d("MainActivity: Should show notification permission rationale")
            }
            else -> {
                Timber.d("MainActivity: Requesting notification permissions")
                requestNotificationPermissionsLauncher.launch(
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS))
            }
        }
    }

    fun onDialogDismissed() {
        Timber.d("MainActivity: Dialog dismissed")
        resolvingError = false
    }

    override fun onNetworkAvailable() {
        Timber.d("MainActivity: Network became available")
        hasNetworkConnection = true
        binding.noNetwork.visibility = View.GONE
    }

    override fun onNetworkUnavailable() {
        Timber.d("MainActivity: Network became unavailable")
        hasNetworkConnection = false
        binding.noNetwork.visibility = View.VISIBLE
    }

    override fun onParentControlSelected(tablet: Tablet) {
        Timber.d("MainActivity: Parent control selected")
        startActivity(Intent(this, TabletActivity::class.java).apply {
            putExtra(SettingsConstants.TABLET_OBJECT_EXTRA, tablet)
        })
    }

    override fun onTabletAddClicked() {
        Timber.d("MainActivity: Add tablet clicked")
        startActivity(Intent(this, LinkDeviceActivity::class.java))
    }

    override fun onProfileClicked(tablet: Tablet) {
        Timber.d("MainActivity: Profile clicked")
        startActivity(Intent(this, TabletActivity::class.java).apply {
            putExtra(SettingsConstants.TABLET_OBJECT_EXTRA, tablet)
            putExtra(Constants.FRAGMENT_QUICK_ACCESS, Constants.TABLET_KID_PROFILE_EDIT)
        })
    }

    fun updateCurrentFragment(fragment: MainFragment) {
        Timber.d("MainActivity: Updating current fragment")
        this.currentFragment = fragment
    }

    class ErrorDialogFragment : DialogFragment() {
        override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
            val errorCode = requireArguments().getInt(DIALOG_ERROR)
            return GoogleApiAvailability.getInstance().getErrorDialog(
                requireActivity(), errorCode, REQUEST_RESOLVE_ERROR
            )!!
        }

        override fun onDismiss(dialog: DialogInterface) {
            try {
                (activity as? MainActivity)?.onDialogDismissed()
            } catch (e: NullPointerException) {
                Timber.e("MainActivity: Error on dialog dismiss - ${e.message}")
                recordNonFatalError(e, "Error on dismiss")
            }
            super.onDismiss(dialog)
        }
    }

}