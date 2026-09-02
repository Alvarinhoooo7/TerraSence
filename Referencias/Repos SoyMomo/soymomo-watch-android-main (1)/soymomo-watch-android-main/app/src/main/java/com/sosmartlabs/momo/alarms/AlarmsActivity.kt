package com.sosmartlabs.momo.alarms

import android.annotation.SuppressLint
import android.app.ProgressDialog
import android.os.Build
import android.os.Bundle
import android.text.Html
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.snackbar.Snackbar
import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.parse.ParseObject
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.alarms.ui.AlarmAdapter
import com.sosmartlabs.momo.alarms.ui.AlarmsViewModel
import com.sosmartlabs.momo.databinding.ActivityAlarmsBinding
import com.sosmartlabs.momo.firebase.FirebaseRemoteConfigRepository
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.DateUtil.get24HoursFormattedTimeNoLocale
import com.sosmartlabs.momo.utils.DividerItemDecoration
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.SnackbarUtils.Companion.showNotConnected
import com.wdullaer.materialdatetimepicker.time.TimePickerDialog
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.Calendar
import java.util.Date
import java.util.concurrent.TimeUnit

/**
 * @author mrgcl
 */
@AndroidEntryPoint
class AlarmsActivity : AppCompatActivity(), TimePickerDialog.OnTimeSetListener {

    private val MAX_ALARMS = 3

    private lateinit var binding: ActivityAlarmsBinding
    private var mAdapter: AlarmAdapter? = null
    private var mWearer: Wearer? = null
    private var mClicked = false
    private var mViewModel: AlarmsViewModel? = null
    private var progressDialog: ProgressDialog? = null
    
    // Edge-to-edge support
    private var fabOriginalBottomMargin = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("AlarmsActivity: onCreate")
        
        enableEdgeToEdge()
        binding = ActivityAlarmsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()
        
        try {
            setSupportActionBar(binding.toolbar)
            supportActionBar?.apply {
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            binding.toolbar.setNavigationOnClickListener { finish() }
        } catch (e: NullPointerException) {
            Timber.e(e)
            val crashlytics = FirebaseCrashlytics.getInstance()
            crashlytics.log("Error setting ActionBar on AlarmsActivity")
            crashlytics.recordException(e)
        }
        
        mViewModel = ViewModelProvider(this)[AlarmsViewModel::class.java]
        
        binding.alarmsRecyclerView.apply {
            setHasFixedSize(true)
            addItemDecoration(DividerItemDecoration(this@AlarmsActivity, null))
            layoutManager = LinearLayoutManager(this@AlarmsActivity)
            mAdapter = AlarmAdapter(ArrayList(), this@AlarmsActivity, this)
            adapter = mAdapter
        }
        
        binding.buttonAddAlarm.setOnClickListener {
            if (mAdapter!!.itemCount >= MAX_ALARMS) {
                showSnackbar(getString(R.string.snackbar_error_max_alarms))
            } else {
                mClicked = true
                val c = Calendar.getInstance()
                c.time = Date()
                val hour = c[Calendar.HOUR_OF_DAY]
                val minute = c[Calendar.MINUTE]
                val dialog = TimePickerDialog.newInstance(this@AlarmsActivity, hour, minute, true)
                dialog.show(supportFragmentManager, "timePicker")
            }
        }
        
        progressDialog = ProgressDialog(this)
        observeViewModel()
    }

    private fun observeViewModel() {
        mViewModel!!.watch.observe(this) { watch: Wearer? -> mWearer = watch }
        mViewModel!!.alarmsList.observe(this) { (status, objects): Resource<List<ParseObject>?, Unit> ->
            when (status) {
                Resource.Status.LOADING -> {
                    progressDialog!!.setMessage(getString(R.string.progress_loading_alarms))
                    progressDialog!!.show()
                }

                Resource.Status.LOAD_SUCCESS -> {
                    progressDialog!!.dismiss()
                    if (objects.isNullOrEmpty()) {
                        if (R.id.layout_no_alarms == binding.viewSwitcher.nextView.id) {
                            binding.viewSwitcher.showNext()
                        }
                    } else {
                        if (R.id.alarms_recycler_view == binding.viewSwitcher.nextView.id) {
                            binding.viewSwitcher.showNext()
                        }
                        mAdapter!!.updateAlarms(objects)
                    }
                }

                Resource.Status.LOAD_ERROR -> {
                    progressDialog!!.dismiss()
                    showSnackbar(getString(R.string.snackbar_error_loading_alarms))
                }

                else -> {
                    // No-Op
                }
            }
        }
    }

    public override fun onResume() {
        super.onResume()
        if (!intent.hasExtra(Constants.EXTRA_WEARER_ID)) finish()
        mViewModel!!.loadAlarms(intent.getStringExtra(Constants.EXTRA_WEARER_ID)!!)
    }

    override fun onTimeSet(dialog: TimePickerDialog, hour: Int, minute: Int, seconds: Int) {
        if (mClicked) {
            mClicked = false
            val c = Calendar.getInstance()
            c[Calendar.HOUR_OF_DAY] = hour
            c[Calendar.MINUTE] = minute
            val alarm = ParseObject.create("Alarm")
            alarm.put("time", get24HoursFormattedTimeNoLocale(c.time))
            alarm.put("active", true)
            alarm.put("watch", mWearer!!)
            alarm.put("daysOfWeek", "1111111")
            mAdapter!!.addAlarm(alarm)
            if (R.id.alarms_recycler_view == binding.viewSwitcher.nextView.id) {
                binding.viewSwitcher.showNext()
            }
            if (mWearer != null && mWearer!!.has("lastTKQ") && Calendar.getInstance().timeInMillis - mWearer!!.getDate("lastTKQ")!!.time > TimeUnit.MINUTES.toMillis(
                    FirebaseRemoteConfigRepository.thresholdMinutesLastTKQ)) {
                showNotConnected(this@AlarmsActivity, binding.coordinator)
            }
        }
    }

    override fun onPause() {
        mAdapter!!.saveAll()
        super.onPause()
    }

    fun showSnackbar(message: String?) {
        val snackbar = Snackbar.make(binding.coordinator, Html.fromHtml(message), Snackbar.LENGTH_LONG)
        snackbar.view.setBackgroundColor(ContextCompat.getColor(this, R.color.colorPrimary))
        snackbar.show()
    }

    private fun setupEdgeToEdge() {
        Timber.d("AlarmsActivity: setupEdgeToEdge")

        // Store original FAB margin
        val fabParams = binding.buttonAddAlarm.layoutParams as CoordinatorLayout.LayoutParams
        fabOriginalBottomMargin = fabParams.bottomMargin

        // Set dark status bar appearance (colorPrimary is dark purple)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.coordinator) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("AlarmsActivity: systemBars $systemBars")
            Timber.d("AlarmsActivity: displayCutout $displayCutout")
            Timber.d("AlarmsActivity: navigationBars $navigationBars")

            // Apply top padding to AppBarLayout to extend colorPrimary background into status bar area
            binding.appBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.appBar.paddingBottom
            )

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("AlarmsActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom margin to FAB for navigation bar
            fabParams.bottomMargin = fabOriginalBottomMargin + bottomPadding
            binding.buttonAddAlarm.layoutParams = fabParams

            windowInsets
        }
    }
}