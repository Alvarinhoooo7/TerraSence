package com.sosmartlabs.momo.main

import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.ViewGroup
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.net.toUri
import androidx.core.view.isVisible
import com.google.android.material.appbar.AppBarLayout
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import com.sosmartlabs.momo.map.marker.MarkerType
import com.sosmartlabs.momo.map.marker.MomoMarker
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityDisconnectionBinding
import com.sosmartlabs.momo.main.ui.DisconnectionUiState
import com.sosmartlabs.momo.main.ui.DisconnectionViewModel
import com.sosmartlabs.momo.main.ui.PositionState
import com.sosmartlabs.momo.main.ui.dialog.DisabledUserPermissionDialogFragment
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.DateUtil
import com.sosmartlabs.momo.utils.DirectionsLauncher
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.support.WhatsappSupportLauncher
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.Date
import kotlin.math.abs

@AndroidEntryPoint
class DisconnectionActivity : AppCompatActivity() {

    private companion object {
        const val STATE_MAP = "status_map_state"
        const val MAP_ZOOM = 15f
        const val CHEVRON_ROTATE_MS = 150L

        /** >1 so the header is fully transparent before the bar is fully collapsed. */
        const val HEADER_FADE_RATE = 1.6f

        /** 125/255 — the alpha the wearer card already uses for an unavailable action. */
        const val DISABLED_ALPHA = 0.49f
    }

    private lateinit var binding: ActivityDisconnectionBinding
    private var buttonOriginalBottomMargin: Int = 0

    private val viewModel: DisconnectionViewModel by viewModels()

    /**
     * The wearer this screen was opened for, or null when it was opened generically.
     *
     * Both entry points pass it today, but the screen must keep working without it — see
     * [DisconnectionUiState.Generic].
     */
    private var wearerId: String? = null
    private var wearerName: String = ""
    private var located: PositionState.Located? = null
    private var wearerImageUrl: String? = null
    /** Held so the pending Glide load can be cancelled; see onDestroy. */
    private var momoMarker: MomoMarker? = null

    val toolbar: Toolbar get() = binding.toolbar
    private val toolbarTitle: String get() = getString(R.string.disconnection_info_title)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("DisconnectionActivity: onCreate")
        enableEdgeToEdge()
        binding = ActivityDisconnectionBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()
        setupToolbar()
        setupHeaderCollapse()
        setupListeners()
        setupExpandableSections()
        setupWearerContext()
        // MapView needs its lifecycle forwarded even in lite mode.
        binding.statusMap.onCreate(savedInstanceState?.getBundle(STATE_MAP))
        // Lite mode's DEFAULT tap behaviour launches the Google Maps app centred on the
        // pin — a silent exit from the screen toward a possibly days-old position. The map
        // is a picture; Directions is the explicit button below it.
        binding.statusMap.isClickable = false
    }

    override fun onStart() {
        super.onStart()
        binding.statusMap.onStart()
    }

    override fun onStop() {
        binding.statusMap.onStop()
        super.onStop()
    }

    override fun onPause() {
        binding.statusMap.onPause()
        super.onPause()
    }

    override fun onLowMemory() {
        super.onLowMemory()
        binding.statusMap.onLowMemory()
    }

    override fun onDestroy() {
        momoMarker?.clearPendingImageLoad()
        binding.statusMap.onDestroy()
        super.onDestroy()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBundle(STATE_MAP, Bundle().also { binding.statusMap.onSaveInstanceState(it) })
    }

    /**
     * Deliberately NOT the `finish()`-if-no-extra idiom used by WatchSettingsActivity and
     * HeyMomoHistoryActivity: opening this screen with no wearer is a supported product
     * mode, not a programming error. With no id the status section simply stays GONE and
     * the page is what it has always been.
     */
    private fun setupWearerContext() {
        wearerId = intent.getStringExtra(Constants.EXTRA_WEARER_ID)
        val id = wearerId
        if (id == null) {
            Timber.d("DisconnectionActivity: opened without a wearer, showing generic advice")
            return
        }
        viewModel.state.observe(this) { render(it) }
        viewModel.load(id)
    }

    override fun onResume() {
        super.onResume()
        // Recompute after a trip to the dialer or a maps app: the elapsed strings go stale
        // and the permission gate can have changed underneath us.
        wearerId?.let { viewModel.load(it) }
        binding.statusMap.onResume()
    }

    private fun render(state: DisconnectionUiState) {
        when (state) {
            is DisconnectionUiState.Generic -> {
                binding.statusSection.isVisible = false
                bindCallAction(null, blockedByPermission = false)
            }
            is DisconnectionUiState.Ready -> {
                binding.statusSection.isVisible = true
                // The child's name, not "This SoyMomo": the section is about one specific
                // watch, and the name is the strongest signal we can put there. The XML
                // string stays as the fallback for a wearer with no name columns at all.
                state.wearerName.takeIf { it.isNotBlank() }?.let { binding.statusTitle.text = it }
                bindLastSeen(state.lastSeenAt)
                bindPosition(state.position, state.wearerName, state.wearerImageUrl)
                bindCallAction(state.phone, state.callBlockedByPermission)
            }
        }
    }

    private fun bindLastSeen(lastSeenAt: Date?) {
        if (lastSeenAt == null) {
            // A bare token, not last_update_unavailable ("Last update: unavailable") —
            // under a "Last seen" label that would repeat the label in every locale.
            binding.statusLastSeenValue.maxLines = 1
            binding.statusLastSeenValue.setText(R.string.disconnection_status_last_seen_unknown)
        } else {
            binding.statusLastSeenValue.maxLines = 1
            binding.statusLastSeenValue.text = DateUtil.getElapsedSince(lastSeenAt)
        }
    }

    /**
     * Renders the last-known position.
     *
     * The map is the answer to "where was my child", so it replaces what used to be a row
     * of prose. It is lite mode — a static bitmap that handles no gestures — which is why
     * it can live inside a NestedScrollView without fighting it, and why a parent cannot
     * pan it around until it feels like a live map. Directions is an explicit button, never
     * a tap on the map itself.
     */
    private fun bindPosition(position: PositionState, wearerName: String, wearerImageUrl: String?) {
        val located = position as? PositionState.Located
        this.located = located
        this.wearerName = wearerName
        this.wearerImageUrl = wearerImageUrl

        binding.statusMapContainer.isVisible = located != null
        // Hidden, not merely disabled: with no position there is nothing to route to, and
        // both buttons carry layout_weight so Call simply takes the full width. A disabled
        // control here would sit next to an enabled Call and invite a tap that does nothing.
        binding.statusButtonDirections.isVisible = located != null

        binding.statusMapContainer.isClickable = located != null
        binding.statusMapContainer.isFocusable = located != null
        binding.statusMapContainer.setOnClickListener(
            if (located == null) null else View.OnClickListener {
                startActivity(
                    LastKnownPositionActivity.intent(
                        this, wearerName, wearerImageUrl,
                        located.latitude, located.longitude, located.recordedAt
                    )
                )
            }
        )

        binding.statusPositionCaption.text = when (position) {
            is PositionState.Located -> getString(
                R.string.disconnection_status_position_recorded,
                DateUtil.getElapsedSince(position.recordedAt)
            )
            // Its own string, not the generic permission-dialog copy: borrowing that one
              // coupled this caption to another feature's wording, and "Please contact the
              // device administrator" reads as an instruction under a map, not a status.
            PositionState.NotShared -> getString(R.string.disconnection_status_position_not_shared)
            PositionState.NoneOnRecord -> getString(R.string.disconnection_status_position_none)
            PositionState.Undated -> getString(R.string.disconnection_status_position_undated)
            PositionState.Hidden -> ""
        }
        binding.statusPositionCaption.isVisible = position != PositionState.Hidden

        located?.let { showOnMap(it, wearerImageUrl) }
    }

    /**
     * Drops a single marker and centres on it. Called only for [PositionState.Located], so
     * the map is never initialised for a wearer we have no position for.
     */
    private fun showOnMap(located: PositionState.Located, imageUrl: String?) {
        binding.statusMap.getMapAsync { map ->
            val point = LatLng(located.latitude, located.longitude)
            // Retire the previous marker BEFORE clearing the map. Glide's clear() invokes
            // onLoadCleared synchronously, which routes back into setIcon() — so the marker
            // must still be alive, or already detached. removeMarker() orders both.
            momoMarker?.removeMarker()
            momoMarker = null
            map.clear()
            // Same marker the home map uses, so the parent recognises whose position this
            // is — but desaturated, because here it is a record and not a live position.
            val marker = map.addMarker(MarkerOptions().position(point))
            momoMarker = MomoMarker(
                googleMapMarker = marker,
                appContext = applicationContext,
                markerType = MarkerType.CHILD,
                markerId = located.hashCode().toString(),
                grayscale = true
            ).also { it.loadMarkerImage(imageUrl) }
            map.moveCamera(CameraUpdateFactory.newLatLngZoom(point, MAP_ZOOM))
            // No my-location layer, no toolbar: nothing on this map should suggest it is
            // tracking anything live.
            map.uiSettings.isMapToolbarEnabled = false
        }
    }

    private fun bindCallAction(phone: String?, blockedByPermission: Boolean) {
        val hasNumber = phone != null && packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)

        if (hasNumber && blockedByPermission) {
            // Dimmed but still tappable, so it can explain itself. This is how the wearer
            // card already treats the same permission: a permission-blocked action the user
            // can see but not use needs a reason, or it reads as the app being broken.
            // Disabling it instead would swallow the tap and say nothing.
            binding.statusButtonCall.isEnabled = true
            binding.statusButtonCall.alpha = DISABLED_ALPHA
            binding.statusButtonCall.setOnClickListener {
                DisabledUserPermissionDialogFragment().show(supportFragmentManager, null)
            }
            return
        }

        // Nothing to explain when the watch simply has no number, or the device cannot
        // place calls at all — so this one is genuinely disabled and inert.
        binding.statusButtonCall.alpha = 1f
        binding.statusButtonCall.isEnabled = hasNumber
        binding.statusButtonCall.setOnClickListener(
            if (!hasNumber) null else View.OnClickListener { callWatch(phone!!) }
        )
    }

    /**
     * ACTION_DIAL, not ACTION_CALL. Placing the call directly needs the CALL_PHONE runtime
     * permission, whose launcher, rationale dialog, invalid-number dialog and
     * SecurityException handling all live in MainActivity. One extra tap in the dialer
     * removes that entire sensitive-permission path from a screen whose whole job is to
     * work when other things are broken.
     */
    private fun callWatch(phone: String) {
        val intent = Intent(Intent.ACTION_DIAL, getString(R.string.uri_call, phone).toUri())
        try {
            startActivity(intent)
        } catch (e: ActivityNotFoundException) {
            Timber.w(e, "DisconnectionActivity: no dialer available")
            Toast.makeText(this, R.string.toast_error_opening_url, Toast.LENGTH_LONG).show()
        }
    }

    /**
     * Makes the five reasons and three measures expandable.
     *
     * The screen's job is to be scannable first and exhaustive second. Collapsed, the whole
     * troubleshooting list is eight tappable lines instead of roughly forty of prose; the
     * copy is unchanged, so this costs no translation and loses no content.
     */
    private fun setupExpandableSections() {
        val reasons = listOf(
            binding.reason1Row to (binding.reason1Detail to binding.reason1Chevron),
            binding.reason2Row to (binding.reason2Detail to binding.reason2Chevron),
            binding.reason3Row to (binding.reason3Detail to binding.reason3Chevron),
            binding.reason4Row to (binding.reason4Detail to binding.reason4Chevron),
            binding.reason5Row to (binding.reason5Detail to binding.reason5Chevron)
        )
        reasons.forEach { (row, pair) ->
            val (detail, chevron) = pair
            row.setOnClickListener { toggle(detail.isVisible.not(), chevron) { detail.isVisible = it } }
        }

        val measures = listOf(
            binding.measure1 to (binding.measure1Subtitle to binding.measure1Chevron),
            binding.measure2 to (binding.measure2Subtitle to binding.measure2Chevron),
            binding.measure3 to (binding.measure3Subtitle to binding.measure3Chevron)
        )
        measures.forEach { (card, pair) ->
            val (subtitle, chevron) = pair
            card.isClickable = true
            card.isFocusable = true
            card.setOnClickListener { toggle(subtitle.isVisible.not(), chevron) { subtitle.isVisible = it } }
        }
    }

    /**
     * Chevron rests pointing down (rotation 90 in XML — the expand-in-place affordance)
     * and flips up when expanded. A right-pointing chevron would promise navigation to
     * another screen, which is not what these rows do.
     */
    private fun toggle(expand: Boolean, chevron: View, apply: (Boolean) -> Unit) {
        apply(expand)
        chevron.animate().rotation(if (expand) 270f else 90f).setDuration(CHEVRON_ROTATE_MS).start()
    }

    private fun setupEdgeToEdge() {
        // Store original button margin
        buttonOriginalBottomMargin = (binding.buttonContactUs.layoutParams as? ViewGroup.MarginLayoutParams)?.bottomMargin ?: 0

        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false
        
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            val topInset = systemBars.top.coerceAtLeast(displayCutout.top)
            
            // Apply top insets to the Toolbar
            val param = binding.toolbar.layoutParams as ViewGroup.MarginLayoutParams
            param.setMargins(0,topInset,0,0)
            binding.toolbar.layoutParams = param

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            // Apply bottom margin to the contact button
            val buttonParams = binding.buttonContactUs.layoutParams as? ViewGroup.MarginLayoutParams
            buttonParams?.let {
                it.bottomMargin = buttonOriginalBottomMargin + bottomPadding
                binding.buttonContactUs.layoutParams = it
            }

            windowInsets
        }
    }

    /**
     * Cross-fades the expanded header out as the bar collapses.
     *
     * The CollapsingToolbarLayout's contentScrim is opaque #603BB0 but the illustration
     * still renders above it, so at the collapsed height the artwork sat behind the newly
     * enabled collapsed title and the two overlapped. Driving alpha from the scroll offset
     * is deterministic regardless of draw order, and the fade reads better than a hard
     * scrim swap: the artwork dissolves as the title arrives.
     */
    private fun setupHeaderCollapse() {
        binding.appBarLayout.addOnOffsetChangedListener(
            AppBarLayout.OnOffsetChangedListener { appBar, verticalOffset ->
                val range = appBar.totalScrollRange
                if (range == 0) return@OnOffsetChangedListener
                val collapsed = abs(verticalOffset).toFloat() / range
                // Fade the CONTENT only, never the header itself: SimStepCardHeader.Over
                // carries the purple background and this AppBarLayout is explicitly
                // transparent, so fading the container would strip the bar's colour and
                // leave white-on-white.
                val alpha = (1f - collapsed * HEADER_FADE_RATE).coerceIn(0f, 1f)
                binding.headerImage.alpha = alpha
                binding.headerTitle.alpha = alpha
            }
        )
    }

    private fun setupToolbar() {
        Timber.d("DisconnectionActivity: Setting up toolbar")
        with(this as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            toolbar.setNavigationOnClickListener { onBackPressed() }
        }
    }

    private fun setupListeners() {
        Timber.d("DisconnectionActivity: Setting up click listeners")
        binding.statusButtonDirections.setOnClickListener {
            val target = located ?: return@setOnClickListener
            // The wearer's name, NOT the screen title: this becomes the pin's label in the
            // maps app, and "SoyMomo Disconnected" there is meaningless.
            DirectionsLauncher.open(this, target.latitude, target.longitude, wearerName)
        }
        binding.buttonContactUs.setOnClickListener {
            Timber.d("DisconnectionActivity: Contact us button clicked")
            WhatsappSupportLauncher.launchWhatsappSupportContact(applicationContext)
        }
    }

}