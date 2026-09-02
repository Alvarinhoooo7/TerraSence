package com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.range

import android.app.AlertDialog
import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.button.MaterialButton
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.DialogTabletTimeUseRangeBinding
import com.sosmartlabs.momotabletpadres.databinding.TabletFragmentTimeUseRangeBinding
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tabletsettings.interfaces.TableListState
import com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.UseTimeViewModel
import com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.model.UseTime
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.Calendar

/**
 * Displays and manages “Use range” rules (start-time → end-time).
 */
@AndroidEntryPoint
class UseTimeRangeFragment : Fragment() {

    // ───────────────────────── view-binding ─────────────────────────
    private var _binding: TabletFragmentTimeUseRangeBinding? = null
    private val binding get() = _binding!!

    // ───────────────────────── view-models ──────────────────────────
    private val tabletViewModel: TabletViewModel by activityViewModels()
    private val useTimeViewModel: UseTimeViewModel by viewModels()

    // ───────────────────────── adapter & listener ───────────────────
    private lateinit var rangeAdapter: UseTimeRangeAdapter
    private lateinit var rangeListener: RangeAdapterListener

    private lateinit var dialogBinding: DialogTabletTimeUseRangeBinding

    // ────────────────────────── lifecycle ───────────────────────────
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("TabletTimeUseRangeFragment: onCreateView - inflating layout")
        _binding = TabletFragmentTimeUseRangeBinding.inflate(inflater, container, false)
        setupToolbar()
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("TabletTimeUseRangeFragment: onViewCreated - initializing views and observers")
        super.onViewCreated(view, savedInstanceState)
        useTimeViewModel.tableListState.value = TableListState.Loading
        setupViews()
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView
        )
        observeViewModels()
    }

    override fun onResume() {
        Timber.d("TabletTimeUseRangeFragment: onResume - loading use hours for current tablet")
        super.onResume()
        tabletViewModel.currentTablet.value?.let {
            Timber.d("TabletTimeUseRangeFragment: onResume - currentTablet is not null, loading use hours")
            useTimeViewModel.loadUseHours(it)
        } ?: Timber.w("TabletTimeUseRangeFragment: onResume - currentTablet is null, cannot load use hours")
    }

    override fun onDestroyView() {
        Timber.d("TabletTimeUseRangeFragment: onDestroyView - clearing binding")
        super.onDestroyView()
        _binding = null
    }

    private fun setupToolbar() {
        Timber.d("TabletTimeUseRangeFragment: setupToolbar - configuring toolbar")
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

    // ───────────────────────── UI setup ─────────────────────────────
    private fun setupViews() {
        Timber.d("TabletTimeUseRangeFragment: setupViews - setting up adapter and listeners")
        rangeListener = RangeAdapterListener()
        rangeAdapter  = UseTimeRangeAdapter(rangeListener)

        binding.addButton.setOnClickListener {
            Timber.d("TabletTimeUseRangeFragment: setupViews - addButton clicked, showing create dialog")
            showCreateDialog()
        }

        binding.recyclerView.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = rangeAdapter
            val dividerItemDecoration = DividerItemDecoration(
                context,
                (layoutManager as LinearLayoutManager).orientation
            )
            addItemDecoration(dividerItemDecoration)
        }
    }

    private fun observeViewModels() {
        Timber.d("TabletTimeUseRangeFragment: observeViewModels - observing currentTablet and rangeList")
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) {
            Timber.d("TabletTimeUseRangeFragment: observeViewModels - currentTablet changed, loading use hours")
            useTimeViewModel.loadUseHours(it)
        }

        useTimeViewModel.rangeList.observe(viewLifecycleOwner) { list ->
            Timber.d("TabletTimeUseRangeFragment: observeViewModels - rangeList updated, filtering for isRange == true")
            val ranges = list.filter { it.isRange == true }
            binding.recyclerView.visibility =
                if (ranges.isEmpty()) View.GONE else View.VISIBLE
            Timber.d("TabletTimeUseRangeFragment: observeViewModels - submitting ${ranges.size} ranges to adapter")
            rangeAdapter.submitList(ranges)
        }
    }

    // ─────────────────────── dialogs: create / edit ─────────────────
    private fun showCreateDialog() {
        Timber.d("TabletTimeUseRangeFragment: showCreateDialog - inflating dialog for new range")
        dialogBinding = DialogTabletTimeUseRangeBinding.inflate(layoutInflater)
        val dialog = dialogBinding.transparentDialog()

        var daySelected = 0
        val dayButtons  = dialogBinding.dayButtons()
        tintButtons(dayButtons, daySelected)

        dayButtons.forEachIndexed { idx, btn ->
            btn.setOnClickListener {
                Timber.d("TabletTimeUseRangeFragment: showCreateDialog - day button $idx selected")
                daySelected = idx
                tintButtons(dayButtons, daySelected)
            }
        }

        dialogBinding.setPickersForNew()

        dialogBinding.buttonCancel.setOnClickListener {
            Timber.d("TabletTimeUseRangeFragment: showCreateDialog - cancel button clicked, dismissing dialog")
            dialog.dismiss()
        }
        dialogBinding.buttonSave.setOnClickListener {
            Timber.d("TabletTimeUseRangeFragment: showCreateDialog - save button clicked, handling save")
            try {
                handleSave(daySelected)
            } catch (e: Exception) {
                Timber.e(e, "TabletTimeUseRangeFragment: showCreateDialog - Error in handleSave")
                CrashlyticsLog.recordException(e, "TabletTimeUseRangeFragment: Error in handleSave (create dialog)")
            }
            dialog.dismiss()
        }

        dialog.show()
        Timber.d("TabletTimeUseRangeFragment: showCreateDialog - dialog shown")
    }

    private fun showEditDialog(useTime: UseTime) {
        Timber.d("TabletTimeUseRangeFragment: showEditDialog - inflating dialog for editing useTime id=${useTime.id}")
        dialogBinding = DialogTabletTimeUseRangeBinding.inflate(layoutInflater)
        val dialog = dialogBinding.transparentDialog()

        var daySelected = useTime.days.indexOfFirst { it == 1 }
        val dayButtons  = dialogBinding.dayButtons()
        tintButtons(dayButtons, daySelected)

        dayButtons.forEachIndexed { idx, btn ->
            btn.setOnClickListener {
                Timber.d("TabletTimeUseRangeFragment: showEditDialog - day button $idx selected")
                daySelected = idx
                tintButtons(dayButtons, daySelected)
            }
        }

        dialogBinding.setPickersFromUseTime(useTime)

        dialogBinding.buttonCancel.apply {
            text = getString(R.string.settings_button_delete)
            setOnClickListener {
                Timber.d("TabletTimeUseRangeFragment: showEditDialog - delete button clicked for useTime id=${useTime.id}")
                showDeleteDialog(useTime)
                dialog.dismiss()
            }
        }

        dialogBinding.buttonSave.setOnClickListener {
            Timber.d("TabletTimeUseRangeFragment: showEditDialog - save button clicked for useTime id=${useTime.id}")
            try {
                handleEdit(useTime)
            } catch (e: Exception) {
                Timber.e(e, "TabletTimeUseRangeFragment: showEditDialog - Error in handleEdit for useTime id=${useTime.id}")
                CrashlyticsLog.recordException(e, "TabletTimeUseRangeFragment: Error in handleEdit (edit dialog) for useTime id=${useTime.id}")
            }
            dialog.dismiss()
        }

        dialog.show()
        Timber.d("TabletTimeUseRangeFragment: showEditDialog - dialog shown for useTime id=${useTime.id}")
    }

    private fun showDeleteDialog(useTime: UseTime) {
        Timber.d("TabletTimeUseRangeFragment: showDeleteDialog - showing delete confirmation for useTime id=${useTime.id}")
        AlertDialog.Builder(requireContext())
            .setTitle(R.string.use_time_delete_title)
            .setMessage(R.string.use_time_delete_description)
            .setPositiveButton(R.string.use_time_confirm_delete) { _, _ ->
                Timber.d("TabletTimeUseRangeFragment: showDeleteDialog - confirmed delete for useTime id=${useTime.id}")
                try {
                    tabletViewModel.currentTablet.value?.let {
                        useTimeViewModel.deleteUseTimeRange(it, useTime)
                        Timber.d("TabletTimeUseRangeFragment: showDeleteDialog - deleteUseTimeRange called for useTime id=${useTime.id}")
                    } ?: run {
                        Timber.e("TabletTimeUseRangeFragment: showDeleteDialog - currentTablet is null, cannot delete useTime id=${useTime.id}")
                        CrashlyticsLog.log("TabletTimeUseRangeFragment: showDeleteDialog - currentTablet is null on delete")
                    }
                } catch (e: Exception) {
                    Timber.e(e, "TabletTimeUseRangeFragment: showDeleteDialog - Error deleting useTime id=${useTime.id}")
                    CrashlyticsLog.recordException(e, "TabletTimeUseRangeFragment: Error deleting useTime id=${useTime.id}")
                }
            }
            .show()
    }

    // ───────────────────────── save / edit ──────────────────────────
    private fun handleSave(day: Int) {
        Timber.d("TabletTimeUseRangeFragment: handleSave - attempting to save new range for day $day")
        val picked = try {
            dialogBinding.getPickedRange()
        } catch (e: Exception) {
            Timber.e(e, "TabletTimeUseRangeFragment: handleSave - Error getting picked range")
            CrashlyticsLog.recordException(e, "TabletTimeUseRangeFragment: Error getting picked range in handleSave")
            null
        }
        if (picked == null) {
            Timber.e("TabletTimeUseRangeFragment: handleSave - Picked range is null, aborting save")
            return
        }
        val (from, to) = picked
        if (from.after(to)) {
            Timber.w("TabletTimeUseRangeFragment: handleSave - Invalid range: from > to")
            Toast.makeText(requireContext(), R.string.card_use_range_error, Toast.LENGTH_SHORT).show()
            return
        }
        tabletViewModel.currentTablet.value?.let {
            Timber.d("TabletTimeUseRangeFragment: handleSave - Creating time use range for tablet id=${it.id}")
            try {
                useTimeViewModel.createTimeUseRange(it, from, to, day)
                Timber.d("TabletTimeUseRangeFragment: handleSave - createTimeUseRange called successfully")
            } catch (e: Exception) {
                Timber.e(e, "TabletTimeUseRangeFragment: handleSave - Error creating time use range")
                CrashlyticsLog.recordException(e, "TabletTimeUseRangeFragment: Error creating time use range")
            }
        } ?: run {
            Timber.e("TabletTimeUseRangeFragment: handleSave - currentTablet is null, cannot create time use range")
            CrashlyticsLog.log("TabletTimeUseRangeFragment: handleSave - currentTablet is null")
        }
    }

    private fun handleEdit(useTime: UseTime) {
        Timber.d("TabletTimeUseRangeFragment: handleEdit - attempting to edit useTime id=${useTime.id}")
        val picked = try {
            dialogBinding.getPickedRange()
        } catch (e: Exception) {
            Timber.e(e, "TabletTimeUseRangeFragment: handleEdit - Error getting picked range")
            CrashlyticsLog.recordException(e, "TabletTimeUseRangeFragment: Error getting picked range in handleEdit for useTime id=${useTime.id}")
            null
        }
        if (picked == null) {
            Timber.e("TabletTimeUseRangeFragment: handleEdit - Picked range is null, aborting edit for useTime id=${useTime.id}")
            return
        }
        val (from, to) = picked
        if (from.after(to)) {
            Timber.w("TabletTimeUseRangeFragment: handleEdit - Invalid range: from > to for useTime id=${useTime.id}")
            Toast.makeText(requireContext(), R.string.card_use_range_error, Toast.LENGTH_SHORT).show()
            return
        }
        useTime.from = from
        useTime.to   = to
        Timber.d("TabletTimeUseRangeFragment: handleEdit - updating useTime id=${useTime.id} with new range")
        try {
            rangeListener.onUpdateItem(useTime)
            Timber.d("TabletTimeUseRangeFragment: handleEdit - onUpdateItem called for useTime id=${useTime.id}")
        } catch (e: Exception) {
            Timber.e(e, "TabletTimeUseRangeFragment: handleEdit - Error updating useTime id=${useTime.id}")
            CrashlyticsLog.recordException(e, "TabletTimeUseRangeFragment: Error updating useTime id=${useTime.id}")
        }
    }

    // ───────────────────────── adapter listener ─────────────────────
    inner class RangeAdapterListener {
        fun onUpdateItem(useTime: UseTime) {
            Timber.d("TabletTimeUseRangeFragment: RangeAdapterListener.onUpdateItem - updating useTime id=${useTime.id}")
            try {
                tabletViewModel.currentTablet.value?.let {
                    persistUpdate(it, useTime)
                } ?: run {
                    Timber.e("TabletTimeUseRangeFragment: RangeAdapterListener.onUpdateItem - currentTablet is null, cannot update useTime id=${useTime.id}")
                    CrashlyticsLog.log("TabletTimeUseRangeFragment: RangeAdapterListener.onUpdateItem - currentTablet is null")
                }
            } catch (e: Exception) {
                Timber.e(e, "TabletTimeUseRangeFragment: RangeAdapterListener.onUpdateItem - Error updating useTime id=${useTime.id}")
                CrashlyticsLog.recordException(e, "TabletTimeUseRangeFragment: Error updating useTime id=${useTime.id}")
            }
        }

        fun onDeleteItem(useTime: UseTime) {
            Timber.d("TabletTimeUseRangeFragment: RangeAdapterListener.onDeleteItem - deleting useTime id=${useTime.id}")
            showDeleteDialog(useTime)
        }

        fun onEditItem(useTime: UseTime) {
            Timber.d("TabletTimeUseRangeFragment: RangeAdapterListener.onEditItem - editing useTime id=${useTime.id}")
            showEditDialog(useTime)
        }
    }

    // ───────────────────────── persistence ──────────────────────────
    @RequiresApi(Build.VERSION_CODES.N)
    private fun persistUpdate(tablet: Tablet, useTime: UseTime) {
        Timber.d("TabletTimeUseRangeFragment: persistUpdate - updating useTime id=${useTime.id} for tablet id=${tablet.id}")
        try {
            useTimeViewModel.updateUseTimeRange(tablet, useTime)
            Timber.d("TabletTimeUseRangeFragment: persistUpdate - updateUseTimeRange called")
            useTimeViewModel.rangeList.value?.let { list ->
                useTimeViewModel.saveUseTimeList(list) { err ->
                    if (err != null) {
                        Timber.e("TabletTimeUseRangeFragment: persistUpdate - Error saving use time list: $err")
                        CrashlyticsLog.log("TabletTimeUseRangeFragment: persistUpdate - Error saving use time list: $err")
                        Toast.makeText(context, R.string.error_connection, Toast.LENGTH_SHORT).show()
                    } else {
                        Timber.d("TabletTimeUseRangeFragment: persistUpdate - use time list saved successfully")
                    }
                }
            } ?: run {
                Timber.e("TabletTimeUseRangeFragment: persistUpdate - rangeList is null, cannot save use time list")
                CrashlyticsLog.log("TabletTimeUseRangeFragment: persistUpdate - rangeList is null")
            }
        } catch (e: Exception) {
            Timber.e(e, "TabletTimeUseRangeFragment: persistUpdate - Error updating/saving useTime id=${useTime.id}")
            CrashlyticsLog.recordException(e, "TabletTimeUseRangeFragment: Error updating/saving useTime id=${useTime.id}")
        }
    }

    // ───────────────────────── UI helpers ───────────────────────────
    private fun tintButtons(btns: Array<MaterialButton>, selected: Int) {
        Timber.d("TabletTimeUseRangeFragment: tintButtons - tinting day buttons, selected=$selected")
        btns.forEachIndexed { idx, b ->
            val color = if (idx == selected) R.color.colorSecondary else R.color.grey_400
            b.backgroundTintList =
                ContextCompat.getColorStateList(requireContext(), color)
        }
    }

    private fun DialogTabletTimeUseRangeBinding.dayButtons(): Array<MaterialButton> = arrayOf(
        buttonMonday, buttonTuesday, buttonWednesday, buttonThursday,
        buttonFriday, buttonSaturday, buttonSunday
    )

    private fun DialogTabletTimeUseRangeBinding.transparentDialog(): Dialog =
        Dialog(requireContext()).apply {
            setContentView(root)
            window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        }

    /** Initialise pickers for a new range (all zeros). */
    private fun DialogTabletTimeUseRangeBinding.setPickersForNew() {
        Timber.d("TabletTimeUseRangeFragment: setPickersForNew - initializing pickers to zero")
        fromHoursPicker.minValue = 0; fromHoursPicker.maxValue = 23; fromHoursPicker.value = 0
        toHoursPicker.minValue   = 0; toHoursPicker.maxValue   = 23; toHoursPicker.value   = 0
        fromMinutesPicker.minValue = 0; fromMinutesPicker.maxValue = 59; fromMinutesPicker.value = 0
        toMinutesPicker.minValue   = 0; toMinutesPicker.maxValue   = 59; toMinutesPicker.value   = 0
    }

    /** Set pickers using an existing [useTime] range. */
    private fun DialogTabletTimeUseRangeBinding.setPickersFromUseTime(useTime: UseTime) {
        Timber.d("TabletTimeUseRangeFragment: setPickersFromUseTime - setting pickers from useTime id=${useTime.id}, from: ${useTime.from}, to: ${useTime.to}")
        
        // Extract hours and minutes directly from Date using Calendar to avoid locale-specific formatting issues
        val calFrom = Calendar.getInstance().apply { time = useTime.from }
        val calTo = Calendar.getInstance().apply { time = useTime.to }
        
        val fromHours = calFrom.get(Calendar.HOUR_OF_DAY)
        val fromMinutes = calFrom.get(Calendar.MINUTE)
        val toHours = calTo.get(Calendar.HOUR_OF_DAY)
        val toMinutes = calTo.get(Calendar.MINUTE)
        
        Timber.d("TabletTimeUseRangeFragment: setPickersFromUseTime - parsed from hours=$fromHours, minutes=$fromMinutes; to hours=$toHours, minutes=$toMinutes")

        fromHoursPicker.minValue = 0; fromHoursPicker.maxValue = 23; fromHoursPicker.value = fromHours
        fromMinutesPicker.minValue = 0; fromMinutesPicker.maxValue = 59; fromMinutesPicker.value = fromMinutes
        toHoursPicker.minValue   = 0; toHoursPicker.maxValue   = 23; toHoursPicker.value   = toHours
        toMinutesPicker.minValue = 0; toMinutesPicker.maxValue = 59; toMinutesPicker.value = toMinutes
    }

    /** Returns a pair of Date(from, to) based on current pickers—null on error. */
    private fun DialogTabletTimeUseRangeBinding.getPickedRange(): Pair<java.util.Date, java.util.Date>? {
        Timber.d("TabletTimeUseRangeFragment: getPickedRange - getting picked range from pickers")
        return try {
            val calFrom = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, fromHoursPicker.value)
                set(Calendar.MINUTE, fromMinutesPicker.value)
            }
            val calTo = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, toHoursPicker.value)
                set(Calendar.MINUTE, toMinutesPicker.value)
            }
            Timber.d("TabletTimeUseRangeFragment: getPickedRange - picked from=${calFrom.time}, to=${calTo.time}")
            calFrom.time to calTo.time
        } catch (e: Exception) {
            Timber.e(e, "TabletTimeUseRangeFragment: getPickedRange - Error getting picked range")
            CrashlyticsLog.recordException(e, "TabletTimeUseRangeFragment: Error getting picked range")
            null
        }
    }
}