package com.sosmartlabs.momo.watchlock

import android.os.Bundle
import android.text.Html
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.parse.ParseException
import com.parse.ParseObject
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityLockBinding
import com.sosmartlabs.momo.firebase.FirebaseRemoteConfigRepository
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.SnackbarUtils.Companion.showNotConnected
import com.sosmartlabs.momo.watchlock.ui.EditSilenceTimeBottomSheet
import com.sosmartlabs.momo.watchlock.ui.LockViewModel
import com.sosmartlabs.momo.watchlock.ui.SilenceTimeAdapter
import com.sosmartlabs.momo.watchlock.ui.SilenceTimeSwipeCallback
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.Calendar
import java.util.concurrent.TimeUnit

@AndroidEntryPoint
class LockActivity : AppCompatActivity() {

    // Only legacy watches (Space 2 and older) are capped. Space 3/4 support
    // per-day schedules and are not limited to 4 — see handleAddSilenceClick.
    private val MAX_LEGACY_SILENCES = 4

    private lateinit var binding: ActivityLockBinding
    private lateinit var mAdapter: SilenceTimeAdapter
    private lateinit var mWearer: Wearer
    private lateinit var mViewModel: LockViewModel
    private var fabOriginalBottomMargin = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("LockActivity: onCreate")

        enableEdgeToEdge()
        binding = ActivityLockBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()

        setupToolbar()
        setupViewModel()
        setupRecyclerView()
        setupFAB()
        observeViewModel()
    }

    private fun setupToolbar() {
        try {
            setSupportActionBar(binding.toolbar)
            supportActionBar?.apply {
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            binding.toolbar.setNavigationOnClickListener { finish() }
        } catch (e: NullPointerException) {
            Timber.e(e)
            FirebaseCrashlytics.getInstance().apply {
                log("Error on creating LockActivity")
                recordException(e)
            }
        }
    }

    private fun setupViewModel() {
        mViewModel = ViewModelProvider(this)[LockViewModel::class.java]
    }

    private fun setupRecyclerView() {
        binding.silenceTimeRecyclerView.apply {
            setHasFixedSize(true)
            layoutManager = LinearLayoutManager(this@LockActivity)
            mAdapter = SilenceTimeAdapter(
                ArrayList(),
                this@LockActivity,
                supportsPerDaySchedules = false,
                onRowClick = { schedule -> openEditor(schedule) }
            )
            adapter = mAdapter

            ItemTouchHelper(SilenceTimeSwipeCallback(this@LockActivity) { position ->
                onRowSwipedToDelete(position)
            }).attachToRecyclerView(this)
        }
    }

    private fun setupFAB() {
        binding.buttonAddSilenceTime.setOnClickListener { handleAddSilenceClick() }
        binding.buttonEmptyCreate.setOnClickListener { handleAddSilenceClick() }
    }

    private fun handleAddSilenceClick() {
        // The 4-schedule cap only applies to legacy watches; Space 3/4 (per-day
        // schedules) are uncapped.
        if (!mAdapter.supportsPerDaySchedules && mAdapter.itemCount >= MAX_LEGACY_SILENCES) {
            showSnackbar(getString(R.string.snackbar_too_many_lock_times))
            return
        }
        openEditor(schedule = null)
    }

    private fun openEditor(schedule: ParseObject?) {
        if (!::mWearer.isInitialized) return
        EditSilenceTimeBottomSheet.show(
            fragmentManager = supportFragmentManager,
            schedule = schedule,
            supportsPerDaySchedules = mAdapter.supportsPerDaySchedules,
            listener = object : EditSilenceTimeBottomSheet.Listener {
                override fun onScheduleSaved(saved: ParseObject, isNew: Boolean) {
                    if (isNew) saved.put("watch", mWearer)
                    saved.saveInBackground { e: ParseException? ->
                        if (e != null) {
                            Timber.e(e, "Error saving silence schedule")
                            showSnackbar(getString(R.string.silence_time_save_error))
                            return@saveInBackground
                        }
                        mAdapter.addOrUpdate(saved)
                        handleViewSwitcher()
                        handleNotConnected()
                    }
                }
            }
        )
    }

    private fun onRowSwipedToDelete(position: Int) {
        val target = mAdapter.itemAt(position) ?: return
        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.silence_time_delete_confirm_title)
            .setMessage(R.string.silence_time_delete_confirm_message)
            .setNegativeButton(R.string.button_cancel) { dialog, _ ->
                dialog.dismiss()
                mAdapter.notifyItemChanged(position) // resets the row's swipe offset
            }
            .setPositiveButton(R.string.button_delete) { dialog, _ ->
                dialog.dismiss()
                deleteRow(position, target)
            }
            .setOnCancelListener {
                mAdapter.notifyItemChanged(position)
            }
            .show()
    }

    private fun deleteRow(position: Int, target: ParseObject) {
        val removed = mAdapter.removeAt(position) ?: return
        removed.deleteEventually { e: ParseException? ->
            if (e != null) {
                Timber.e(e, "Error deleting silence time")
                FirebaseCrashlytics.getInstance().recordException(e)
            }
        }
        handleViewSwitcher()
    }

    private fun handleViewSwitcher() {
        // Show the recycler view when the list has any items, otherwise the empty
        // state. The previous implementation always called showNext() which flipped
        // the view back to the empty state after creating the second schedule.
        val targetId = if (mAdapter.itemCount > 0) {
            R.id.silence_time_recycler_view
        } else {
            R.id.layout_no_silence_time
        }
        if (binding.viewSwitcher.currentView.id != targetId) {
            binding.viewSwitcher.showNext()
        }
    }

    private fun handleNotConnected() {
        if (mWearer.has("lastTKQ") && Calendar.getInstance().timeInMillis - mWearer.getDate("lastTKQ")!!.time > TimeUnit.MINUTES.toMillis(
                FirebaseRemoteConfigRepository.thresholdMinutesLastTKQ)) {
            showNotConnected(this, binding.coordinator)
        }
    }

    private fun observeViewModel() {
        mViewModel.watch.observe(this) { watch ->
            mWearer = watch
            // Flip the capability flag in place; the adapter re-renders only if it
            // actually changed (see SilenceTimeAdapter.supportsPerDaySchedules).
            mAdapter.supportsPerDaySchedules = watch.isSpace3OrNewer()
            // Space 3/4 block video calls and messages but still allow phone
            // calls, so the empty-state explainer differs from legacy watches.
            binding.textEmptyDescription.setText(
                if (watch.isSpace3OrNewer()) R.string.lock_empty_list_space3and4
                else R.string.lock_empty_list
            )
        }

        mViewModel.silenceTimeList.observe(this) { resource ->
            when (resource.status) {
                Resource.Status.LOADING -> setLoading(true)
                Resource.Status.LOAD_SUCCESS -> handleLoadSuccess(resource.data)
                Resource.Status.LOAD_ERROR -> handleLoadError()
                else -> {}
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        binding.progressLoading.isVisible = loading
    }

    private fun handleLoadSuccess(silenceTimes: List<ParseObject>?) {
        setLoading(false)
        mAdapter.updateTimes(silenceTimes ?: emptyList())
        handleViewSwitcher()
    }

    private fun handleLoadError() {
        setLoading(false)
        showSnackbar(getString(R.string.snackbar_error_loading_lock))
    }

    override fun onResume() {
        super.onResume()
        if (!intent.hasExtra(Constants.EXTRA_WEARER_ID)) finish()
        mViewModel.loadSilenceTimes(intent.getStringExtra(Constants.EXTRA_WEARER_ID)!!)
    }

    fun showSnackbar(message: String?) {
        val snackbar = Snackbar.make(binding.coordinator, Html.fromHtml(message), Snackbar.LENGTH_LONG)
        snackbar.view.setBackgroundColor(ContextCompat.getColor(this, R.color.colorPrimary))
        snackbar.show()
    }

    private fun setupEdgeToEdge() {
        Timber.d("LockActivity: setupEdgeToEdge")

        val fabParams = binding.buttonAddSilenceTime.layoutParams as CoordinatorLayout.LayoutParams
        fabOriginalBottomMargin = fabParams.bottomMargin

        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.coordinator) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            binding.appBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.appBar.paddingBottom
            )

            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else 0

            fabParams.bottomMargin = fabOriginalBottomMargin + bottomPadding
            binding.buttonAddSilenceTime.layoutParams = fabParams

            windowInsets
        }
    }
}
