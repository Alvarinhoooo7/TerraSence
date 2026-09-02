package com.sosmartlabs.momo.locationhistory

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Bitmap
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.res.ResourcesCompat
import androidx.core.graphics.drawable.toBitmap
import androidx.core.graphics.toColorInt
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.request.RequestOptions
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.maps.model.Polyline
import com.google.android.gms.maps.model.PolylineOptions
import com.google.android.material.datepicker.CalendarConstraints
import com.google.android.material.datepicker.DateValidatorPointBackward
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.slider.Slider
import com.google.maps.android.SphericalUtil
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityLocationHistoryBinding
import com.sosmartlabs.momo.databinding.InfowindowHistoryMarkerBinding
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.sosmartlabs.momo.locationhistory.ui.LocationHistoryViewModel
import com.sosmartlabs.momo.locationhistory.ui.PolylineData
import com.sosmartlabs.momo.locationhistory.ui.TimelineAdapter
import com.sosmartlabs.momo.locationhistory.ui.TimelineItem
import com.sosmartlabs.momo.locationhistory.ui.toTimelineItems
import com.sosmartlabs.momo.locationhistory.utils.LocationHistoryGeocoderHelper
import com.sosmartlabs.momo.locationhistory.utils.MapSVGLines
import com.sosmartlabs.momo.locationhistory.utils.PathInterpolator
import com.sosmartlabs.momo.map.marker.MarkerPayload
import com.sosmartlabs.momo.map.marker.MarkerType
import com.sosmartlabs.momo.map.marker.MarkerVisualSpec
import com.sosmartlabs.momo.map.marker.MomoMarker
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.ui.DefaultIcons.PROFILE_MOMO_SPACE
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarNavigationType
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import timber.log.Timber
import java.text.DateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject
import kotlin.collections.List
import kotlin.collections.Map
import kotlin.collections.MutableList
import kotlin.collections.emptyList
import kotlin.collections.emptyMap
import kotlin.collections.mutableListOf
import kotlin.collections.mutableMapOf
import kotlin.math.min
import androidx.core.graphics.createBitmap

@AndroidEntryPoint
@OptIn(ExperimentalCoroutinesApi::class)
class LocationHistoryActivity : AppCompatActivity(), OnMapReadyCallback {

    @Inject lateinit var toolbarConstructor: ToolbarConstructor
    @Inject lateinit var geocoderHelper: LocationHistoryGeocoderHelper

    private lateinit var binding: ActivityLocationHistoryBinding
    private lateinit var timelineAdapter: TimelineAdapter
    private lateinit var bottomSheetBehavior: BottomSheetBehavior<View>

    private var watchId:  String? = null
    private var deviceId: String? = null

    private lateinit var googleMap: GoogleMap
    private val  markers          = mutableMapOf<Int, Marker>()
    private val  directionMarkers = mutableListOf<Marker>()
    private val  polylineList     = mutableListOf<Polyline>()
    private var  lastPointIndex   = 0

    private var avatarMarker: Marker?            = null
    private var avatarBitmap: Bitmap? = null

    private val viewModel: LocationHistoryViewModel by viewModels()
    private var autoJob: Job? = null

    private val WINDOW_SIZE     = 3
    private val LIGHT_COLOR by lazy { getColor(R.color.polylineHighlightColor) }
    private val HIGHLIGHT_COLOR by lazy { getColor(R.color.watch_info_device_info_color) }
    
    // Edge-to-edge support
    private var bottomSheetOriginalBottomMargin = 0

    private var isMapReady = false
    private var lastLoadedDate: Date? = null

    private var avatarAnimator: ValueAnimator? = null
    private var updatingSliderProgrammatically = false
    private val isUserScrubbing: Boolean
        get() = !updatingSliderProgrammatically &&
                binding.slider.isPressed

    private lateinit var globalToast: Toast

    private val routeRevealHandler = Handler(Looper.getMainLooper())
    private var pendingRouteReveal: Runnable? = null

    private val autoStartHandler = Handler(Looper.getMainLooper())
    private var pendingAutoStart: Runnable? = null

    // Add this property to store navigation indices
    private var navigationIndices: List<Int> = emptyList()

    private data class BidirectionalLine(
        val polyline: Polyline,
        val strokePolyline: Polyline, // white stroke underneath for better visibility at crossings
        val forwardMarkers: List<Marker>, // direction current < next
        val reverseMarkers: List<Marker> // direction next < current
    )

    private val polylineToArrows = mutableMapOf<String, BidirectionalLine>()

    /** Direction arrows allowed per segment and direction, see [directionMarkerBudgetFor]. */
    private var directionMarkerBudget = MapSVGLines.MAX_MARKERS_PER_SEGMENT

    private var lastIdx = 0
    
    // Road-snapped paths from Valhalla route matching (keyed by segment like "0-1")
    private var matchedPaths: Map<String, List<LocationHistoryViewModel.MatchedPathPoint>>? = null

    private val ROUTE_REVEAL_DELAY_MS = 2500L

    // Toggle to disable bottom sheet dragging (easy to switch on/off)
    private var isBottomSheetDraggable = false  // Set to true to re-enable dragging

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        Timber.d("LocationHistoryActivity: onCreate called")

        watchId  = intent.getStringExtra(Constants.EXTRA_WEARER_ID)
        deviceId = intent.getStringExtra(Constants.EXTRA_DEVICE_ID)
        if (watchId == null) { setResult(Activity.RESULT_CANCELED); finish() }

        binding = ActivityLocationHistoryBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()

        toolbarConstructor
            .setTitle(R.string.title_location_history)
            .setNavigationOnClick(ToolbarNavigationType.SUPPORT_FINISH_AFTER_TRANSITION)
            .setErrorName("LocationHistoryActivity")
            .build()

        setMap()
        setViews()
        initBottomCard()
        initTimeline()
        initBottomSheet()
        bindObservers()
        Timber.d("LocationHistoryActivity: Setup complete")
    }
    
    private fun initTimeline() {
        timelineAdapter = TimelineAdapter(this) { item, position ->
            Timber.d("LocationHistoryActivity: Timeline item clicked at position $position")
            // Find the navigation index that corresponds to this point index
            val navIndex = navigationIndices.indexOfFirst { it == item.pointIndex }
            if (navIndex != -1) {
                viewModel.setCurrentIndex(navIndex)
            }
        }
        binding.rvTimeline.adapter = timelineAdapter
    }
    
    private fun initBottomSheet() {
        bottomSheetBehavior = BottomSheetBehavior.from(binding.bottomSheet)
        
        // Calculate expanded offset to limit max height to 2/5 of screen
        val screenHeight = resources.displayMetrics.heightPixels
        val maxSheetHeight = (screenHeight * 2) / 5  // 2/5 of screen
        val calculatedExpandedOffset = screenHeight - maxSheetHeight
        
        // Store the minimum peek height (from XML: 136dp)
        val minPeekHeight = (136 * resources.displayMetrics.density).toInt()
        
        bottomSheetBehavior.apply {
            isFitToContents = false
            expandedOffset = calculatedExpandedOffset  // Physically limits drag to 2/5 of screen
            skipCollapsed = false
            peekHeight = minPeekHeight
            state = BottomSheetBehavior.STATE_COLLAPSED
            
            var isDragging = false
            var dragStartHeight = minPeekHeight
            
            // Threshold: if released below this height, collapse fully
            val collapseThreshold = minPeekHeight + (50 * resources.displayMetrics.density).toInt()
            
            addBottomSheetCallback(object : BottomSheetBehavior.BottomSheetCallback() {
                override fun onStateChanged(bottomSheet: View, newState: Int) {
                    when (newState) {
                        BottomSheetBehavior.STATE_DRAGGING -> {
                            isDragging = true
                            dragStartHeight = bottomSheet.height - bottomSheet.top
                        }
                        BottomSheetBehavior.STATE_SETTLING,
                        BottomSheetBehavior.STATE_EXPANDED,
                        BottomSheetBehavior.STATE_HALF_EXPANDED -> {
                            if (isDragging) {
                                val currentHeight = bottomSheet.height - bottomSheet.top
                                
                                // If released near the bottom, collapse fully
                                if (currentHeight <= collapseThreshold) {
                                    peekHeight = minPeekHeight
                                } else {
                                    // Otherwise, stay where released
                                    val clampedHeight = currentHeight.coerceIn(minPeekHeight, maxSheetHeight)
                                    peekHeight = clampedHeight
                                }
                                
                                isDragging = false
                                state = BottomSheetBehavior.STATE_COLLAPSED
                            }
                        }
                        BottomSheetBehavior.STATE_COLLAPSED -> {
                            if (isDragging) {
                                // User dragged down to collapse - reset to minimum
                                peekHeight = minPeekHeight
                                isDragging = false
                            }
                        }

                        BottomSheetBehavior.STATE_HIDDEN -> {
                            // No-op
                        }
                    }
                }
                
                override fun onSlide(bottomSheet: View, slideOffset: Float) {
                    // No action needed during slide
                }
            })
        }
        
        // Prevent bottom sheet from collapsing when user scrolls inside the RecyclerView
        // Only allow collapse when RecyclerView is at the top
        binding.rvTimeline.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrollStateChanged(recyclerView: RecyclerView, newState: Int) {
                super.onScrollStateChanged(recyclerView, newState)
                
                // Skip if bottom sheet dragging is disabled
                if (!isBottomSheetDraggable) return
                
                // When user starts scrolling in RecyclerView, lock the bottom sheet
                if (newState == RecyclerView.SCROLL_STATE_DRAGGING) {
                    bottomSheetBehavior.isDraggable = !recyclerView.canScrollVertically(-1)
                } else if (newState == RecyclerView.SCROLL_STATE_IDLE) {
                    // Re-enable dragging when scroll stops and we're at the top
                    bottomSheetBehavior.isDraggable = true
                }
            }
        })
        
        // Apply initial bottom sheet draggable state
        bottomSheetBehavior.isDraggable = isBottomSheetDraggable
        binding.dragHandle.visibility = if (isBottomSheetDraggable) View.VISIBLE else View.GONE
    }
    
    /**
     * Toggle bottom sheet dragging.
     * @param draggable true to enable dragging, false to disable
     */
    fun setBottomSheetDraggable(draggable: Boolean) {
        isBottomSheetDraggable = draggable
        bottomSheetBehavior.isDraggable = draggable
    }

    private fun setupEdgeToEdge() {
        Timber.d("LocationHistoryActivity: setupEdgeToEdge")

        // Set dark status bar appearance (locationHistoryThemeColor is dark purple)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("LocationHistoryActivity: systemBars $systemBars")
            Timber.d("LocationHistoryActivity: displayCutout $displayCutout")
            Timber.d("LocationHistoryActivity: navigationBars $navigationBars")

            // Apply top padding to AppBar to extend its background into status bar area
            binding.appbar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.appbar.paddingBottom
            )

            // Apply bottom padding to bottom sheet for navigation bar
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("LocationHistoryActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to the timeline RecyclerView
            binding.rvTimeline.setPadding(
                binding.rvTimeline.paddingLeft,
                binding.rvTimeline.paddingTop,
                binding.rvTimeline.paddingRight,
                bottomPadding + binding.rvTimeline.paddingTop
            )

            windowInsets
        }
    }

    private fun scheduleAutoStart() {
        /* wipe any previous attempt */
        if (lastPointIndex <= 0) {        // == 0  ➜ no locations
            cancelPendingAutoStart()      // make sure no stale runnable is queued
            return
        }
        pendingAutoStart?.let { autoStartHandler.removeCallbacks(it) }
        pendingAutoStart = Runnable {
            // only start if the user never did
            if (viewModel.isAuto.value != true) {
                if ((viewModel.currentIndex.value ?: 0) >= lastPointIndex) {
                    viewModel.setCurrentIndex(0)          // rewind if we were on the last point
                }
                viewModel.toggleAuto()                    // start autoplay
            }
            pendingAutoStart = null
        }
        autoStartHandler.postDelayed(pendingAutoStart!!, 3_000)
    }

    private fun cancelPendingAutoStart() {
        pendingAutoStart?.let { autoStartHandler.removeCallbacks(it) }
        pendingAutoStart = null
    }

    override fun onResume() {
        super.onResume()
        Timber.d("LocationHistoryActivity: onResume called")
        watchId?.let { viewModel.loadWatch(it) }
    }

    override fun onPause() {
        Timber.d("LocationHistoryActivity: onPause called")
        // Nothing on this screen should keep animating once it is not visible: the playback chain
        // walks the whole route and every step toggles the visibility of every direction marker.
        avatarAnimator?.cancel()
        avatarAnimator = null
        viewModel.stopAuto()
        cancelPendingAutoStart()
        pendingRouteReveal?.let {
            routeRevealHandler.removeCallbacks(it)
            pendingRouteReveal = null
        }
        super.onPause()
    }

    override fun onDestroy() {
        Timber.d("LocationHistoryActivity: onDestroy called")
        avatarAnimator?.cancel()
        autoJob?.cancel()
        if (::globalToast.isInitialized) globalToast.cancel()
        cancelPendingAutoStart()
        super.onDestroy()
    }

    private fun setMap() {
        Timber.d("LocationHistoryActivity: Setting up map")
        (supportFragmentManager.findFragmentById(R.id.map) as SupportMapFragment)
            .getMapAsync(this)
    }

    @SuppressLint("PotentialBehaviorOverride")
    override fun onMapReady(map: GoogleMap) {
        Timber.d("LocationHistoryActivity: Map is ready")
        isMapReady = true
        googleMap = map.apply {
            uiSettings.isMapToolbarEnabled   = true
            uiSettings.isRotateGesturesEnabled = false
            setOnPolylineClickListener { pl ->
                (pl.tag as? PolylineData)?.let { 
                    Timber.d("LocationHistoryActivity: Polyline clicked, adding info window")
                    pl.addInfoWindow(it) 
                }
            }
        }
        setGoogleInfoWindowAdapter()
        requestClustersIfPossible()

        binding.findStartMarker.setOnClickListener { 
            Timber.d("LocationHistoryActivity: Find start marker clicked")
            findFirstMarker() 
        }
        binding.findEndMarker.setOnClickListener { 
            Timber.d("LocationHistoryActivity: Find end marker clicked")
            findLastMarker() 
        }

        binding.fabAuto.setOnClickListener {
            Timber.d("LocationHistoryActivity: Auto button clicked")
            cancelPendingAutoStart()

            val last = lastPointIndex
            val idx  = viewModel.currentIndex.value ?: 0
            val isRunning = viewModel.isAuto.value == true

            if (!isRunning && idx >= last) {
                Timber.d("LocationHistoryActivity: Auto start from the beginning")
                viewModel.setCurrentIndex(0)
                autoStartHandler.post {
                    viewModel.toggleAuto()
                }
            } else {
                Timber.d("LocationHistoryActivity: Auto toggle")
                viewModel.toggleAuto()
            }
        }
    }

    private fun setViews() {
        Timber.d("LocationHistoryActivity: Setting up views")
        binding.bottomSheetCardChipDate.setOnClickListener {
            showDatePicker()
        }
        binding.icEditCalendar.setOnClickListener {
            showDatePicker()
        }
    }

    private fun showDatePicker() {
        Timber.d("LocationHistoryActivity: Showing date picker dialog")

        // Get current date in user's timezone
        val calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
        val currentTimeMillis = calendar.timeInMillis

        // Build and configure date picker
        val datePicker = MaterialDatePicker.Builder.datePicker().apply {
            setCalendarConstraints(
                CalendarConstraints.Builder()
                    .setEnd(currentTimeMillis)
                    .setValidator(DateValidatorPointBackward.before(currentTimeMillis))
                    .build()
            )
            setTitleText(R.string.location_history_select_date)
            setSelection(currentTimeMillis)
        }.build()

        // Handle date selection
        datePicker.addOnPositiveButtonClickListener { dateResult ->
            // Convert UTC timestamp from date picker to local date
            val selectedCalendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
            selectedCalendar.timeInMillis = dateResult

            // Normalize to start of day in local timezone
            val localDate = Calendar.getInstance(TimeZone.getDefault()).apply {
                set(Calendar.YEAR, selectedCalendar.get(Calendar.YEAR))
                set(Calendar.MONTH, selectedCalendar.get(Calendar.MONTH))
                set(Calendar.DAY_OF_MONTH, selectedCalendar.get(Calendar.DAY_OF_MONTH))
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }.time

            Timber.d("LocationHistoryActivity: Date selected: $localDate")
            viewModel.updateDate(localDate)
        }

        datePicker.show(supportFragmentManager, "date_picker")
        Timber.d("LocationHistoryActivity: Date picker dialog shown")
    }

    private fun initBottomCard() = with(binding) {
        Timber.d("LocationHistoryActivity: Initializing bottom card")
        slider.apply {
            valueFrom = 0f
            valueTo   = 1f
            stepSize  = 1f
            addOnChangeListener { _, v, _ -> 
                Timber.d("LocationHistoryActivity: Slider changed to ${v.toInt()}")
                if (updatingSliderProgrammatically) return@addOnChangeListener
                val idx = v.toInt()
                if (viewModel.currentIndex.value != idx) {
                    viewModel.setCurrentIndex(idx)
                }
            }
            addOnSliderTouchListener(object : Slider.OnSliderTouchListener {
                override fun onStartTrackingTouch(s: Slider) { 
                    Timber.d("LocationHistoryActivity: Slider touch started, stopping auto")
                    viewModel.stopAuto()
                    cancelPendingAutoStart()
                    avatarAnimator?.cancel()
                    googleMap.stopAnimation()
                }
                override fun onStopTrackingTouch(s: Slider) {
                    Timber.d("LocationHistoryActivity: Slider touch ended")
                    viewModel.currentIndex.value?.let { idx ->
                        animateCameraAdaptive(idx)
                    }
                }
            })
        }
    }

    private fun bindObservers() {
        Timber.d("LocationHistoryActivity: Binding observers")

        viewModel.date.observe(this) { date ->
            Timber.d("LocationHistoryActivity: Date changed to $date")
            val df = DateFormat.getDateInstance(
                DateFormat.LONG,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N)
                    Locale.getDefault(Locale.Category.FORMAT)
                else Locale.getDefault()
            ).apply { timeZone = TimeZone.getDefault() }

            binding.bottomSheetCardChipDate.text = df.format(date)

            viewModel.stopAuto()                // pause auto-play
            cancelPendingAutoStart()            // no queued restarts
            avatarAnimator?.cancel()            // kill marker animation
            if (isMapReady) {                 // <- guard
                googleMap.stopAnimation()
            }
            lastIdx = 0                         // start fresh

            requestClustersIfPossible()
        }

        viewModel.pairLinesLocations.observe(this) { res ->
            Timber.d("LocationHistoryActivity: Location data updated with status ${res.status}")
            val enabled = res.status != Resource.Status.LOADING
            binding.bottomSheetCardChipDate.isEnabled = enabled
            binding.findStartMarker.isEnabled         = enabled
            binding.findEndMarker.isEnabled           = enabled

            when (res.status) {
                Resource.Status.LOADING -> binding.loadingLayout.visibility = View.VISIBLE
                Resource.Status.LOAD_SUCCESS -> {
                    binding.loadingLayout.visibility = View.GONE
                    val locationData = res.data ?: LocationHistoryViewModel.LocationData(emptyMap(), emptyMap(), null)
                    val locations = locationData.points
                    val lines = locationData.lines
                    matchedPaths = locationData.matchedPaths
                    
                    Timber.d("LocationHistoryActivity: Loaded ${locations.size} locations, ${lines.size} lines, ${matchedPaths?.size ?: 0} matched paths")
                    binding.noLocations.visibility = if (locations.isEmpty()) View.VISIBLE else View.GONE
                    drawLocationValues(locations, lines)
                }
                Resource.Status.LOAD_ERROR -> {
                    Timber.d("LocationHistoryActivity: Error loading location data")
                    binding.loadingLayout.visibility = View.GONE
                    binding.noLocations.visibility   = View.VISIBLE
                    matchedPaths = null
                    drawLocationValues(emptyMap(), emptyMap())
                }
                else -> Unit
            }
        }

        viewModel.currentIndex.observe(this) { 
            Timber.d("LocationHistoryActivity: Current index changed to $it")
            highlightPoint(it) 
        }
        viewModel.isAuto.observe(this) { running ->
            if (navigationIndices.isEmpty()) return@observe

            binding.fabAuto.setImageResource(
                if (running) R.drawable.ic_pause else R.drawable.ic_action_play
            )

            if (!running) return@observe

            val startIdx = viewModel.currentIndex.value ?: 0

            // Start index can be stale while the UI is catching up
            if (startIdx !in 0..navigationIndices.lastIndex) return@observe

            val currentPointIdx = if (
                startIdx == navigationIndices.lastIndex && navigationIndices.last() == 0
            ) {
                0      // virtual return
            } else {
                navigationIndices[startIdx]
            }
            
            markers[currentPointIdx]?.position?.let { pos ->
                avatarAnimator?.cancel()

                googleMap.animateCamera(
                    CameraUpdateFactory.newLatLngZoom(pos, 15f),
                    800,
                    object : GoogleMap.CancelableCallback {
                        override fun onFinish() {
                            if (startIdx < navigationIndices.size - 1) {
                                viewModel.setCurrentIndex(startIdx + 1)
                            }
                        }
                        override fun onCancel() = onFinish()
                    }
                )
            } ?: run {
                if (startIdx < navigationIndices.size - 1) {
                    viewModel.setCurrentIndex(startIdx + 1)
                }
            }

            if (startIdx == 0) {
                markers[currentPointIdx]?.showInfoWindow()
            }
        }
        viewModel.watch.observe(this) { res ->
            if (res.status == Resource.Status.LOAD_SUCCESS) {
                Timber.d("LocationHistoryActivity: Watch data loaded successfully")
                prepareAvatarIcon(res.data!!)
            }
        }
    }

    private fun animateCameraAdaptive(idx: Int) {

        val from = markers[idx]?.position ?: return
        val to   = markers[idx + 1]?.position          // might be null at the end
        val cb   = object : GoogleMap.CancelableCallback {
            override fun onFinish() = maybeAdvanceAutomatically(idx)
            override fun onCancel() = maybeAdvanceAutomatically(idx)
        }

        if (to != null) {
            val distance = SphericalUtil.computeDistanceBetween(from, to)   // metres
            val DIST_THRESHOLD_M = 500           // tweak to taste

            if (distance > DIST_THRESHOLD_M) {
                Timber.d("LocationHistoryActivity: Long segment, fitting camera to both points")
                val bounds = LatLngBounds.builder().include(from).include(to).build()
                googleMap.animateCamera(
                    CameraUpdateFactory.newLatLngBounds(bounds, 250),
                    800, cb
                )
                return
            }
        }

        Timber.d("LocationHistoryActivity: Short segment or last point, centering camera")

        // Either last point or short segment – just centre and zoom-in
        googleMap.animateCamera(
            CameraUpdateFactory.newLatLngZoom(from, 15f),
            800, cb
        )
    }

    private fun requestClustersIfPossible() {
        Timber.d("LocationHistoryActivity: Requesting clusters if possible")
        if (!isMapReady || deviceId == null) return
        Timber.d("LocationHistoryActivity: Map is ready and deviceId is != null, checking date")
        val current = viewModel.date.value
        if (current == lastLoadedDate) return
        Timber.d("LocationHistoryActivity: Date changed, loading clusters")
        lastLoadedDate = current
        viewModel.loadLocationClusters(deviceId!!)
    }

    private fun prepareAvatarIcon(wearer: Wearer) {
        Timber.d("LocationHistoryActivity: Preparing avatar icon for wearer ${wearer.objectId}")
        lifecycleScope.launch(Dispatchers.IO) {
            val bmp: Bitmap = runCatching {
                Glide.with(this@LocationHistoryActivity)
                    .asBitmap()
                    .load(wearer.image?.url)
                    .apply(RequestOptions.circleCropTransform())
                    .submit(96, 96)
                    .get()
            }.getOrElse {
                Timber.d("LocationHistoryActivity: Using default avatar icon due to error: ${it.message}")
                ResourcesCompat.getDrawable(
                    resources,
                    R.drawable.ic_soymomo_silohuette,
                    theme
                )!!.toBitmap()
            }
            avatarBitmap = bmp
            Timber.d("LocationHistoryActivity: Avatar icon prepared")
        }
    }

    private fun drawLocationValues(
        locations: Map<Int, LocationHistoryViewModel.Point>,
        lines: Map<String, LocationHistoryViewModel.Line>
    ) {
        Timber.d("LocationHistoryActivity: Drawing ${locations.size} locations and ${lines.size} lines")
        clearMapElements()
        if (locations.isEmpty()) return
        
        lastIdx = 0
        lastPointIndex = locations.keys.maxOrNull() ?: 0

        val navigationSequence = buildNavigationSequence(locations)

        navigationIndices = navigationSequence
        val newMax = (navigationIndices.size - 1).toFloat()
        binding.slider.valueTo = if (newMax <= binding.slider.valueFrom) {
            binding.slider.valueFrom + 1f
        } else {
            newMax
        }

        Timber.d("LocationHistoryActivity: Final navigation sequence built - size: ${navigationIndices.size}, indices: $navigationIndices")
        Timber.d("LocationHistoryActivity: Last point index set to $lastPointIndex")

        drawMarkers(locations)

        drawPolylines(locations, lines)
        
        // Populate timeline with geocoding
        populateTimeline(locations)

        positionAvatar()

        googleMap.setOnMapLoadedCallback {
            fitCamera()
            scheduleAutoStart()
        }
    }
    
    private fun populateTimeline(locations: Map<Int, LocationHistoryViewModel.Point>) {
        val timelineItems = locations.toTimelineItems().toMutableList()
        timelineAdapter.submitList(timelineItems)
        
        // Geocode stops that don't have Safe Zone names (also geocode null types as defensive measure)
        lifecycleScope.launch {
            val updatedItems = timelineItems.map { item ->
                if (item.type != LocationHistoryViewModel.ClusterType.TRANSIT && 
                    item.safeZoneName == null) {
                    // Try to geocode this stop location
                    val address = geocoderHelper.getAddressForLocation(
                        item.latitude,
                        item.longitude
                    )
                    item.copy(geocodedAddress = address)
                } else {
                    item
                }
            }
            // Update the adapter with geocoded addresses
            timelineAdapter.submitList(updatedItems)
        }
    }
    
    private fun clearMapElements() {
        avatarAnimator?.cancel()
        avatarAnimator = null
        googleMap.stopAnimation()
        markers.values.forEach { it.remove() }
        directionMarkers.forEach { it.remove() }
        polylineList.forEach { it.remove() }
        avatarMarker?.remove()
        markers.clear()
        directionMarkers.clear()
        polylineList.clear()
        polylineToArrows.clear()
        googleMap.clear()
    }
    
    private fun buildNavigationSequence(locations: Map<Int, LocationHistoryViewModel.Point>): List<Int> {
        val clusterToPoint = mutableMapOf<Int, Int>()
        for ((pointIdx, point) in locations) {
            point.clusters.forEach { cluster ->
                clusterToPoint[cluster.cluster] = pointIdx
            }
        }

        val allClusters = clusterToPoint.keys.sorted()
        val navigationSequence = allClusters.mapNotNull { clusterToPoint[it] }
        
        Timber.d("LocationHistoryActivity: clusterToPoint = $clusterToPoint")
        Timber.d("LocationHistoryActivity: navigationSequence = $navigationSequence")
        
        return navigationSequence
    }
    
    private fun drawMarkers(
        locations: Map<Int, LocationHistoryViewModel.Point>
    ) {
        val isLoop = navigationIndices.isNotEmpty() && navigationIndices.first() == navigationIndices.last()
        for ((idx, point) in locations) {
            val ll = LatLng(point.location.latitude.toDouble(), point.location.longitude.toDouble())
            val opt = MarkerOptions().position(ll).zIndex(20f)
            
            // Determine marker icon based on type and position
            val isStop = point.isStop()
            val isStart = idx == navigationIndices.firstOrNull()
            val isEnd = idx == navigationIndices.lastOrNull()
            
            when {
                isLoop && isStart -> {
                    Timber.d("LocationHistoryActivity: Adding start/end marker at index $idx (loop)")
                    opt.icon(MapSVGLines.vectorToBitmap(R.drawable.ic_location_history_start_end, this))
                    opt.anchor(0.5f, 0.5f)
                }
                isStart -> {
                    Timber.d("LocationHistoryActivity: Adding start marker at index $idx")
                    opt.icon(MapSVGLines.vectorToBitmap(R.drawable.ic_location_marker_start, this))
                    opt.anchor(0.5f, 0.5f)
                }
                isEnd -> {
                    Timber.d("LocationHistoryActivity: Adding end marker at index $idx")
                    opt.icon(MapSVGLines.vectorToBitmap(R.drawable.ic_location_marker_end, this))
                    opt.anchor(0.5f, 0.5f)
                }
                isStop -> {
                    // Use green stop marker for stops (stationary periods)
                    Timber.d("LocationHistoryActivity: Adding stop marker at index $idx")
                    opt.icon(MapSVGLines.vectorToBitmap(R.drawable.ic_location_stop, this))
                    opt.anchor(0.5f, 0.5f)
                }
                else -> {
                    // Use blue transit marker for movement
                    Timber.d("LocationHistoryActivity: Adding transit marker at index $idx")
                    opt.icon(MapSVGLines.vectorToBitmap(R.drawable.ic_location_transit, this))
                    opt.anchor(0.5f, 0.5f)
                }
            }
            
            googleMap.addMarker(opt)?.also { m ->
                // Build enhanced snippet with type info
                m.snippet = buildMarkerSnippet(point)
                m.tag = point // Store point data for info window
                markers[idx] = m
            }
        }
    }
    
    private fun buildMarkerSnippet(point: LocationHistoryViewModel.Point): String {
        val timeStr = point.getTimes(this)
        val durationStr = point.getTotalDuration()?.let { seconds ->
            val hours = seconds / 3600
            val minutes = (seconds % 3600) / 60
            when {
                hours > 0 && minutes > 0 -> "${hours}h ${minutes}m"
                hours > 0 -> "${hours}h"
                minutes > 0 -> "${minutes}m"
                else -> null
            }
        }
        
        return buildString {
            append(timeStr)
            if (durationStr != null && point.isStop()) {
                append("\n")
                append(getString(R.string.location_history_duration, durationStr))
            }
        }
    }
    
    private fun drawPolylines(
        locations: Map<Int, LocationHistoryViewModel.Point>,
        lines: Map<String, LocationHistoryViewModel.Line>
    ) {
        directionMarkerBudget = directionMarkerBudgetFor(navigationIndices.size - 1)

        for (i in 0 until navigationIndices.size - 1) {
            val current = navigationIndices[i] // 4
            val next = navigationIndices[i + 1] // 2
            val isForward = current < next // false
            val lineKey = if (current < next) "${current}-${next}" else "${next}-${current}" // 2-4
            val line = lines[lineKey] ?: continue

            if (lineKey in polylineToArrows) {
                Timber.d("LocationHistoryActivity: Polyline already exists for $lineKey, skipping")
                continue
            }
            
            Timber.d("LocationHistoryActivity: Drawing line $lineKey (isForward: $isForward)")
            
            val p1 = if (isForward) locations[current]?.location else locations[next]?.location
            val p2 = if (isForward) locations[next]?.location else locations[current]?.location
            
            if (p1 != null && p2 != null) {
                drawPolyline(p1, p2, lineKey, isForward)
            }
        }
        
        Timber.d("LocationHistoryActivity: Polylines drawn: polylineToArrows = $polylineToArrows")
    }
    
    private fun drawPolyline(
        p1: LocationHistoryViewModel.MeanLocation,
        p2: LocationHistoryViewModel.MeanLocation,
        lineKey: String,
        isForward: Boolean
    ) {
        // Check if we have a road-snapped matched path for this segment
        val matchedPath = matchedPaths?.get(lineKey)
        
        val latLngPoints = if (matchedPath != null && matchedPath.size >= 2) {
            // Use road-snapped path from Valhalla
            Timber.d("LocationHistoryActivity: Using matched path for $lineKey (${matchedPath.size} points)")
            if (isForward) {
                matchedPath.map { LatLng(it.lat, it.lng) }
            } else {
                matchedPath.reversed().map { LatLng(it.lat, it.lng) }
            }
        } else {
            // Fallback to straight line
            Timber.d("LocationHistoryActivity: Using straight line for $lineKey (no matched path)")
            listOf(
                LatLng(p1.latitude.toDouble(), p1.longitude.toDouble()),
                LatLng(p2.latitude.toDouble(), p2.longitude.toDouble())
            )
        }
        
        val mainWidth = 5 * resources.displayMetrics.density
        val strokeWidth = mainWidth + (3 * resources.displayMetrics.density) // 1.5dp stroke on each side
        
        // Draw stroke polyline first (underneath) - white outline for better visibility at crossings
        val strokePolyline = googleMap.addPolyline(PolylineOptions().addAll(latLngPoints)).apply {
            width = strokeWidth
            color = "#FFFFFF".toColorInt()
            zIndex = 9f // Below main polyline
            isClickable = false
        }
        polylineList.add(strokePolyline)
        
        // Draw main polyline on top
        val polyline = googleMap.addPolyline(PolylineOptions().addAll(latLngPoints)).apply {
            width = mainWidth
            color = "#673AB6".toColorInt()
            zIndex = 10f // Above stroke
            isClickable = true
        }
        polylineList.add(polyline)
        
        // Draw direction markers for both directions
        val forwardMarkers = mutableListOf<Marker>()
        val reverseMarkers = mutableListOf<Marker>()
        
        val pathOptions = PolylineOptions().addAll(latLngPoints)
        createDirectionMarkers(pathOptions, lineKey, forwardMarkers, reverseMarkers)
        
        forwardMarkers.forEach { it.isVisible = false }
        reverseMarkers.forEach { it.isVisible = false }
        directionMarkers.addAll(forwardMarkers)
        directionMarkers.addAll(reverseMarkers)
        
        // Store both directions in the map
        polylineToArrows[lineKey] = BidirectionalLine(
            polyline,
            strokePolyline,
            forwardMarkers,
            reverseMarkers
        )
        
        Timber.d("LocationHistoryActivity: Created markers for $lineKey - Forward: ${forwardMarkers.size}, Reverse: ${reverseMarkers.size}")
    }
    
    /**
     * How many direction arrows a single segment may draw in a single direction.
     *
     * [MapSVGLines.MAX_MARKERS_PER_ROUTE] is split across every segment we are about to draw (each
     * of which draws both a forward and a reverse set), so a long route thins its arrows out
     * instead of drawing the first segments at full density and running the heap out of memory.
     * The floor of one arrow per direction is deliberate — a route with hundreds of segments still
     * shows direction — and [createDirectionMarkers] stops drawing altogether once the route
     * total is reached.
     */
    private fun directionMarkerBudgetFor(segmentCount: Int): Int {
        val directions = 2 * segmentCount.coerceAtLeast(1)
        return (MapSVGLines.MAX_MARKERS_PER_ROUTE / directions)
            .coerceIn(1, MapSVGLines.MAX_MARKERS_PER_SEGMENT)
    }

    private fun createDirectionMarkers(
        path: PolylineOptions,
        lineKey: String,
        forwardMarkers: MutableList<Marker>,
        reverseMarkers: MutableList<Marker>
    ) {
        // directionMarkers only holds the arrows of the segments drawn before this one — the ones
        // created here are added to it by the caller once both directions are done.
        val remainingBudget = MapSVGLines.MAX_MARKERS_PER_ROUTE - directionMarkers.size
        if (remainingBudget < 1) {
            Timber.d("LocationHistoryActivity: Route marker budget exhausted, no arrows for $lineKey")
            return
        }

        val markerSize = (12 * resources.displayMetrics.density).toInt()
        val markerBitmap = MapSVGLines.vectorToBitmap(
            R.drawable.location_history_direction,
            this,
            markerSize,
            markerSize
        )

        Timber.d("LocationHistoryActivity: Creating forward markers for $lineKey")
        MapSVGLines.drawLine(
            path,
            googleMap,
            forwardMarkers,
            markerBitmap,
            lineKey,
            true, // isForward
            min(directionMarkerBudget, remainingBudget)
        )

        Timber.d("LocationHistoryActivity: Creating reverse markers for $lineKey")
        MapSVGLines.drawLine(
            path,
            googleMap,
            reverseMarkers,
            markerBitmap,
            lineKey,
            false, // isForward
            min(directionMarkerBudget, remainingBudget - forwardMarkers.size)
        )
    }
    
    private fun positionAvatar() {
        avatarBitmap?.let {
            val first = markers[0]?.position ?: LatLng(0.0, 0.0)
            Timber.d("LocationHistoryActivity: Positioning avatar at first point")
            avatarMarker = googleMap.addMarker(
                MarkerOptions()
                    .position(first)
                    .anchor(0.5f, 1f)
                    .zIndex(990f)
                    .snippet("")
            )
            avatarMarker?.tag = MarkerPayload.Avatar("location_history_avatar")
            MomoMarker(
                googleMapMarker = avatarMarker,
                appContext = this,
                markerType = MarkerType.CHILD,
                markerId = "location_history_avatar",
                visualSpec = MarkerVisualSpec.mainMap()
            ).loadMarkerBitmap(it)
            avatarMarker?.showInfoWindow()
        }
    }

    private fun highlightPoint(idx: Int) {
        Timber.d("LocationHistoryActivity: Highlighting point at index $idx (previous: $lastIdx)")
        if (markers.isEmpty() || navigationIndices.isEmpty()) return
        
        // Ensure idx is within valid range
        val safeIdx = idx.coerceIn(0, navigationIndices.size - 1)
        if (safeIdx != idx) {
            Timber.d("LocationHistoryActivity: Adjusted index from $idx to $safeIdx")
            viewModel.setCurrentIndex(safeIdx)
            return
        }
        
        if (idx.toFloat() > binding.slider.valueTo) {
            binding.slider.valueTo = idx.toFloat()
        }
        
        avatarAnimator?.cancel()
        avatarAnimator = null
        googleMap.stopAnimation()
        pendingRouteReveal?.let {
            routeRevealHandler.removeCallbacks(it)
            pendingRouteReveal = null
        }
        var avatarAnimationDuration = ROUTE_REVEAL_DELAY_MS
        
        // Calculate the actual point indices we're moving between
        val currentPointIdx = navigationIndices[idx]
        val fromPointIdx = navigationIndices[lastIdx.coerceIn(0, navigationIndices.size - 1)]
        
        // Always animate if we have a valid from and to point
        if (avatarMarker != null && idx != lastIdx) {
            val fromMarker = markers[fromPointIdx]
            val toMarker = markers[currentPointIdx]
            if (fromMarker != null && toMarker != null) {
                Timber.d("LocationHistoryActivity: Animating avatar from index $fromPointIdx to $currentPointIdx")
                // Get road-snapped path (or straight line fallback)
                val animationPath = getAnimationPath(fromPointIdx, currentPointIdx, fromMarker.position, toMarker.position)
                avatarAnimationDuration = animateAvatarAlongPath(animationPath, idx)
            } else {
                Timber.d("LocationHistoryActivity: Could not animate avatar, missing marker(s) for $fromPointIdx or $currentPointIdx")
                avatarMarker?.position = (toMarker?.position ?: avatarMarker?.position)!!
            }
        } else {
            val marker = markers[currentPointIdx]
            if (marker != null) {
                Timber.d("LocationHistoryActivity: Snapping avatar to index $currentPointIdx")
                avatarMarker?.position = marker.position
                if (viewModel.isAuto.value == true) {
                    googleMap.animateCamera(CameraUpdateFactory.newLatLng(marker.position))
                } else {
                    animateCameraAdaptive(currentPointIdx)
                }
            }
        }
        
        // Show info window for current marker
        markers[currentPointIdx]?.showInfoWindow()
        
        lastIdx = idx
        
        // Update polyline visibility
        polylineList.forEach { it.isVisible = false }
        directionMarkers.forEach { it.isVisible = false }

        // Show and color the current polyline
        if (idx > 0) {
            val fromIdx = navigationIndices[idx - 1]
            val toIdx = navigationIndices[idx]
            val isForward = fromIdx < toIdx
            val lineKey = if (isForward) "${fromIdx}-${toIdx}" else "${toIdx}-${fromIdx}"
            
            Timber.d("LocationHistoryActivity: isForward = $isForward")
            Timber.d("LocationHistoryActivity: lineKey = $lineKey")
            
            val lineData = polylineToArrows[lineKey]

            if (lineData != null) {
                lineData.strokePolyline.isVisible = true
                lineData.strokePolyline.zIndex = 29f // Just below main highlighted polyline
                lineData.polyline.isVisible = true
                lineData.polyline.color = HIGHLIGHT_COLOR
                lineData.polyline.zIndex = 30f
                if (isForward) {
                    Timber.d("Displaying FORWARD markers: $lineKey, from $fromIdx to $toIdx")
                    lineData.forwardMarkers.forEachIndexed { i, marker ->
                        marker.isVisible = true
                        Timber.d("  Showing FORWARD direction marker $i for $lineKey at lat/lng: (${marker.position.latitude},${marker.position.longitude}), rotation: ${marker.rotation}")
                    }
                } else {
                    Timber.d("Displaying REVERSE markers: $lineKey, from $fromIdx to $toIdx")
                    lineData.reverseMarkers.forEachIndexed { i, marker ->
                        marker.isVisible = true
                        Timber.d("  Showing REVERSE direction marker $i for $lineKey at lat/lng: (${marker.position.latitude},${marker.position.longitude}), rotation: ${marker.rotation}")
                    }
                }
            } else {
                Timber.d("LocationHistoryActivity: No line data found for $lineKey")
            }
        }

        // Show and color the last polyline
        if (idx > 1) {
            val previousFromIdx = navigationIndices[idx - 2] // 1
            val previousToIdx = navigationIndices[idx - 1] // 2
            val currentToIdx = navigationIndices[idx] // 1
            if (previousFromIdx == currentToIdx) {
                Timber.d("LocationHistoryActivity: Skipping last polyline, already shown")
                return
            }
            val isForward = previousFromIdx < previousToIdx
            val lineKey = if (isForward) "${previousFromIdx}-${previousToIdx}" else "${previousToIdx}-${previousFromIdx}"
            
            val lineData = polylineToArrows[lineKey]
            if (lineData != null) {
                lineData.strokePolyline.isVisible = true
                lineData.strokePolyline.zIndex = 19f // Below the light polyline
                lineData.polyline.isVisible = true
                lineData.polyline.color = LIGHT_COLOR
                lineData.polyline.zIndex = 20f
                if (isForward) {
                    Timber.d("Displaying FORWARD markers: $lineKey, from $previousFromIdx to $previousToIdx")
                    lineData.forwardMarkers.forEachIndexed { i, marker ->
                        marker.isVisible = true
                        Timber.d("  Showing FORWARD direction marker $i for $lineKey at lat/lng: (${marker.position.latitude},${marker.position.longitude}), rotation: ${marker.rotation}")
                    }
                } else {
                    Timber.d("Displaying REVERSE markers: $lineKey, from $previousFromIdx to $previousToIdx")
                    lineData.reverseMarkers.forEachIndexed { i, marker ->
                        marker.isVisible = true
                        Timber.d("  Showing REVERSE direction marker $i for $lineKey at lat/lng: (${marker.position.latitude},${marker.position.longitude}), rotation: ${marker.rotation}")
                    }
                }
            }
        }
        
        if (binding.slider.value.toInt() != idx) {
            updatingSliderProgrammatically = true
            binding.slider.value = idx.toFloat()
            updatingSliderProgrammatically = false
        }
        
        // Sync timeline selection
        syncTimelineSelection(currentPointIdx)
    }
    
    private fun syncTimelineSelection(pointIndex: Int) {
        // Find the timeline item index that corresponds to this point index
        val timelinePosition = timelineAdapter.currentList.indexOfFirst { it.pointIndex == pointIndex }
        if (timelinePosition != -1 && timelinePosition != timelineAdapter.getSelectedPosition()) {
            timelineAdapter.setSelectedPosition(timelinePosition)
            // Scroll to make the selected item visible
            binding.rvTimeline.smoothScrollToPosition(timelinePosition)
        }
    }

    private fun revealEntireRoute(avatarAnimDuration: Long) {
        // First hide all polylines and markers
        polylineList.forEach { it.isVisible = false }
        directionMarkers.forEach { it.isVisible = false }

        // Show only the polylines and markers that were visited
        for (i in 0 until navigationIndices.size - 1) {
            val fromIdx = navigationIndices[i] // 4
            val toIdx = navigationIndices[i + 1] // 2

            Timber.d("LocationHistoryActivity: Revealing route from $fromIdx to $toIdx")
            
            // Determine which direction we traveled based on the actual point indices
            val isForward = fromIdx < toIdx
            Timber.d("LocationHistoryActivity: isForward = $isForward")
            val lineKey = if (isForward) "${fromIdx}-${toIdx}" else "${toIdx}-${fromIdx}"

            Timber.d("LocationHistoryActivity: lineKey = $lineKey")
            val lineData = polylineToArrows[lineKey]

            if (lineData != null) {
                // Show the stroke polyline (underneath)
                lineData.strokePolyline.isVisible = true
                lineData.strokePolyline.zIndex = 29f
                
                // Show the main polyline
                lineData.polyline.isVisible = true
                lineData.polyline.color = HIGHLIGHT_COLOR
                lineData.polyline.zIndex = 30f

                // Show only the markers for the direction we traveled
                if (isForward) {
                    lineData.forwardMarkers.forEach { it.isVisible = true }
                } else {
                    lineData.reverseMarkers.forEach { it.isVisible = true }
                }
            } else  {
                Timber.d("LocationHistoryActivity: No line data found for $lineKey")
            }
        }

        val bounds = LatLngBounds.builder().apply {
            markers.values.forEach { include(it.position) }
        }.build()

        /* If a previous runnable is still queued (unlikely here, but safe) remove it */
        pendingRouteReveal?.let { routeRevealHandler.removeCallbacks(it) }

        val r = Runnable {
            googleMap.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds, 220))
            pendingRouteReveal = null                      // executed, clear reference
        }
        pendingRouteReveal = r
        routeRevealHandler.postDelayed(r, avatarAnimDuration + 1_000L)
    }

    /**
     * Get the animation path for avatar movement between two points.
     * Uses road-snapped matched path if available, otherwise falls back to straight line.
     * 
     * @param fromPointIdx Starting point index
     * @param toPointIdx Destination point index
     * @param fromPosition Starting LatLng position
     * @param toPosition Destination LatLng position
     * @return List of LatLng points forming the animation path
     */
    private fun getAnimationPath(
        fromPointIdx: Int,
        toPointIdx: Int,
        fromPosition: LatLng,
        toPosition: LatLng
    ): List<LatLng> {
        val isForward = fromPointIdx < toPointIdx
        val lineKey = if (isForward) "${fromPointIdx}-${toPointIdx}" else "${toPointIdx}-${fromPointIdx}"
        
        val matchedPath = matchedPaths?.get(lineKey)
        
        return if (matchedPath != null && matchedPath.size >= 2) {
            // Convert MatchedPathPoint to LatLng and handle direction
            val latLngPath = matchedPath.map { LatLng(it.lat, it.lng) }
            if (isForward) latLngPath else latLngPath.reversed()
        } else {
            // Fallback to straight line between the two points
            Timber.d("LocationHistoryActivity: No matched path for $lineKey, using straight line")
            listOf(fromPosition, toPosition)
        }
    }

    private fun animateAvatarAlongPath(path: List<LatLng>, idx: Int): Long {
        avatarAnimator?.cancel()

        val AVATAR_SPEED_MPS      =  500.0
        val MIN_ANIM_DURATION_MS  =  600L
        val MAX_ANIM_DURATION_MS  = 8000L
        val ANIM_START_DELAY_MS   =  500L

        // Create path interpolator for smooth animation along the road path
        val pathInterpolator = PathInterpolator(path)
        val destination = path.last()
        
        // Use actual path distance (not straight-line distance)
        val distance = pathInterpolator.totalDistance
        var duration  = (distance / AVATAR_SPEED_MPS * 1_000).toLong()          // ms
        duration      = duration.coerceIn(MIN_ANIM_DURATION_MS, MAX_ANIM_DURATION_MS)

        val needDelay  = !isUserScrubbing && viewModel.isAuto.value == true
        val startDelay = if (needDelay) ANIM_START_DELAY_MS else 0L
        if (isUserScrubbing) duration = MIN_ANIM_DURATION_MS                   // snap-fast

        // Camera animates directly to destination (as requested)
        if (!isUserScrubbing) {
            googleMap.animateCamera(
                CameraUpdateFactory.newLatLng(destination),
                duration.toInt(),              // animateCamera needs Int
                null                           // we already run our own callback below
            )
        }

        /* ---------- animate the marker along the path --------------------- */
        // ValueAnimator.cancel() fires onAnimationCancel *and then* onAnimationEnd, so without
        // this flag a cancel from onPause/onDestroy/clearMapElements still ran the end callback:
        // revealEntireRoute() then re-issued a visibility update for every direction marker of
        // the whole route while the screen was being torn down.
        var isCancelled = false

        avatarAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            this.duration   = duration
            this.startDelay = startDelay
            interpolator    = null            // linear (constant ground-speed)

            addUpdateListener { va ->
                // Use PathInterpolator to follow the road-snapped path
                val pos = pathInterpolator.interpolate(va.animatedFraction.toDouble())
                avatarMarker?.position = pos
            }

            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: android.animation.Animator) {
                    if (isCancelled) {
                        Timber.d("LocationHistoryActivity: Avatar animation was cancelled, skipping end callback")
                        return
                    }
                    // Ensure final position & keep auto-play logic
                    avatarMarker?.position = destination
                    googleMap.animateCamera(CameraUpdateFactory.newLatLng(destination))
                    // Reveal entire route if this is the last point
                    val isVirtualReturn = (navigationIndices.size > 1 && idx == navigationIndices.size - 1 && navigationIndices.last() == 0)
                    if (isVirtualReturn || idx == navigationIndices.size - 1) {
                        revealEntireRoute(duration)
                    }
                    maybeAdvanceAutomatically(idx)
                }
                override fun onAnimationCancel(animation: android.animation.Animator) {
                    isCancelled = true
                    if (isFinishing || isDestroyed) return
                    avatarMarker?.position = destination
                    googleMap.animateCamera(CameraUpdateFactory.newLatLng(destination))
                }
            })
            start()
        }
        return duration
    }

    private fun maybeAdvanceAutomatically(current: Int) {
        if (viewModel.isAuto.value != true) return
        
        val next = current + 1
        if (next >= navigationIndices.size) {  // Changed from lastPointIndex to navigationIndices.size
            viewModel.stopAuto()
            return
        }
        
        if (viewModel.currentIndex.value == next) return
        
        viewModel.setCurrentIndex(next)
    }

    private fun fitCamera() {
        Timber.d("LocationHistoryActivity: Fitting camera to show all markers")
        runCatching {
            val b = LatLngBounds.builder()
            markers.values.forEach { b.include(it.position) }
            CameraUpdateFactory.newLatLngBounds(b.build(), 220)
        }.onSuccess { 
            Timber.d("LocationHistoryActivity: Camera bounds calculated successfully")
            googleMap.animateCamera(it) 
        }.onFailure {
            Timber.e("LocationHistoryActivity: Failed to fit camera: ${it.message}")
        }
    }

    private fun findFirstMarker() {
        Timber.d("LocationHistoryActivity: Finding first marker")
        markers[0]?.let {
            it.showInfoWindow()
            googleMap.animateCamera(CameraUpdateFactory.newLatLng(it.position))
        }
    }

    private fun findLastMarker() {
        Timber.d("LocationHistoryActivity: Finding last marker")
        val targetIndex = if (navigationIndices.isNotEmpty() && navigationIndices.last() == 0) {
            0
        } else {
            lastPointIndex
        }
        Timber.d("LocationHistoryActivity: Finding marker at index $targetIndex")
        markers[targetIndex]?.let {
            it.showInfoWindow()
            googleMap.animateCamera(CameraUpdateFactory.newLatLng(it.position))
        }
    }

    private fun Polyline.addInfoWindow(data: PolylineData) {
        Timber.d("LocationHistoryActivity: Adding info window to polyline")
        val mid = LatLng(
            (points[0].latitude + points[1].latitude) / 2,
            (points[0].longitude + points[1].longitude) / 2
        )
        val dummy = BitmapDescriptorFactory.fromBitmap(createBitmap(1, 1))
        val m = googleMap.addMarker(MarkerOptions().position(mid).alpha(0f).icon(dummy))
        m?.tag = data
        Handler(Looper.getMainLooper()).postDelayed({ 
            Timber.d("LocationHistoryActivity: Showing info window for polyline")
            m?.showInfoWindow() 
        }, 200)
        googleMap.animateCamera(CameraUpdateFactory.newLatLng(mid))
    }

    @SuppressLint("PotentialBehaviorOverride")
    private fun setGoogleInfoWindowAdapter() {
        Timber.d("LocationHistoryActivity: Setting Google info window adapter")
        googleMap.setInfoWindowAdapter(object : GoogleMap.InfoWindowAdapter {
            override fun getInfoWindow(marker: Marker): View? {
                if (marker.snippet.isNullOrBlank()) return View(this@LocationHistoryActivity)
                
                return InfowindowHistoryMarkerBinding.inflate(layoutInflater).apply {
                    val point = marker.tag as? LocationHistoryViewModel.Point
                    
                    if (point != null) {
                        val cluster = point.clusters.firstOrNull()
                        val isStop = point.isStop()
                        
                        // Determine location name: Safe Zone > Geocoded Address > Generic label
                        val safeZoneName = cluster?.safeZoneName
                        val geocodedAddress = geocoderHelper.getCachedAddress(
                            point.location.latitude.toDouble(),
                            point.location.longitude.toDouble()
                        )
                        
                        when {
                            safeZoneName != null -> {
                                // Safe Zone - show with special icon
                                textLocationName.text = safeZoneName
                                textLocationName.visibility = View.VISIBLE
                                ivTypeIcon.setImageResource(R.drawable.ic_timeline_safezone)
                                ivTypeIcon.visibility = View.VISIBLE
                            }
                            geocodedAddress != null && isStop -> {
                                // Geocoded address for stops
                                textLocationName.text = geocodedAddress
                                textLocationName.visibility = View.VISIBLE
                                ivTypeIcon.setImageResource(R.drawable.ic_timeline_stop)
                                ivTypeIcon.visibility = View.VISIBLE
                            }
                            !isStop -> {
                                // Transit - show moving label
                                textLocationName.text = getString(R.string.location_history_moving)
                                textLocationName.visibility = View.VISIBLE
                                ivTypeIcon.setImageResource(R.drawable.ic_timeline_transit)
                                ivTypeIcon.visibility = View.VISIBLE
                            }
                            else -> {
                                // Stop without address
                                textLocationName.text = getString(R.string.location_history_stop)
                                textLocationName.visibility = View.VISIBLE
                                ivTypeIcon.setImageResource(R.drawable.ic_timeline_stop)
                                ivTypeIcon.visibility = View.VISIBLE
                            }
                        }
                        
                        // Set time range
                        textTime.text = point.getTimes(this@LocationHistoryActivity)
                        
                        // Set duration for stops
                        val durationStr = cluster?.getDurationString()
                        if (durationStr != null && isStop) {
                            textDuration.text = getString(R.string.location_history_duration, durationStr)
                            textDuration.visibility = View.VISIBLE
                        } else {
                            textDuration.visibility = View.GONE
                        }
                    } else {
                        // Fallback to basic display
                        textTime.text = marker.snippet
                        textLocationName.visibility = View.GONE
                        textDuration.visibility = View.GONE
                        ivTypeIcon.visibility = View.GONE
                    }
                }.root
            }

            override fun getInfoContents(marker: Marker): View? = null
        })
    }

}