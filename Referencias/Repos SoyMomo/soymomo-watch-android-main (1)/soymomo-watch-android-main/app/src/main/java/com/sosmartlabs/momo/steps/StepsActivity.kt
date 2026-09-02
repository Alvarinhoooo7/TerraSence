package com.sosmartlabs.momo.steps

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.github.mikephil.charting.charts.BarChart
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.BarData
import com.github.mikephil.charting.data.BarDataSet
import com.github.mikephil.charting.data.BarEntry
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter
import com.github.mikephil.charting.formatter.ValueFormatter
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityStepsBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.steps.ui.StepsViewModel
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.DateUtil
import com.sosmartlabs.momo.utils.ConversionsUtil
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

@AndroidEntryPoint
class StepsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityStepsBinding
    private val toolbarConstructor = ToolbarConstructor(this)
    private lateinit var barChart: BarChart

    private lateinit var watch: Wearer
    private var watchId: String? = null

    private val stepsViewModel: StepsViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("StepsActivity: onCreate started")
        
        enableEdgeToEdge()
        binding = ActivityStepsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()
        
        barChart = binding.stepsChart

        watchId = intent.getStringExtra(Constants.EXTRA_WEARER_ID)
        if (watchId.isNullOrEmpty()) {
            Timber.e("StepsActivity: No wearer objectId provided, finishing activity")
            CrashlyticsLog.log("StepsActivity launched without wearer objectId")
            finish()
            return
        }
        Timber.d("StepsActivity: Initializing with wearer objectId: $watchId")

        setToolbar()
        setBarChart()
        observeViewModel()
        Timber.d("StepsActivity: onCreate completed")
    }

    override fun onResume() {
        super.onResume()
        Timber.d("StepsActivity: onResume called")
        loadData()
    }

    private fun setToolbar() {
        Timber.d("StepsActivity: Setting up toolbar")
        toolbarConstructor
            .setDisplayShowTitle(false)
            .setTitle(R.string.title_steps)
            .build()
    }

    private fun setBarChart() {
        Timber.d("StepsActivity: Configuring bar chart")
        // Make chart background transparent and configure appearance
        with(barChart) {
            setBackgroundColor(Color.TRANSPARENT)
            setDrawBorders(false)
            setDrawGridBackground(false)
            description.isEnabled = false
            legend.isEnabled = false

            // Remove "no data available" message
            setNoDataText("")

            // Disable zoom and interaction
            setPinchZoom(false)
            setScaleEnabled(false)
            isDoubleTapToZoomEnabled = false
            setTouchEnabled(false)

            // Add extra bottom margin for X-axis labels
            extraBottomOffset = 16f

            // Add animation
            animateY(TimeUnit.SECONDS.toMillis(1).toInt())
        }

        // Configure X axis
        barChart.xAxis.apply {
            position = XAxis.XAxisPosition.BOTTOM
            setDrawGridLines(false)
            setDrawAxisLine(true)
            axisLineColor = Color.WHITE
            textColor = Color.WHITE
            textSize = 12f
            granularity = 1f
        }

        // Configure Y axis left (values)
        barChart.axisLeft.apply {
            setDrawGridLines(false)
            setDrawAxisLine(false)
            textColor = Color.WHITE
            setDrawLabels(false)
        }

        // Disable right Y axis
        barChart.axisRight.isEnabled = false
        Timber.d("StepsActivity: Bar chart configuration completed")
    }

    private fun observeViewModel() {
        Timber.d("StepsActivity: Setting up view model observers")
        
        stepsViewModel.watch.observe(this) { wearer ->
            Timber.d("StepsActivity: Watch data updated for ${wearer.objectId}")
            watch = wearer

            val stepsValue = if (wearer.has("steps")) wearer.steps.toString() else "0"
            binding.stepsTotalContent.text = stepsValue

            // Hide cards when data is not set
            val hasWeight = wearer.has("weight") && wearer.weight != null && wearer.weight!! > 0
            val hasHeight = wearer.has("height") && wearer.height != null && wearer.height!! > 0
            val birthday = wearer.getDate("birthday")
            val hasAge = birthday != null

            binding.stepsUserWeightCard.visibility = if (hasWeight) View.VISIBLE else View.GONE
            binding.stepsUserHeightCard.visibility = if (hasHeight) View.VISIBLE else View.GONE

            var ageValid = false
            if (!hasAge) {
                binding.stepsUserAgeCard.visibility = View.GONE
            } else {
                val calendar = Calendar.getInstance()
                calendar.time = Date(birthday!!.time - Date().time)
                val age = 1970 - (calendar.get(Calendar.YEAR) + 1)
                if (age > 0) {
                    ageValid = true
                    binding.stepsUserAgeCard.visibility = View.VISIBLE
                    binding.stepsUserAgeContent.text = "$age ${getString(R.string.steps_years)}"
                } else {
                    binding.stepsUserAgeCard.visibility = View.GONE
                }
            }

            // Hide entire flexbox if all cards are gone
            binding.stepsUserInfoFlexbox.visibility =
                if (!hasWeight && !hasHeight && !ageValid) View.GONE else View.VISIBLE
        }

        stepsViewModel.isImperialMeasureSystem.observe(this) { isImperial ->
            Timber.d("StepsActivity: Measurement system updated - Imperial: $isImperial")

            with(binding) {
                if (isImperial == false) {
                    // Metric system
                    val weight = if (watch.has("weight") && watch.weight != null) {
                        watch.weight.toString()
                    } else {
                        "0"
                    }
                    val weightText = weight.plus(" ").plus(applicationContext.getString(R.string.steps_kg))
                    stepsUserWeightContent.text = weightText
                    Timber.d("StepsActivity: Updated weight to $weightText (metric)")

                    val height = if (watch.has("height") && watch.height != null) {
                        watch.height.toString()
                    } else {
                        "0"
                    }
                    val heightText = height.plus(" ").plus(applicationContext.getString(R.string.steps_cm))
                    stepsUserHeightContent.text = heightText
                    Timber.d("StepsActivity: Updated height to $heightText (metric)")
                } else {
                    // Imperial system
                    val weight = if (watch.has("weight") && watch.weight != null) {
                        ConversionsUtil.convertKgToLbs(watch.weight!!).toString()
                    } else {
                        "0"
                    }
                    val weightText = weight.plus(" ").plus(applicationContext.getString(R.string.steps_lbs))
                    stepsUserWeightContent.text = weightText
                    Timber.d("StepsActivity: Updated weight to $weightText (imperial)")

                    val height = if (watch.has("height") && watch.height != null) {
                        val ftAndIn = ConversionsUtil.convertCmToFtAndIn(watch.height!!)
                        getString(R.string.height_children_has_imperial, ftAndIn.first, ftAndIn.second)
                    } else {
                        "0' 0\""
                    }
                    stepsUserHeightContent.text = height
                    Timber.d("StepsActivity: Updated height to $height (imperial)")
                }
            }
        }

        stepsViewModel.pedometerData.observe(this) { resource ->
            when (resource.status) {
                Resource.Status.LOADING -> {
                    Timber.d("StepsActivity: Loading pedometer data")
                    binding.stepsViewFlipper.displayedChild = 1
                }
                Resource.Status.LOAD_SUCCESS -> {
                    Timber.d("StepsActivity: Successfully loaded pedometer data")
                    binding.stepsViewFlipper.displayedChild = 0

                    val pedometerData = resource.data!!
                    if (pedometerData.isEmpty()) {
                        Timber.d("StepsActivity: No steps data, showing empty state")
                        binding.stepsPlotCard.visibility = View.GONE
                        binding.stepsEmptyCard.visibility = View.VISIBLE
                        binding.stepsTodayCard.visibility = View.GONE
                        binding.stepsTotalContent.text = "0"
                        binding.stepsRewardsContent.text = "0"
                        binding.stepsEncouragement.visibility = View.VISIBLE
                        return@observe
                    }

                    Timber.d("StepsActivity: Found ${pedometerData.size} pedometer records")
                    binding.stepsPlotCard.visibility = View.VISIBLE
                    binding.stepsEmptyCard.visibility = View.GONE

                    val watchTz = TimeZone.getTimeZone(DateUtil.formatWatchTimeZone(watch.settings.timeZone))
                    val currentDate = Calendar.getInstance()

                    // Set timezone BEFORE midnight to avoid shifting the date
                    // when watch TZ differs from phone TZ
                    currentDate.timeZone = watchTz
                    currentDate[Calendar.HOUR_OF_DAY] = 0
                    currentDate[Calendar.MINUTE] = 0
                    currentDate[Calendar.SECOND] = 0
                    currentDate[Calendar.MILLISECOND] = 0

                    val debugDateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).apply { timeZone = watchTz }
                    Timber.d("StepsActivity: Reference date set to ${debugDateFormat.format(currentDate.time)} (watchTz=$watchTz)")

                    val dayLabels = arrayOfNulls<String>(7)
                    val stepCounts = arrayOfNulls<Int>(7)
                    var pedometerIndex = 0
                    var weeklyStepTotal = 0
                    val dayFormatter = SimpleDateFormat("EEE", Locale.getDefault()).apply {
                        timeZone = watchTz
                    }

                    Timber.d("StepsActivity: Processing pedometer data with ${pedometerData.size} records")

                    for (dayOffset in 6 downTo 0) {
                        val currentDay = currentDate.time
                        Timber.d("StepsActivity: Processing day offset $dayOffset (${debugDateFormat.format(currentDay)})")

                        if (pedometerData.isNotEmpty() && pedometerIndex < pedometerData.size) {
                            val pedometerDate = pedometerData[pedometerIndex].date
                            Timber.d("StepsActivity: Comparing with pedometer record at index $pedometerIndex, date: ${debugDateFormat.format(pedometerDate)}")

                            if (pedometerDate >= currentDay) {
                                val steps = pedometerData[pedometerIndex].steps.toInt()
                                Timber.d("StepsActivity: Match found! Using steps: $steps")
                                stepCounts[dayOffset] = steps
                                pedometerIndex++
                            } else {
                                Timber.d("StepsActivity: No matching record for this day, using 0 steps")
                                stepCounts[dayOffset] = 0
                            }
                        } else {
                            Timber.d("StepsActivity: No more pedometer records available, using 0 steps")
                            stepCounts[dayOffset] = 0
                        }

                        dayLabels[dayOffset] = if (dayOffset == 6) getString(R.string.steps_today) else dayFormatter.format(currentDay)
                        weeklyStepTotal += stepCounts[dayOffset]!!.toInt()
                        Timber.d("StepsActivity: Day ${dayLabels[dayOffset]} has ${stepCounts[dayOffset]} steps, running total: $weeklyStepTotal")

                        currentDate[Calendar.DAY_OF_YEAR] = currentDate[Calendar.DAY_OF_YEAR] - 1
                    }

                    Timber.d("StepsActivity: Final step counts array: ${stepCounts.joinToString()}")
                    Timber.d("StepsActivity: Final day labels array: ${dayLabels.joinToString()}")
                    Timber.d("StepsActivity: Plotting steps data with weekly total: $weeklyStepTotal")
                    // Today card
                    val todaySteps = stepCounts[6] ?: 0
                    binding.stepsTodayCard.visibility = View.VISIBLE
                    binding.stepsTodayCount.text = todaySteps.toString()
                    binding.stepsTodayLabel.text = getString(R.string.steps_today_label)

                    binding.stepsTotalContent.text = weeklyStepTotal.toString()

                    val stars = getStars(weeklyStepTotal.toFloat())
                    binding.stepsRewardsContent.text = stars.toString()

                    // Set date range label (oldest - newest)
                    val dateRangeFormat = SimpleDateFormat("MMM d", Locale.getDefault()).apply { timeZone = watchTz }
                    // After the loop, currentDate has been decremented past the oldest day;
                    // recalculate from the labels: index 0 is oldest, index 6 is newest (today)
                    val rangeCal = Calendar.getInstance().apply { timeZone = watchTz }
                    rangeCal[Calendar.HOUR_OF_DAY] = 0
                    rangeCal[Calendar.MINUTE] = 0
                    rangeCal[Calendar.SECOND] = 0
                    rangeCal[Calendar.MILLISECOND] = 0
                    val newestDate = rangeCal.time
                    rangeCal.add(Calendar.DAY_OF_YEAR, -6)
                    val oldestDate = rangeCal.time
                    binding.stepsDateRange.text = "${dateRangeFormat.format(oldestDate)} - ${dateRangeFormat.format(newestDate)}"

                    binding.stepsEncouragement.visibility = View.VISIBLE

                    plotData(stepCounts, dayLabels)
                }
                Resource.Status.LOAD_ERROR -> {
                    Timber.e("StepsActivity: Error loading pedometer data for wearer ${watch.objectId}")
                    CrashlyticsLog.log("Failed to load pedometer data for wearer ${watch.objectId}")
                    binding.stepsViewFlipper.displayedChild = 1
                    Toast.makeText(this, R.string.toast_error_loading_steps, Toast.LENGTH_LONG).show()
                    finish()
                }
                else -> {
                    Timber.d("StepsActivity: Unhandled resource status: ${resource.status}")
                    CrashlyticsLog.log("StepsActivity: Unhandled resource status: ${resource.status}")
                }
            }
        }
        
        Timber.d("StepsActivity: View model observers setup completed")
    }

    private fun loadData() {
        Timber.d("StepsActivity: Fetching information for wearer $watchId")
        if (watchId.isNullOrEmpty()) {
            Timber.e("StepsActivity: No wearer objectId provided, finishing activity")
            CrashlyticsLog.log("StepsActivity launched without wearer objectId")
            finish()
            return
        }
        stepsViewModel.fetchInformation(watchId!!)
    }

    private fun plotData(values: Array<Int?>, labels: Array<String?>) {
        Timber.d("StepsActivity: Plotting data with ${values.size} values and ${labels.size} labels")
        // Convert values to BarEntry objects
        val entries = values.mapIndexed { index, value ->
            BarEntry(index.toFloat(), value?.toFloat() ?: 0f)
        }

        // Per-bar colors: today (index 6) is full white, past days are semi-transparent
        val todayColor = Color.WHITE
        val pastColor = Color.argb(128, 255, 255, 255) // 50% white
        val barColors = values.indices.map { index ->
            if (index == values.size - 1) todayColor else pastColor
        }

        val dataSet = BarDataSet(entries, "").apply {
            colors = barColors

            setDrawValues(true)
            valueTextColor = Color.WHITE
            valueTextSize = 12f

            // Hide "0" labels on empty bars
            valueFormatter = object : ValueFormatter() {
                override fun getFormattedValue(value: Float): String {
                    return if (value.toInt() == 0) "" else value.toInt().toString()
                }
            }
        }

        val data = BarData(dataSet).apply {
            barWidth = 0.6f
        }

        barChart.xAxis.valueFormatter = IndexAxisValueFormatter(labels)
        barChart.data = data
        barChart.invalidate()
    }

    private fun getStars(steps: Float): Int {
        Timber.d("StepsActivity: Calculating stars for $steps steps")

        if (steps < 0) {
            Timber.w("StepsActivity: Negative steps value detected: $steps")
            CrashlyticsLog.log("StepsActivity: Negative steps value detected: $steps")
            return 0
        }

        val stars = (steps / 1000).toInt()
        Timber.d("StepsActivity: Calculated $stars stars for $steps steps")
        return stars
    }

    private fun setupEdgeToEdge() {
        Timber.d("StepsActivity: setupEdgeToEdge")

        // Set dark status bar appearance (colorPrimary is dark purple)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.stepsLayout) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("StepsActivity: systemBars $systemBars")
            Timber.d("StepsActivity: displayCutout $displayCutout")
            Timber.d("StepsActivity: navigationBars $navigationBars")

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

            Timber.d("StepsActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to NestedScrollView for navigation bar
            val nestedScrollView = binding.stepsLayout.getChildAt(1) as? androidx.core.widget.NestedScrollView
            nestedScrollView?.setPadding(
                nestedScrollView.paddingLeft,
                nestedScrollView.paddingTop,
                nestedScrollView.paddingRight,
                bottomPadding
            )

            windowInsets
        }
    }
}
