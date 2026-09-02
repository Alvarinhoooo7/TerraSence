package com.sosmartlabs.momo.main

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.ViewGroup
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.doOnLayout
import androidx.core.view.updateLayoutParams
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityLastKnownPositionBinding
import com.sosmartlabs.momo.map.marker.MarkerType
import com.sosmartlabs.momo.map.marker.MomoMarker
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.DateUtil
import com.sosmartlabs.momo.utils.DirectionsLauncher
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.Date

private fun Int?.orZero(): Int = this ?: 0

/**
 * A full-screen look at where a disconnected watch last reported.
 *
 * Exists so that tapping the small map on [DisconnectionActivity] expands *inside the app*.
 * The lite map there is deliberately not clickable, because lite mode's default tap hands
 * the user to the external Google Maps app — a full-screen, live-looking map of a position
 * that may be days old, with nowhere to say so. Here we own the chrome, so the age is
 * pinned above the map and cannot be panned or scrolled away. That is the whole reason this
 * screen exists rather than just enabling the lite map's own tap.
 *
 * Everything is passed BY VALUE from the caller's already-resolved position. This screen
 * performs no Parse reads at all: two independent resolutions could disagree, and a card
 * saying "2 days ago" next to a map saying "3 days ago" is a credibility failure on a
 * child-safety screen.
 */
@AndroidEntryPoint
class LastKnownPositionActivity : AppCompatActivity() {

    companion object {
        private const val EXTRA_LAT = "position_lat"
        private const val EXTRA_LNG = "position_lng"
        private const val EXTRA_RECORDED_AT = "position_recorded_at"
        private const val EXTRA_IMAGE_URL = "wearer_image_url"

        /**
         * The expanded map must never imply more precision than the card it grew from, so
         * this matches DisconnectionActivity's inline zoom and is also the ceiling.
         */
        private const val MAP_ZOOM = 15f

        fun intent(
            context: Context,
            wearerName: String,
            wearerImageUrl: String?,
            latitude: Double,
            longitude: Double,
            recordedAt: Date
        ): Intent = Intent(context, LastKnownPositionActivity::class.java).apply {
            putExtra(Constants.EXTRA_WEARER_NAME, wearerName)
            putExtra(EXTRA_IMAGE_URL, wearerImageUrl)
            putExtra(EXTRA_LAT, latitude)
            putExtra(EXTRA_LNG, longitude)
            putExtra(EXTRA_RECORDED_AT, recordedAt.time)
        }
    }

    private lateinit var binding: ActivityLastKnownPositionBinding
    private var buttonOriginalBottomMargin: Int = 0

    private val wearerName: String by lazy { intent.getStringExtra(Constants.EXTRA_WEARER_NAME).orEmpty() }
    private val latitude: Double by lazy { intent.getDoubleExtra(EXTRA_LAT, 0.0) }
    private val longitude: Double by lazy { intent.getDoubleExtra(EXTRA_LNG, 0.0) }
    private val wearerImageUrl: String? by lazy { intent.getStringExtra(EXTRA_IMAGE_URL) }
    /** Held so the pending Glide load can be cancelled; see onDestroy. */
    private var momoMarker: MomoMarker? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("LastKnownPositionActivity: onCreate")
        enableEdgeToEdge()
        binding = ActivityLastKnownPositionBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // A launch with no coordinates has nothing to show and no honest fallback.
        if (!intent.hasExtra(EXTRA_LAT) || !intent.hasExtra(EXTRA_LNG)) {
            Timber.w("LastKnownPositionActivity: launched without a position, finishing")
            finish()
            return
        }

        setupEdgeToEdge()
        setupToolbar()
        setupBanner()
        setupActions()
        setupMap()
    }

    private fun setupEdgeToEdge() {
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false
        buttonOriginalBottomMargin =
            (binding.buttonDirections.layoutParams as? ViewGroup.MarginLayoutParams)?.bottomMargin ?: 0

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            binding.toolbar.updateLayoutParams<ViewGroup.MarginLayoutParams> {
                topMargin = systemBars.top.coerceAtLeast(displayCutout.top)
            }
            val bottomInset = if (EdgeToEdgeUtils.hasButtonNavigation(applicationContext)) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }
            binding.buttonDirections.updateLayoutParams<ViewGroup.MarginLayoutParams> {
                bottomMargin = buttonOriginalBottomMargin + bottomInset
            }
            windowInsets
        }
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            // The wearer's name, not "SoyMomo Disconnected": the user already read that on
            // the screen they came from, and here the question is whose position this is.
            title = wearerName.takeIf { it.isNotBlank() }
                ?: getString(R.string.disconnection_status_position_title_fallback)
            setDisplayHomeAsUpEnabled(true)
        }
        binding.toolbar.setNavigationOnClickListener { finish() }
    }

    /**
     * The banner is anchored under the toolbar, above the map, and cannot be dismissed.
     *
     * Deliberately not a bottom sheet (draggable shut), not a toast (expires) and not the
     * marker's info window (disappears on the next map tap). While the user pans, the pin
     * can leave the viewport — this sentence must not.
     */
    private fun setupBanner() {
        val recordedAt = Date(intent.getLongExtra(EXTRA_RECORDED_AT, 0L))
        binding.stalenessRelative.text = getString(
            R.string.disconnection_status_position_recorded,
            DateUtil.getElapsedSince(recordedAt)
        )
        binding.stalenessAbsolute.text = DateUtil.getFormattedDateTimeDefaultTimeZone(recordedAt)
    }

    private fun setupActions() {
        binding.buttonDirections.setOnClickListener {
            DirectionsLauncher.open(this, latitude, longitude, wearerName)
        }
    }

    override fun onDestroy() {
        momoMarker?.clearPendingImageLoad()
        super.onDestroy()
    }

    private fun setupMap() {
        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.last_position_map) as? SupportMapFragment ?: return
        mapFragment.getMapAsync { map ->
            val point = LatLng(latitude, longitude)
            // The home map's avatar teardrop, so the parent recognises whose position this
            // is at a glance — but desaturated. Colour is what makes that marker read as
            // "here is your child, now"; grey makes it read as a record, which is what a
            // fix that may be days old actually is.
            val marker = map.addMarker(MarkerOptions().position(point))
            momoMarker = MomoMarker(
                googleMapMarker = marker,
                appContext = applicationContext,
                markerType = MarkerType.CHILD,
                markerId = EXTRA_LAT,
                grayscale = true
            ).also { it.loadMarkerImage(wearerImageUrl) }
            map.moveCamera(CameraUpdateFactory.newLatLngZoom(point, MAP_ZOOM))
            // Cap zoom-in at the level the inline card already showed. Panning and zooming
            // OUT are what a parent needs here ("what is around there?"); zooming further in
            // would imply a precision a days-old fix does not have.
            map.setMaxZoomPreference(MAP_ZOOM)
            map.uiSettings.apply {
                isMapToolbarEnabled = false
                isMyLocationButtonEnabled = false
                // Deliberately off: with maxZoom == the initial zoom the "+" is a dead
                // control, and the stock buttons collide with the Directions bar.
                isZoomControlsEnabled = false
            }
            // Keep the Google logo clear of the Directions button — the Maps terms require
            // the attribution stay visible, and it renders inside the map's bottom padding.
            binding.buttonDirections.doOnLayout { button ->
                val bottom = button.height +
                    (button.layoutParams as? ViewGroup.MarginLayoutParams)?.bottomMargin.orZero() +
                    resources.getDimensionPixelSize(R.dimen.vertical_margin_small)
                map.setPadding(0, 0, 0, bottom)
                // Re-issue the camera move AFTER the padding lands. setPadding redefines
                // which part of the map counts as visible, and the earlier moveCamera
                // centred the pin in the full view — leaving it sitting low, under the
                // Directions bar's share of the screen.
                map.moveCamera(CameraUpdateFactory.newLatLngZoom(point, MAP_ZOOM))
            }
        }
    }
}
