package com.sosmartlabs.momo.watchlock.ui

import android.app.Dialog
import android.graphics.Color
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentManager
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.button.MaterialButton
import com.parse.ParseObject
import com.sosmartlabs.momo.R
import com.wdullaer.materialdatetimepicker.time.TimePickerDialog
import timber.log.Timber
import java.text.DateFormatSymbols
import java.util.Calendar
import java.util.Locale

/**
 * Edit/create a SilenceTime schedule. Mirrors the iOS bottom-sheet flow:
 * single shared time picker invoked from two pills (Start / End), an
 * optional Name field, and an ISO 1..7 weekday chip group. Name and days
 * are only shown for Space 3 / Space 4 watches; older watches see a
 * time-only form to match legacy behavior.
 */
class EditSilenceTimeBottomSheet : BottomSheetDialogFragment() {

    interface Listener {
        fun onScheduleSaved(schedule: ParseObject, isNew: Boolean)
    }

    private var listener: Listener? = null
    private var workingSchedule: ParseObject? = null
    private var supportsPerDaySchedules: Boolean = false
    private var isNew: Boolean = false

    private var startHour: Int = 0
    private var startMinute: Int = 0
    private var endHour: Int = 0
    private var endMinute: Int = 0
    private var selectedDays: MutableSet<Int> = mutableSetOf<Int>().apply { addAll(1..7) }

    private lateinit var pillStart: FrameLayout
    private lateinit var pillEnd: FrameLayout
    private lateinit var labelStart: TextView
    private lateinit var labelEnd: TextView
    private lateinit var textStart: TextView
    private lateinit var textEnd: TextView
    private lateinit var textEndNextDay: TextView
    private lateinit var textStartNextDay: TextView
    private lateinit var inputName: EditText
    private lateinit var groupName: View
    private lateinit var groupDays: View
    private lateinit var daysRow: LinearLayout
    private lateinit var textDaysStatus: TextView
    private lateinit var buttonSave: MaterialButton
    private lateinit var buttonBack: ImageButton
    private lateinit var textTitle: TextView

    fun configure(schedule: ParseObject?, supportsPerDaySchedules: Boolean, listener: Listener) {
        this.workingSchedule = schedule
        this.isNew = schedule == null || schedule.objectId == null
        this.supportsPerDaySchedules = supportsPerDaySchedules
        this.listener = listener
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val dialog = super.onCreateDialog(savedInstanceState) as BottomSheetDialog
        dialog.behavior.skipCollapsed = true
        dialog.behavior.state = BottomSheetBehavior.STATE_EXPANDED
        // Resize when the keyboard opens so the Save button stays reachable.
        dialog.window?.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        return dialog
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.bottom_sheet_edit_silence_time, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindViews(view)
        applyVisibilityForCapability()
        loadInitialState()
        wireListeners()
        renderPills()
        renderDaysStatus()
        updateSaveButtonState()
    }

    private fun bindViews(view: View) {
        pillStart = view.findViewById(R.id.pill_start)
        pillEnd = view.findViewById(R.id.pill_end)
        labelStart = view.findViewById(R.id.label_start)
        labelEnd = view.findViewById(R.id.label_end)
        textStart = view.findViewById(R.id.text_start_time)
        textEnd = view.findViewById(R.id.text_end_time)
        textEndNextDay = view.findViewById(R.id.text_end_next_day)
        textStartNextDay = view.findViewById(R.id.text_start_next_day)
        inputName = view.findViewById(R.id.input_name)
        groupName = view.findViewById(R.id.group_name)
        groupDays = view.findViewById(R.id.group_days)
        daysRow = view.findViewById(R.id.days_row)
        textDaysStatus = view.findViewById(R.id.text_days_status)
        buttonSave = view.findViewById(R.id.button_save)
        buttonBack = view.findViewById(R.id.button_back)
        textTitle = view.findViewById(R.id.text_title)
    }

    private fun applyVisibilityForCapability() {
        groupName.visibility = if (supportsPerDaySchedules) View.VISIBLE else View.GONE
        groupDays.visibility = if (supportsPerDaySchedules) View.VISIBLE else View.GONE
        textTitle.text = getString(if (isNew) R.string.silence_time_create_title else R.string.silence_time_edit_title)
    }

    private fun loadInitialState() {
        val now = Calendar.getInstance()
        val schedule = workingSchedule

        if (schedule != null) {
            parseTime(schedule.getString("startTime"))?.let { (h, m) -> startHour = h; startMinute = m }
            parseTime(schedule.getString("endTime"))?.let { (h, m) -> endHour = h; endMinute = m }
            inputName.setText(schedule.getString("name") ?: "")
            val days = schedule.getList<Int>("daysOfWeek")?.toSet()
            selectedDays = if (days.isNullOrEmpty()) mutableSetOf<Int>().apply { addAll(1..7) }
                           else days.toMutableSet()
        } else {
            startHour = now.get(Calendar.HOUR_OF_DAY)
            startMinute = now.get(Calendar.MINUTE)
            endHour = (startHour + 1) % 24
            endMinute = startMinute
            selectedDays = mutableSetOf<Int>().apply { addAll(1..7) }
        }

        buildDayToggles()
    }

    private fun parseTime(value: String?): Pair<Int, Int>? {
        if (value.isNullOrBlank()) return null
        val parts = value.split(":")
        if (parts.size < 2) return null
        val h = parts[0].toIntOrNull() ?: return null
        val m = parts[1].toIntOrNull() ?: return null
        if (h !in 0..23 || m !in 0..59) return null
        return h to m
    }

    /**
     * Builds an evenly-distributed row of 7 circular day toggles (Mon..Sun). Each
     * toggle sits in an equal-weight cell so the row spans the full width and lines
     * up with the fields above/below; the whole cell is the tap target.
     */
    private fun buildDayToggles() {
        daysRow.removeAllViews()
        val symbols = DateFormatSymbols.getInstance(Locale.getDefault()).shortWeekdays
        val context = requireContext()
        val toggleSize = dpF(40f).toInt()

        for (isoDay in orderedIsoDays()) {
            val toggle = TextView(context).apply {
                layoutParams = FrameLayout.LayoutParams(toggleSize, toggleSize).apply {
                    gravity = Gravity.CENTER
                }
                gravity = Gravity.CENTER
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                text = label(isoDay, symbols)
                applyDayToggleStyle(this, selectedDays.contains(isoDay))
            }
            val cell = FrameLayout(context).apply {
                layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
                isClickable = true
                isFocusable = true
                setOnClickListener {
                    val selected = !selectedDays.contains(isoDay)
                    if (selected) selectedDays.add(isoDay) else selectedDays.remove(isoDay)
                    applyDayToggleStyle(toggle, selected)
                    renderDaysStatus()
                    updateSaveButtonState()
                }
                addView(toggle)
            }
            daysRow.addView(cell)
        }
    }

    private fun applyDayToggleStyle(view: TextView, selected: Boolean) {
        view.setBackgroundResource(
            if (selected) R.drawable.bg_day_toggle_selected else R.drawable.bg_day_toggle_unselected
        )
        view.setTextColor(
            if (selected) Color.WHITE else ContextCompat.getColor(requireContext(), R.color.colorPrimary)
        )
    }

    /// Always starts the week on Monday (ISO 1) regardless of locale, so the
    /// chip order matches the canonical data model and the iOS app.
    private fun orderedIsoDays(): List<Int> = (1..7).toList()

    private fun label(isoDay: Int, symbols: Array<String>): String {
        // shortWeekdays is indexed 1..7 with 1=Sun. Map ISO to that index.
        val calIndex = if (isoDay == 7) Calendar.SUNDAY else isoDay + 1
        return symbols.getOrNull(calIndex)?.take(1)?.uppercase(Locale.getDefault()) ?: isoDay.toString()
    }

    private fun wireListeners() {
        buttonBack.setOnClickListener { dismiss() }
        pillStart.setOnClickListener { openTimePicker(forStart = true) }
        pillEnd.setOnClickListener { openTimePicker(forStart = false) }
        buttonSave.setOnClickListener { onSaveClicked() }
    }

    private fun openTimePicker(forStart: Boolean) {
        val initialHour = if (forStart) startHour else endHour
        val initialMinute = if (forStart) startMinute else endMinute

        val dialog = TimePickerDialog.newInstance(
            { _, hour, minute, _ ->
                if (forStart) { startHour = hour; startMinute = minute }
                else { endHour = hour; endMinute = minute }
                renderPills()
                updateSaveButtonState()
            },
            initialHour, initialMinute, true
        )
        dialog.title = getString(if (forStart) R.string.time_picker_start_title else R.string.time_picker_end_title)
        dialog.show(parentFragmentManager, if (forStart) "timePickerStart" else "timePickerEnd")
    }

    private fun renderPills() {
        textStart.text = format(startHour, startMinute)
        textEnd.text = format(endHour, endMinute)
        // End earlier than start means the schedule wraps past midnight
        // (e.g. 22:00 -> 07:00); flag it so the range isn't read as a mistake.
        val overnight = (endHour * 60 + endMinute) < (startHour * 60 + startMinute)
        textEndNextDay.visibility = if (overnight) View.VISIBLE else View.GONE
        // Reserve the same line height in the start pill (invisible) so both
        // pills stay equal height when the end shows "next day".
        textStartNextDay.visibility = if (overnight) View.INVISIBLE else View.GONE
    }

    private fun renderDaysStatus() {
        textDaysStatus.text = when {
            selectedDays.isEmpty() -> getString(R.string.silence_time_select_days)
            selectedDays.size == 7 -> getString(R.string.silence_time_every_day)
            else -> ""
        }
    }

    private fun format(h: Int, m: Int): String = "%02d:%02d".format(h, m)

    private fun dpF(value: Float): Float = value * resources.displayMetrics.density

    /**
     * Keep the Save button disabled until the schedule is valid: start and end
     * must differ, and (on per-day watches) at least one weekday must be selected.
     * Replaces the previous silent no-op on tap with a visible affordance — the
     * "select days" hint under the chips explains the day requirement.
     */
    private fun updateSaveButtonState() {
        val valid = hasTimeRange() && (!supportsPerDaySchedules || selectedDays.isNotEmpty())
        buttonSave.isEnabled = valid
        buttonSave.alpha = if (valid) 1f else 0.5f
    }

    private fun onSaveClicked() {
        if (!hasTimeRange()) return
        if (supportsPerDaySchedules && selectedDays.isEmpty()) return

        val schedule = workingSchedule ?: ParseObject.create("SilenceTime")
        schedule.put("startTime", format(startHour, startMinute))
        schedule.put("endTime", format(endHour, endMinute))
        if (isNew) schedule.put("active", true)

        if (supportsPerDaySchedules) {
            // All 7 selected = "every day" → leave column unset for legacy parity.
            if (selectedDays.size == 7) schedule.remove("daysOfWeek")
            else schedule.put("daysOfWeek", selectedDays.sorted())

            val name = inputName.text?.toString()?.trim().orEmpty()
            if (name.isEmpty()) schedule.remove("name") else schedule.put("name", name)
        } else {
            schedule.remove("daysOfWeek")
            schedule.remove("name")
        }

        Timber.d("EditSilenceTimeBottomSheet: saving schedule new=$isNew days=$selectedDays")
        listener?.onScheduleSaved(schedule, isNew)
        dismiss()
    }

    private fun hasTimeRange(): Boolean = startHour != endHour || startMinute != endMinute

    companion object {
        private const val TAG = "EditSilenceTimeBottomSheet"

        fun show(
            fragmentManager: FragmentManager,
            schedule: ParseObject?,
            supportsPerDaySchedules: Boolean,
            listener: Listener,
        ) {
            val sheet = EditSilenceTimeBottomSheet()
            sheet.configure(schedule, supportsPerDaySchedules, listener)
            sheet.show(fragmentManager, TAG)
        }
    }
}
