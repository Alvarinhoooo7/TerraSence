package com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.limit

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
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.model.UseTime
import com.sosmartlabs.momotabletpadres.databinding.DialogTimeUseLimitBinding
import com.sosmartlabs.momotabletpadres.databinding.TabletFragmentTimeUseLimitBinding
import com.sosmartlabs.momotabletpadres.tabletsettings.interfaces.TableListState
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.UseTimeViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

/**
 * Displays and manages “Use-time limit per day” rules.
 */
@AndroidEntryPoint
class UseTimeLimitFragment : Fragment() {

    // ───────────────────────── view-binding ─────────────────────────
    private var _binding: TabletFragmentTimeUseLimitBinding? = null
    private val binding get() = _binding!!

    // ───────────────────────── view-models ──────────────────────────
    private val tabletViewModel: TabletViewModel by activityViewModels()
    private val useTimeViewModel: UseTimeViewModel by viewModels()

    // ───────────────────────── adapter & listener ────────────────────
    private lateinit var limitAdapter: UseTimeLimitAdapter
    private lateinit var limitListener: LimitAdapterListener

    // ────────────────────────── lifecycle ────────────────────────────
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("TabletTimeUseLimitFragment: onCreateView - Inflating layout")
        _binding = TabletFragmentTimeUseLimitBinding.inflate(inflater, container, false)
        setupToolbar()
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("TabletTimeUseLimitFragment: onViewCreated - Initializing fragment UI")

        useTimeViewModel.tableListState.value = TableListState.Loading

        limitListener = LimitAdapterListener()
        limitAdapter  = UseTimeLimitAdapter(limitListener)

        binding.addButton.setOnClickListener { 
            Timber.d("TabletTimeUseLimitFragment: Add button clicked - Showing create dialog")
            showCreateDialog() 
        }

        binding.recyclerView.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = limitAdapter
            val dividerItemDecoration = DividerItemDecoration(
                context,
                (layoutManager as LinearLayoutManager).orientation
            )
            addItemDecoration(dividerItemDecoration)
        }

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView
        )

        observeViewModels()
    }

    override fun onResume() {
        super.onResume()
        Timber.d("TabletTimeUseLimitFragment: onResume - Reloading use hours for current tablet")
        tabletViewModel.currentTablet.value?.let {
            Timber.d("TabletTimeUseLimitFragment: onResume - Current tablet: $it")
            useTimeViewModel.loadUseHours(it)
        } ?: Timber.w("TabletTimeUseLimitFragment: onResume - No current tablet found")
    }

    override fun onDestroyView() {
        Timber.d("TabletTimeUseLimitFragment: onDestroyView - Cleaning up binding")
        super.onDestroyView()
        _binding = null
    }

    private fun setupToolbar() {
        Timber.d("TabletTimeUseLimitFragment: setupToolbar - Setting up toolbar")
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

    // ───────────────────────── observers ────────────────────────────
    private fun observeViewModels() {
        Timber.d("TabletTimeUseLimitFragment: observeViewModels - Setting up observers")
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("TabletTimeUseLimitFragment: observeViewModels - Tablet changed: $tablet")
            useTimeViewModel.loadUseHours(tablet)
        }

        useTimeViewModel.limitList.observe(viewLifecycleOwner) { list ->
            Timber.d("TabletTimeUseLimitFragment: observeViewModels - limitList changed, sorting and updating adapter")
            useTimeViewModel.sortList()
            val limits = list.filterNot { it.isRange == true }
            binding.recyclerView.visibility =
                if (limits.isEmpty()) View.GONE else View.VISIBLE
            limitAdapter.submitList(limits)
            Timber.d("TabletTimeUseLimitFragment: observeViewModels - Submitted ${limits.size} limits to adapter")
        }

        useTimeViewModel.tableListState.observe(viewLifecycleOwner) { state ->
            Timber.d("TabletTimeUseLimitFragment: observeViewModels - tableListState=$state")
        }
    }

    // ───────────────────── dialogs & helpers ────────────────────────
    private fun showCreateDialog() {
        Timber.d("TabletTimeUseLimitFragment: showCreateDialog - Showing dialog to create new limit")
        val db = DialogTimeUseLimitBinding.inflate(layoutInflater)
        val dialog = Dialog(requireContext()).apply {
            setContentView(db.root)
            window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        }

        var daySelected = 0
        val dayButtons = db.dayButtons()

        db.apply {
            setButtonsColors(dayButtons, daySelected)
            dayButtons.forEachIndexed { idx, btn ->
                btn.setOnClickListener {
                    Timber.d("TabletTimeUseLimitFragment: showCreateDialog - Day button $idx selected")
                    daySelected = idx
                    setButtonsColors(dayButtons, daySelected)
                }
            }

            hoursPicker.minValue = 0
            hoursPicker.maxValue = 23
            hoursPicker.value    = 0

            minutesPicker.minValue = 0
            minutesPicker.maxValue = 59
            minutesPicker.value    = 0

            buttonCancel.setOnClickListener { 
                Timber.d("TabletTimeUseLimitFragment: showCreateDialog - Cancel button clicked, dismissing dialog")
                dialog.dismiss() 
            }

            buttonSave.setOnClickListener {
                val limit = hoursPicker.value * 3600 + minutesPicker.value * 60
                Timber.d("TabletTimeUseLimitFragment: showCreateDialog - Save button clicked, limit=$limit, daySelected=$daySelected")
                try {
                    saveNewOrUpdateLimit(limit, daySelected)
                } catch (e: Exception) {
                    Timber.e(e, "TabletTimeUseLimitFragment: showCreateDialog - Error saving new or updating limit")
                    CrashlyticsLog.recordException(e, "TabletTimeUseLimitFragment: Error in showCreateDialog/saveNewOrUpdateLimit")
                    Toast.makeText(requireContext(), R.string.error_loading_data, Toast.LENGTH_SHORT).show()
                }
                dialog.dismiss()
            }
        }

        dialog.show()
        Timber.d("TabletTimeUseLimitFragment: showCreateDialog - Dialog shown")
    }

    private fun showEditDialog(useTime: UseTime) {
        Timber.d("TabletTimeUseLimitFragment: showEditDialog - Editing useTime: $useTime")
        val db = DialogTimeUseLimitBinding.inflate(layoutInflater)
        val dialog = Dialog(requireContext()).apply {
            setContentView(db.root)
            window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        }

        var daySelected = useTime.days.indexOfFirst { it == 1 }
        val dayButtons  = db.dayButtons()

        db.apply {
            setButtonsColors(dayButtons, daySelected)

            val hours   = useTime.limit?.div(3600) ?: 0
            val minutes = useTime.limit?.rem(3600)?.div(60) ?: 0

            hoursPicker.minValue = 0
            hoursPicker.maxValue = 23
            hoursPicker.value    = hours

            minutesPicker.minValue = 0
            minutesPicker.maxValue = 59
            minutesPicker.value    = minutes

            dayButtons.forEachIndexed { idx, btn ->
                btn.setOnClickListener {
                    Timber.d("TabletTimeUseLimitFragment: showEditDialog - Day button $idx selected")
                    daySelected = idx
                    setButtonsColors(dayButtons, daySelected)
                }
            }

            buttonCancel.apply {
                text = getString(R.string.settings_button_delete)
                setOnClickListener {
                    Timber.d("TabletTimeUseLimitFragment: showEditDialog - Delete button clicked, showing delete dialog")
                    showDeleteDialog(useTime)
                    dialog.dismiss()
                }
            }

            buttonSave.setOnClickListener {
                val newLimit = hoursPicker.value * 3600 + minutesPicker.value * 60
                Timber.d("TabletTimeUseLimitFragment: showEditDialog - Save button clicked, newLimit=$newLimit")
                try {
                    updateExistingLimit(useTime, newLimit)
                } catch (e: Exception) {
                    Timber.e(e, "TabletTimeUseLimitFragment: showEditDialog - Error updating existing limit")
                    CrashlyticsLog.recordException(e, "TabletTimeUseLimitFragment: Error in showEditDialog/updateExistingLimit")
                    Toast.makeText(requireContext(), R.string.error_loading_data, Toast.LENGTH_SHORT).show()
                }
                dialog.dismiss()
            }
        }

        dialog.show()
        Timber.d("TabletTimeUseLimitFragment: showEditDialog - Dialog shown")
    }

    private fun showDeleteDialog(useTime: UseTime) {
        Timber.d("TabletTimeUseLimitFragment: showDeleteDialog - Showing delete confirmation for useTime: $useTime")
        AlertDialog.Builder(requireContext())
            .setTitle(R.string.use_time_delete_title)
            .setMessage(R.string.use_time_delete_description)
            .setPositiveButton(R.string.use_time_confirm_delete) { _, _ ->
                Timber.d("TabletTimeUseLimitFragment: showDeleteDialog - Confirmed delete for useTime: $useTime")
                try {
                    tabletViewModel.currentTablet.value?.let {
                        useTimeViewModel.deleteUseTimeLimit(it, useTime)
                        Timber.d("TabletTimeUseLimitFragment: showDeleteDialog - Deleted useTime: $useTime for tablet: $it")
                    } ?: run {
                        Timber.e("TabletTimeUseLimitFragment: showDeleteDialog - No current tablet found for delete")
                        Toast.makeText(requireContext(), R.string.error_loading_data, Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    Timber.e(e, "TabletTimeUseLimitFragment: showDeleteDialog - Error deleting useTime: $useTime")
                    CrashlyticsLog.recordException(e, "TabletTimeUseLimitFragment: Error in showDeleteDialog/deleteUseTimeLimit")
                    Toast.makeText(requireContext(), R.string.error_loading_data, Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    @RequiresApi(Build.VERSION_CODES.N)
    private fun persistUpdate(tablet: Tablet, useTime: UseTime) {
        Timber.d("TabletTimeUseLimitFragment: persistUpdate - Updating useTime: $useTime for tablet: $tablet")
        useTimeViewModel.updateUseTimeLimit(tablet, useTime)
        useTimeViewModel.limitList.value?.let { list ->
            useTimeViewModel.saveUseTimeList(list) { error ->
                if (error != null) {
                    Timber.e("TabletTimeUseLimitFragment: persistUpdate - Error saving use time list: $error")
                    CrashlyticsLog.log("TabletTimeUseLimitFragment: persistUpdate - Error saving use time list: $error")
                    Toast.makeText(context, R.string.error_connection, Toast.LENGTH_SHORT).show()
                } else {
                    Timber.d("TabletTimeUseLimitFragment: persistUpdate - Successfully saved use time list")
                }
            }
        } ?: Timber.w("TabletTimeUseLimitFragment: persistUpdate - limitList is null, nothing to save")
    }

    // ───────────────────────── adapter listener ─────────────────────
    inner class LimitAdapterListener {
        fun onUpdateItem(useTime: UseTime) {
            Timber.d("TabletTimeUseLimitFragment: LimitAdapterListener.onUpdateItem - useTime: $useTime")
            try {
                tabletViewModel.currentTablet.value?.let { persistUpdate(it, useTime) }
                    ?: Timber.e("TabletTimeUseLimitFragment: LimitAdapterListener.onUpdateItem - No current tablet found")
            } catch (e: Exception) {
                Timber.e(e, "TabletTimeUseLimitFragment: LimitAdapterListener.onUpdateItem - Error updating item")
                CrashlyticsLog.recordException(e, "TabletTimeUseLimitFragment: Error in LimitAdapterListener.onUpdateItem")
            }
        }

        fun onDeleteItem(useTime: UseTime) {
            Timber.d("TabletTimeUseLimitFragment: LimitAdapterListener.onDeleteItem - useTime: $useTime")
            showDeleteDialog(useTime)
        }

        fun onEditItem(useTime: UseTime) {
            Timber.d("TabletTimeUseLimitFragment: LimitAdapterListener.onEditItem - useTime: $useTime")
            showEditDialog(useTime)
        }
    }

    // ─────────────────────── utilities ──────────────────────────────
    private fun setButtonsColors(btns: Array<MaterialButton>, selected: Int) {
        Timber.d("TabletTimeUseLimitFragment: setButtonsColors - Setting colors, selected=$selected")
        btns.forEachIndexed { idx, b ->
            val color = if (idx == selected) R.color.colorSecondary else R.color.grey_400
            b.backgroundTintList =
                ContextCompat.getColorStateList(requireContext(), color)
        }
    }

    private fun DialogTimeUseLimitBinding.dayButtons(): Array<MaterialButton> = arrayOf(
        buttonMonday, buttonTuesday, buttonWednesday, buttonThursday,
        buttonFriday, buttonSaturday, buttonSunday
    )

    private fun saveNewOrUpdateLimit(limit: Int, day: Int) {
        Timber.d("TabletTimeUseLimitFragment: saveNewOrUpdateLimit - limit=$limit, day=$day")
        var updated = false
        useTimeViewModel.limitList.value?.forEachIndexed { pos, ut ->
            if (ut.days[day] == 1 && ut.isRange != true) {
                Timber.d("TabletTimeUseLimitFragment: saveNewOrUpdateLimit - Updating existing limit at pos=$pos for day=$day")
                ut.limit = limit
                limitAdapter.notifyItemChanged(pos)
                try {
                    limitListener.onUpdateItem(ut)
                } catch (e: Exception) {
                    Timber.e(e, "TabletTimeUseLimitFragment: saveNewOrUpdateLimit - Error updating item at pos=$pos")
                    CrashlyticsLog.recordException(e, "TabletTimeUseLimitFragment: Error in saveNewOrUpdateLimit/onUpdateItem")
                }
                updated = true
                return@forEachIndexed
            }
        }
        if (!updated) {
            Timber.d("TabletTimeUseLimitFragment: saveNewOrUpdateLimit - No existing limit found, creating new")
            try {
                tabletViewModel.currentTablet.value?.let {
                    useTimeViewModel.createTimeUseLimit(it, limit, day)
                    Timber.d("TabletTimeUseLimitFragment: saveNewOrUpdateLimit - Created new limit for tablet: $it, day: $day, limit: $limit")
                } ?: run {
                    Timber.e("TabletTimeUseLimitFragment: saveNewOrUpdateLimit - No current tablet found, cannot create new limit")
                    Toast.makeText(
                        requireContext(), R.string.error_loading_data, Toast.LENGTH_SHORT
                    ).show()
                }
            } catch (e: Exception) {
                Timber.e(e, "TabletTimeUseLimitFragment: saveNewOrUpdateLimit - Error creating new limit")
                CrashlyticsLog.recordException(e, "TabletTimeUseLimitFragment: Error in saveNewOrUpdateLimit/createTimeUseLimit")
                Toast.makeText(requireContext(), R.string.error_loading_data, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updateExistingLimit(useTime: UseTime, newLimit: Int) {
        Timber.d("TabletTimeUseLimitFragment: updateExistingLimit - Updating useTime: $useTime with newLimit: $newLimit")
        useTime.limit = newLimit
        try {
            limitListener.onUpdateItem(useTime)
            limitAdapter.notifyDataSetChanged()
            Timber.d("TabletTimeUseLimitFragment: updateExistingLimit - Update successful")
        } catch (e: Exception) {
            Timber.e(e, "TabletTimeUseLimitFragment: updateExistingLimit - Error updating existing limit")
            CrashlyticsLog.recordException(e, "TabletTimeUseLimitFragment: Error in updateExistingLimit")
            Toast.makeText(requireContext(), R.string.error_loading_data, Toast.LENGTH_SHORT).show()
        }
    }
}