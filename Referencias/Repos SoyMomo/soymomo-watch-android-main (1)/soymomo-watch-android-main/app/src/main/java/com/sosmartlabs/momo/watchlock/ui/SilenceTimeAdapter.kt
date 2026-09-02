package com.sosmartlabs.momo.watchlock.ui

import android.content.Context
import android.graphics.Color
import android.util.TypedValue
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CompoundButton
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.widget.SwitchCompat
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.parse.ParseException
import com.parse.ParseObject
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.firebase.CrashlyticsLog.recordNonFatalError
import com.sosmartlabs.momo.watchlock.ui.SilenceTimeAdapter.SilenceTimeViewHolder
import java.text.DateFormatSymbols
import java.util.Calendar
import java.util.Locale

/**
 * Renders a list of SilenceTime ParseObjects.
 *
 * - Tapping a row opens the EditSilenceTimeBottomSheet (handled by the
 *   onRowClick callback) — there is no longer any inline time editing.
 * - Toggling the switch flips the active flag and persists in onPause.
 * - The optional [supportsPerDaySchedules] flag controls whether the
 *   schedule name and the M/T/W/T/F/S/S strip are rendered. Older watches
 *   keep the legacy time-only look.
 *
 * Deletion is handled externally via ItemTouchHelper plus a confirmation
 * dialog; this adapter just exposes [removeAt] for that flow.
 */
class SilenceTimeAdapter(
    private var mTimes: MutableList<ParseObject>,
    private val mContext: Context,
    supportsPerDaySchedules: Boolean = false,
    private val onRowClick: (ParseObject) -> Unit = {}
) : RecyclerView.Adapter<SilenceTimeViewHolder>() {

    /**
     * Whether to render the schedule name + weekday strip (Space 3/4). The host
     * flips this once the watch capability resolves; assigning a new value
     * re-renders the rows in place rather than rebuilding the whole adapter.
     */
    var supportsPerDaySchedules: Boolean = supportsPerDaySchedules
        set(value) {
            if (field == value) return
            field = value
            notifyDataSetChanged()
        }

    private val orderedIsoDays: List<Int> = orderedIsoDaysForLocale()
    private val veryShortWeekdaySymbols: Array<String> = DateFormatSymbols
        .getInstance(Locale.getDefault())
        .shortWeekdays
    private val fullWeekdaySymbols: Array<String> = DateFormatSymbols
        .getInstance(Locale.getDefault())
        .weekdays
    private val inactiveContentAlpha = 0.45f

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): SilenceTimeViewHolder {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_silence_time, parent, false)
        return SilenceTimeViewHolder(v)
    }

    override fun onBindViewHolder(holder: SilenceTimeViewHolder, position: Int) {
        val silenceTime = mTimes[position]

        val isActive = silenceTime.getBoolean("active")
        holder.vActive.setOnCheckedChangeListener(null)
        holder.vActive.isChecked = isActive
        applyActiveState(holder, isActive)
        holder.vActive.setOnCheckedChangeListener { _: CompoundButton?, isChecked: Boolean ->
            // Persist immediately so toggling the switch isn't deferred to onPause —
            // users expect the change to round-trip to the watch right away.
            if (silenceTime.getBoolean("active") == isChecked) return@setOnCheckedChangeListener
            silenceTime.put("active", isChecked)
            applyActiveState(holder, isChecked)
            silenceTime.saveInBackground { e: ParseException? ->
                if (e != null) recordNonFatalError(e, "Error saving silence time active toggle")
            }
        }

        holder.vStartTime.text = silenceTime.getString("startTime") ?: ""
        holder.vEndTime.text = silenceTime.getString("endTime") ?: ""
        // Flag overnight ranges (end before start) so the row matches the editor.
        holder.vNextDay.visibility = if (
            isOvernight(silenceTime.getString("startTime"), silenceTime.getString("endTime"))
        ) View.VISIBLE else View.GONE

        bindNameAndDays(holder, silenceTime)

        // TalkBack: give the switch a meaningful label (it already announces on/off).
        holder.vActive.contentDescription = silenceTime.getString("name")?.trim()?.takeIf { it.isNotEmpty() }
            ?: "${silenceTime.getString("startTime").orEmpty()} ${silenceTime.getString("endTime").orEmpty()}".trim()

        holder.itemView.setOnClickListener { onRowClick(silenceTime) }
    }

    private fun bindNameAndDays(holder: SilenceTimeViewHolder, silenceTime: ParseObject) {
        if (!supportsPerDaySchedules) {
            holder.vName.visibility = View.GONE
            holder.vDayStrip.visibility = View.GONE
            holder.vEveryDay.visibility = View.GONE
            return
        }

        val name = silenceTime.getString("name")?.trim().orEmpty()
        if (name.isEmpty()) {
            holder.vName.visibility = View.GONE
        } else {
            holder.vName.text = name
            holder.vName.visibility = View.VISIBLE
        }

        val daysList = silenceTime.getList<Int>("daysOfWeek")
        val activeDays: Set<Int> = if (daysList.isNullOrEmpty()) (1..7).toSet() else daysList.toSet()
        if (activeDays.size == 7) {
            // Every day → a compact label reads cleaner than seven filled circles.
            holder.vEveryDay.visibility = View.VISIBLE
            holder.vDayStrip.visibility = View.GONE
        } else {
            renderDayStrip(holder.vDayStrip, activeDays)
            holder.vDayStrip.contentDescription = daysContentDescription(activeDays)
            holder.vDayStrip.visibility = View.VISIBLE
            holder.vEveryDay.visibility = View.GONE
        }
    }

    private fun renderDayStrip(container: LinearLayout, activeDays: Set<Int>) {
        container.removeAllViews()
        val dpScale = container.resources.displayMetrics.density
        val sizePx = (20 * dpScale).toInt()
        val gapPx = (4 * dpScale).toInt()
        val purple = ContextCompat.getColor(mContext, R.color.colorPrimary)

        orderedIsoDays.forEachIndexed { index, isoDay ->
            val active = activeDays.contains(isoDay)
            val tv = TextView(mContext).apply {
                layoutParams = LinearLayout.LayoutParams(sizePx, sizePx).apply {
                    if (index > 0) marginStart = gapPx
                }
                gravity = Gravity.CENTER
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
                text = letterFor(isoDay)
                setTextColor(if (active) Color.WHITE else purple)
                background = ContextCompat.getDrawable(
                    mContext,
                    if (active) R.drawable.bg_day_toggle_selected else R.drawable.bg_day_toggle_unselected
                )
                // The container carries the spoken day summary; skip the single letters.
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
            }
            container.addView(tv)
        }
    }

    /** Inactive schedules are dimmed so active vs paused is scannable at a glance. */
    private fun applyActiveState(holder: SilenceTimeViewHolder, active: Boolean) {
        holder.vContent.alpha = if (active) 1f else inactiveContentAlpha
    }

    private fun daysContentDescription(activeDays: Set<Int>): String {
        return orderedIsoDays
            .filter { activeDays.contains(it) }
            .mapNotNull { iso ->
                val calIndex = if (iso == 7) Calendar.SUNDAY else iso + 1
                fullWeekdaySymbols.getOrNull(calIndex)?.takeIf { it.isNotEmpty() }
            }
            .joinToString(", ")
    }

    private fun isOvernight(start: String?, end: String?): Boolean {
        val s = toMinutes(start) ?: return false
        val e = toMinutes(end) ?: return false
        return e < s
    }

    private fun toMinutes(value: String?): Int? {
        val parts = value?.split(":") ?: return null
        if (parts.size < 2) return null
        val h = parts[0].toIntOrNull() ?: return null
        val m = parts[1].toIntOrNull() ?: return null
        return h * 60 + m
    }

    private fun letterFor(isoDay: Int): String {
        // shortWeekdays is indexed 1..7 with 1=Sun. Map ISO to that index.
        val calIndex = if (isoDay == 7) Calendar.SUNDAY else isoDay + 1
        return veryShortWeekdaySymbols.getOrNull(calIndex)?.take(1)?.uppercase(Locale.getDefault())
            ?: isoDay.toString()
    }

    /// Always starts the week on Monday (ISO 1) regardless of locale.
    private fun orderedIsoDaysForLocale(): List<Int> = (1..7).toList()

    override fun getItemCount(): Int = mTimes.size

    fun updateTimes(times: List<ParseObject>) {
        mTimes = times.toMutableList()
        notifyDataSetChanged()
    }

    fun addOrUpdate(schedule: ParseObject) {
        val existingIndex = mTimes.indexOfFirst { it.objectId != null && it.objectId == schedule.objectId }
        if (existingIndex >= 0) {
            mTimes[existingIndex] = schedule
            notifyItemChanged(existingIndex)
        } else {
            mTimes.add(schedule)
            notifyItemInserted(mTimes.size - 1)
        }
    }

    fun itemAt(position: Int): ParseObject? = mTimes.getOrNull(position)

    fun removeAt(position: Int): ParseObject? {
        if (position !in mTimes.indices) return null
        val removed = mTimes.removeAt(position)
        notifyItemRemoved(position)
        return removed
    }

    inner class SilenceTimeViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val vStartTime: TextView = itemView.findViewById(R.id.textview_silence_start)
        val vEndTime: TextView = itemView.findViewById(R.id.textview_silence_end)
        val vActive: SwitchCompat = itemView.findViewById(R.id.switch_silence_active)
        val vContent: View = itemView.findViewById(R.id.silence_content)
        val vName: TextView = itemView.findViewById(R.id.text_silence_name)
        val vDayStrip: LinearLayout = itemView.findViewById(R.id.day_strip)
        val vEveryDay: TextView = itemView.findViewById(R.id.text_silence_every_day)
        val vNextDay: TextView = itemView.findViewById(R.id.text_silence_next_day)
    }
}
