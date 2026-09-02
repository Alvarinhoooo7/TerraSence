package com.sosmartlabs.momotabletpadres.tabletsettings.stats

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.github.mikephil.charting.charts.BarChart
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.BarData
import com.github.mikephil.charting.data.BarDataSet
import com.github.mikephil.charting.data.BarEntry
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter
import com.github.mikephil.charting.formatter.ValueFormatter
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.viewmodels.ChartModel
import com.sosmartlabs.momotabletpadres.adapters.new_designs_adapters.AppStatsAdapter
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.core.settings.common.SettingsBaseFragment
import com.sosmartlabs.momotabletpadres.databinding.TabletCardStatsBinding
import com.sosmartlabs.momotabletpadres.databinding.TabletFragmentStatsBinding
import com.sosmartlabs.momotabletpadres.tabletsettings.interfaces.TableListState
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.AppStatsViewModel
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.Calendar

@AndroidEntryPoint
class TabletStatsFragment : SettingsBaseFragment() {
    // Properties
    private lateinit var binding: TabletFragmentStatsBinding
    private lateinit var variableCard: TabletCardStatsBinding
    private lateinit var mTablet: Tablet
    private lateinit var chart: BarChart
    private lateinit var barData: BarData

    // Stack colors: top app 1, 2, 3, then "Other".
    private val chartColors = intArrayOf(
        Color.parseColor("#7F77DD"),
        Color.parseColor("#378ADD"),
        Color.parseColor("#1D9E75"),
        Color.parseColor("#B4B2A9")
    )

    // ViewModels
    private val mTabletViewModel: TabletViewModel by activityViewModels()
    private val mViewModelApp: AppStatsViewModel by viewModels()

    // Constants and variables
    private var thisWeek: Float = 0f
    private val defaultInterval = 2

    // The currentTablet observer owns the first load (one per view creation); onResume
    // skips its first pass so the screen doesn't load twice on open. Re-armed per view
    // in setupInitialState so backstack re-entry loads once again.
    private var isInitialLoad = true

    override val titleResId: Int
        get() = R.string.settings_fragment_initial_stats_title

    init {
        Timber.d("TabletStatsFragment: Initializing fragment")
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("TabletStatsFragment: Creating view and initializing bindings")
        binding = TabletFragmentStatsBinding.inflate(inflater, container, false)
        variableCard = binding.variableCard

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView
        )

        setupToolbar()
        setupInitialState()
        setupViews()
        setupObservers()

        return binding.root
    }

    private fun setupToolbar() {
        Timber.d("TabletStatsFragment: Setting up toolbar")
        (activity as AppCompatActivity).apply {
            setSupportActionBar(binding.toolbar)
            supportActionBar?.apply {
                setDisplayShowTitleEnabled(false)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
        }
        setHasOptionsMenu(true)
    }

    private fun setupInitialState() {
        Timber.d("TabletStatsFragment: Setting initial loading state")
        isInitialLoad = true
        mViewModelApp.tableListState.value = TableListState.Loading
    }

    private fun setupViews() {
        Timber.d("TabletStatsFragment: Initializing views components")
        setupRecyclerView()
        setupChartView()
        setupClickListeners()
    }

    private fun setupRecyclerView() {
        Timber.d("TabletStatsFragment: Configuring RecyclerView with AppStatsAdapter")
        val adapter = AppStatsAdapter(requireContext())
        with(variableCard.recyclerView) {
            this.adapter = adapter
            layoutManager = LinearLayoutManager(context)
        }
    }

    private fun setupChartView() {
        Timber.d("TabletStatsFragment: Setting up bar chart configuration")
        chart = variableCard.barChart
        // Disable the built-in legend ONCE, before any chart.data is ever assigned —
        // we render our own legend in the layout (see updateLegend). Doing this here
        // (rather than only in configureChart, which runs after `chart.data =`) keeps
        // MPAndroidChart's LegendRenderer permanently short-circuited, avoiding a
        // draw-time IndexOutOfBounds in v3.1.0 when the stack count changes per period.
        chart.legend.isEnabled = false
        variableCard.category.visibility = View.GONE
    }

    private fun setupClickListeners() {
        Timber.d("TabletStatsFragment: Setting up view click listeners")
        with(variableCard) {
            // Today / Week / Month -> re-query the app list and re-title the section.
            periodGroup.setOnCheckedStateChangeListener { _, checkedIds ->
                val checkedId = checkedIds.firstOrNull()
                val interval = when (checkedId) {
                    R.id.chip_today -> 1
                    R.id.chip_month -> 3
                    else -> 2 // Week
                }
                variableTitle.setText(periodTitleRes(checkedId)) // renderChart appends the total
                if (::mTablet.isInitialized) {
                    // loadPeriod owns the spinner: Loading only on a cold miss; a cached period
                    // paints instantly with no spinner (avoids a 1-frame flash over fresh data).
                    mViewModelApp.loadPeriod(mTablet, interval)
                }
            }
            // Title for the default-checked chip (Week) — the listener doesn't fire on init.
            variableTitle.setText(periodTitleRes(periodGroup.checkedChipId))
        }
    }

    /** Section heading for the selected period chip. */
    private fun periodTitleRes(checkedId: Int?): Int = when (checkedId) {
        R.id.chip_today -> R.string.settings_stats_period_today
        R.id.chip_month -> R.string.settings_stats_period_month
        else -> R.string.settings_stats_period_week
    }

    private fun setupObservers() {
        Timber.d("TabletStatsFragment: Initializing ViewModel observers")
        setupTabletObserver()
        setupUsageStatsObserver()
        setupChartObserver()
        setupStateObserver()
        setupDailyStatsObserver()
        setupWeekBeforeObserver()
    }

    /** Shows a spinner over the chart while a period is (re)loading. */
    private fun setupStateObserver() {
        mViewModelApp.tableListState.observe(viewLifecycleOwner) { state ->
            variableCard.chartProgress.visibility =
                if (state == TableListState.Loading) View.VISIBLE else View.GONE
        }
    }

    private fun setupTabletObserver() {
        Timber.d("TabletStatsFragment: Setting up tablet observer")
        mTabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("TabletStatsFragment: Current tablet updated - ID: ${tablet.id}")
            mTablet = tablet
            // Owns the initial load (one per view creation); onResume skips its first pass.
            loadAll(tablet, defaultInterval)
        }
    }

    private fun setupChartObserver() {
        mViewModelApp.usageChart.observe(viewLifecycleOwner) { model ->
            model?.let { renderChart(it) }
        }
    }

    private fun setupUsageStatsObserver() {
        Timber.d("TabletStatsFragment: Setting up usage stats observer")
        mViewModelApp.usageStatsList.observe(viewLifecycleOwner) { stats ->
            Timber.d("TabletStatsFragment: Processing ${stats?.first?.size ?: 0} usage stats")
            stats?.let {
                (variableCard.recyclerView.adapter as AppStatsAdapter).replaceData(it.first, it.second)
                variableCard.insightTopApp.text = it.first.firstOrNull()?.appName ?: "—"
                variableCard.insightAppsUsed.text = it.first.size.toString()
            }
        }
    }

    private fun setupDailyStatsObserver() {
        Timber.d("TabletStatsFragment: Setting up daily stats observer")
        mViewModelApp.usageStatsListPerDay.observe(viewLifecycleOwner) { dailyStats ->
            Timber.d("TabletStatsFragment: Processing ${dailyStats?.size ?: 0} daily stats")
            dailyStats?.let {
                if (it.isNotEmpty()) {
                    computeWeekComparison()
                }
            }
        }
    }

    private fun setupWeekBeforeObserver() {
        Timber.d("TabletStatsFragment: Setting up previous week observer")
        mViewModelApp.weekBefore.observe(viewLifecycleOwner) { previousWeek ->
            Timber.d("TabletStatsFragment: Processing previous week data: $previousWeek")
            previousWeek?.let {
                val lastWeek = it.toFloat() / 60 / 60
                if (lastWeek > 0.5f) {
                    val change = (thisWeek - lastWeek) / lastWeek * 100
                    setThanLastWeek(change)
                }
            }
        }
    }

    /** Full refresh for one period: list+chart (single fetch), week header, near-live push. */
    private fun loadAll(tablet: Tablet, interval: Int) {
        mViewModelApp.loadPeriod(tablet, interval)
        mViewModelApp.loadUsageStatsAllWeek(tablet) // for the "vs last week" header
        mViewModelApp.requestFreshStats(tablet, interval) // debounced near-live push + reload
    }

    override fun onResume() {
        super.onResume()
        Timber.d("TabletStatsFragment: Fragment resumed, refreshing usage stats")
        // Initial load is owned by the currentTablet observer; skip the first resume after
        // (re)creation to avoid a double load on open. Later resumes (returning to a still-
        // alive screen) refresh normally.
        if (isInitialLoad) {
            isInitialLoad = false
            return
        }
        mTabletViewModel.currentTablet.value?.let { tablet ->
            loadAll(tablet, currentInterval())
        }
    }

    private fun currentInterval(): Int = when (variableCard.periodGroup.checkedChipId) {
        R.id.chip_today -> 1
        R.id.chip_month -> 3
        else -> 2
    }

    private fun setThanLastWeek(change: Float) {
        Timber.d("TabletStatsFragment: Updating week comparison - Change: %.2f%%", change)
        with(variableCard) {
            if (change >= 0) {
                thanLastWeek.text = getString(R.string.settings_stats_daily_average_more_than, change.toInt())
                statsChange.rotation = 180f
            } else {
                val newchange = change * -1
                thanLastWeek.text = getString(R.string.settings_stats_daily_average_less_than, newchange.toInt())
            }
            thanLastWeek.visibility = View.VISIBLE
            statsChange.visibility = View.VISIBLE
        }
    }

    private fun setTimeUse(hours: Int, minutes: Int) {
        Timber.d("TabletStatsFragment: Setting time use - Hours: $hours, Minutes: $minutes")
        variableCard.timeUse.text = getString(R.string.settings_stats_daily_average_time, hours, minutes)
    }

    private fun configureChart(granularity: Float) {
        Timber.d("TabletStatsFragment: Configuring chart with granularity: $granularity")
        with(chart) {
            description.isEnabled = false
            setExtraOffsets(5F, 10F, 5F, 5F)
            dragDecelerationFrictionCoef = 0.95f
            setNoDataText(getString(R.string.chart_loading_apps))
            // legend stays disabled from setupChartView (we draw our own in the layout)
            axisLeft.isEnabled = false

            axisRight.apply {
                setTextColor(resources.getColor(R.color.colorPrimary))
                setDrawGridLines(false)
                setDrawAxisLine(false)
                this.granularity = granularity
                axisMinimum = 0f
                valueFormatter = object : ValueFormatter() {
                    override fun getFormattedValue(value: Float): String {
                        val totalMinutes = (value * 60).toInt()
                        val hours = totalMinutes / 60
                        val minutes = totalMinutes % 60
                        return if (hours > 0) "${hours}h ${minutes}m" else "${minutes}m"
                    }
                }
            }
            
            axisLeft.axisMinimum = 0f
            // Reset first: the chart instance is reused across period switches, and a
            // pinned 2h max would otherwise carry over and clip taller bars (e.g. a 2.5h
            // day in Month after viewing a ~1h Week).
            axisRight.resetAxisMaximum()
            if (granularity == 1f) {
                axisRight.axisMaximum = 2f
            }
            setTouchEnabled(false)
        }
    }

    /** Weekly total + "vs last week" header — stays weekly regardless of the selected period. */
    private fun computeWeekComparison() {
        val perDay = mViewModelApp.usageStatsListPerDay.value ?: return
        val dow = Calendar.getInstance().get(Calendar.DAY_OF_WEEK)
        val todayPos = if (dow == Calendar.SUNDAY) 7 else dow - 1
        var totalSeconds = 0
        for (i in 0 until todayPos) {
            val idx = todayPos - 1 - i
            if (idx in perDay.indices) totalSeconds += perDay[idx].sumOf { it.foregroundUsage }
        }
        thisWeek = totalSeconds.toFloat() / 60 / 60
        // Compare like-for-like: prior week bounded to the same elapsed days (Mon..today)
        // so early in the week we don't divide week-to-date by a full 7 days.
        if (::mTablet.isInitialized) mViewModelApp.getDataWeekBefore(mTablet, todayPos)
    }

    /** Renders the period-aware chart (bars are time slots stacked by the period's top apps). */
    private fun renderChart(model: ChartModel) {
        Timber.d("TabletStatsFragment: Rendering chart for period ${model.period} (${model.buckets.size} bars)")
        val stackCount = model.topApps.size + 1
        val entries = model.buckets.mapIndexed { i, bucket ->
            val values = FloatArray(stackCount)
            var otherSeconds = 0
            bucket.perApp.forEach { (app, seconds) ->
                val idx = model.topApps.indexOf(app)
                if (idx >= 0) values[idx] += seconds / 3600f else otherSeconds += seconds
            }
            values[stackCount - 1] = otherSeconds / 3600f
            BarEntry(i.toFloat(), values)
        }
        val stackLabels = (model.topApps + getString(R.string.settings_category_others)).toTypedArray()
        val dataSet = BarDataSet(entries, "").apply {
            setDrawIcons(false)
            setDrawValues(false)
            colors = chartColors.copyOf(stackCount).toList()
            setStackLabels(stackLabels)
        }
        barData = BarData(dataSet).apply { barWidth = if (model.period == 2) 0.5f else 0.65f }

        val maxHours = (model.buckets.maxOfOrNull { it.total } ?: 0).toFloat() / 3600f
        val granularity = when {
            maxHours > 2f -> 2f
            maxHours > 1f -> 1f
            else -> (maxHours - 0.1f).coerceAtLeast(0.1f)
        }

        chart.xAxis.apply {
            position = XAxis.XAxisPosition.BOTTOM
            setDrawGridLines(false)
            setDrawAxisLine(false)
            textColor = resources.getColor(R.color.colorPrimary)
            this.granularity = 1f
            isGranularityEnabled = true
            axisMinimum = -0.5f
            axisMaximum = model.buckets.size - 0.5f
            valueFormatter = IndexAxisValueFormatter(buildXLabels(model))
            setLabelCount(model.buckets.size.coerceAtMost(8), false)
        }
        chart.data = barData
        configureChart(granularity)
        updateLegend(stackLabels)
        chart.invalidate()

        // Period-aware insights + headline total in the section heading.
        variableCard.insightBusiest.text = model.busiestLabel ?: "—"
        val avgH = model.averageSeconds / 3600
        val avgM = (model.averageSeconds % 3600) / 60
        variableCard.insightAvg.text = "${avgH}h ${avgM}m"
        setTimeUse(avgH, avgM)
        variableCard.chartLegend.visibility = if (model.totalSeconds > 0) View.VISIBLE else View.GONE

        val nameRes = when (model.period) {
            1 -> R.string.settings_stats_period_today
            3 -> R.string.settings_stats_period_month
            else -> R.string.settings_stats_period_week
        }
        val totH = model.totalSeconds / 3600
        val totM = (model.totalSeconds % 3600) / 60
        val total = if (totH > 0) "${totH}h ${totM}m" else "${totM}m"
        variableCard.variableTitle.text = "${getString(nameRes)} · $total"
    }

    private fun buildXLabels(model: ChartModel): List<String> = when (model.period) {
        1 -> model.buckets.map { "${it.label}h" }  // hours of today
        else -> model.buckets.map { it.label }      // weekday initials / day numbers
    }

    /** Fills the layout legend (one colored dot + label per stack), hiding unused slots. */
    private fun updateLegend(stackLabels: Array<String>) = with(variableCard) {
        val items = listOf(
            Triple(legendItem1, legendDot1, legendLabel1),
            Triple(legendItem2, legendDot2, legendLabel2),
            Triple(legendItem3, legendDot3, legendLabel3),
            Triple(legendItem4, legendDot4, legendLabel4)
        )
        items.forEachIndexed { i, (item, dot, label) ->
            if (i < stackLabels.size) {
                item.visibility = View.VISIBLE
                dot.setBackgroundColor(chartColors[i.coerceAtMost(chartColors.size - 1)])
                label.text = stackLabels[i]
            } else {
                item.visibility = View.GONE
            }
        }
    }
}
