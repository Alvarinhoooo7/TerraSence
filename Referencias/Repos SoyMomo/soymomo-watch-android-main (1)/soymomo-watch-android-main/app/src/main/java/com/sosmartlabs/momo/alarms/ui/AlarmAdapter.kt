package com.sosmartlabs.momo.alarms.ui

import android.content.Context
import android.content.DialogInterface
import android.text.format.DateUtils
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CompoundButton
import android.widget.EditText
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.ToggleButton
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.widget.SwitchCompat
import androidx.recyclerview.widget.RecyclerView
import androidx.transition.TransitionManager
import com.parse.ParseException
import com.parse.ParseObject
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.alarms.AlarmsActivity
import com.sosmartlabs.momo.alarms.ui.AlarmAdapter.AlarmViewHolder
import com.sosmartlabs.momo.databinding.ItemAlarmBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog.recordNonFatalError
import com.sosmartlabs.momo.utils.DateUtil.get24HoursFormattedTimeNoLocale
import com.wdullaer.materialdatetimepicker.time.TimePickerDialog
import timber.log.Timber
import java.util.Calendar
import java.util.Locale

/**
 * @author mrgcl
 */
class AlarmAdapter(
    private var mAlarms: MutableList<ParseObject>,
    private val mContext: Context,
    private val mRecyclerView: RecyclerView
) : RecyclerView.Adapter<AlarmViewHolder>() {

    private var mSelected = -1
    private var mIsDirty = false

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AlarmViewHolder {
        val binding = ItemAlarmBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return AlarmViewHolder(binding)
    }

    override fun onBindViewHolder(holder: AlarmViewHolder, position: Int) {
        val alarm = mAlarms[position]
        val daysOfWeek = alarm.getString("daysOfWeek")!!.toCharArray()
        val cal = Calendar.getInstance()
        holder.vTime.text = alarm.getString("time")
        holder.vTime.setOnClickListener {
            val time = alarm.getString("time")!!
                .split(":".toRegex()).dropLastWhile { it.isEmpty() }.toTypedArray()
            val dialog = TimePickerDialog.newInstance(
                { _: TimePickerDialog?, hourOfDay: Int, minute: Int, second: Int ->
                    mIsDirty = true
                    val c = Calendar.getInstance()
                    c[Calendar.HOUR_OF_DAY] = hourOfDay
                    c[Calendar.MINUTE] = minute
                    alarm.put("time", get24HoursFormattedTimeNoLocale(c.time))
                    notifyItemChanged(holder.adapterPosition)
                }, time[0].toInt(), time[1].toInt(), true
            )
            dialog.show((mContext as AlarmsActivity).supportFragmentManager, "timePicker")
        }
        holder.vName.text =
            if (alarm.has("name")) alarm.getString("name") else mContext.getString(R.string.alarm_default_name)
        holder.vName.setOnClickListener { view: View? ->
            val alert = AlertDialog.Builder(mContext)
            val edittext = EditText(mContext)
            if (alarm.has("name")) edittext.setText(alarm.getString("name"))
            alert.setTitle(R.string.alert_alarm_name)
            alert.setView(edittext)
            alert.setPositiveButton(R.string.button_accept) { dialog: DialogInterface?, whichButton: Int ->
                mIsDirty = true
                alarm.put("name", edittext.text.toString())
                notifyItemChanged(holder.adapterPosition)
            }
            alert.setNegativeButton(R.string.button_cancel) { dialog: DialogInterface, whichButton: Int -> dialog.dismiss() }
            alert.show()
        }
        holder.vActive.isChecked = alarm.getBoolean("active")
        holder.vActive.setOnCheckedChangeListener { compoundButton: CompoundButton?, b: Boolean ->
            alarm.put("active", b)
            mIsDirty = true
        }
        val isExpanded = position == mSelected
        holder.vLayoutAlarmDays.visibility = if (isExpanded) View.GONE else View.VISIBLE
        holder.vLayoutHiddenContent.visibility = if (isExpanded) View.VISIBLE else View.GONE
        holder.itemView.isActivated = isExpanded
        holder.itemView.setOnClickListener { v: View? ->
            mSelected = if (isExpanded) -1 else holder.adapterPosition
            TransitionManager.beginDelayedTransition(mRecyclerView)
            notifyDataSetChanged()
        }

        holder.vDelete.setOnClickListener { view: View? ->
            val toBeDeleted = mAlarms[holder.adapterPosition]
            toBeDeleted.deleteInBackground { e: ParseException? ->
                if (e != null) {
                    (mContext as AlarmsActivity).showSnackbar(mContext.getString(R.string.toast_alarm_error_deleting))
                    recordNonFatalError(e, "Error on deleting alarm")
                } else {
                    (mContext as AlarmsActivity).showSnackbar(mContext.getString(R.string.toast_alarm_deleted))
                    if (holder.adapterPosition >= 0 && holder.adapterPosition < mAlarms.size) mAlarms.removeAt(
                        holder.adapterPosition
                    )
                    notifyDataSetChanged()
                }
            }
        }
        val daysTextBuilder = StringBuilder()
        val defaultDayNames = mContext.resources.getStringArray(R.array.days_of_week_default)
        for (i in 0..6) {
            val day = (i + 2) % 7
            cal[Calendar.DAY_OF_WEEK] = day
            val button = holder.vButtons[i]
            var dayName =
                cal.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG, Locale.getDefault())
            if (dayName.isEmpty()) dayName = defaultDayNames[i]
            if (daysOfWeek[(i + 1) % 7] == '1') {
                button!!.isChecked = true
                val shortDayName = DateUtils.formatDateTime(
                    mContext,
                    cal.timeInMillis,
                    DateUtils.FORMAT_SHOW_WEEKDAY or DateUtils.FORMAT_ABBREV_WEEKDAY
                )
                daysTextBuilder.append(shortDayName).append(", ")
            }
            val first = dayName.substring(0, 1)
            button!!.text = first
            button.textOn = first
            button.textOff = first
            button.contentDescription = dayName
            button.setOnClickListener { view: View? -> }
        }
        val daysText = daysTextBuilder.toString()
        holder.vDays.text =
            if (daysText.length > 2) daysText.substring(0, daysText.length - 2) else daysText

        holder.vButtons.forEach {
            it?.setOnClickListener {
                val didChange = holder.setWeekDays(alarm)
                mIsDirty = mIsDirty || didChange
            }
        }
    }

    override fun getItemCount(): Int {
        return mAlarms.size
    }

    fun updateAlarms(alarms: List<ParseObject>) {
        mAlarms = alarms.toMutableList()
        notifyDataSetChanged()
    }

    fun addAlarm(alarm: ParseObject) {
        mIsDirty = true
        val position = mAlarms.size
        mAlarms.add(position, alarm)
        mSelected = position
        notifyDataSetChanged()
    }

    fun saveAll() {
        if (mIsDirty) {
            ParseObject.saveAllInBackground(mAlarms) { e: ParseException? ->
                if (e != null) recordNonFatalError(
                    e,
                    "Error saving all alarms"
                )
            }
            mIsDirty = false
        }
    }

    inner class AlarmViewHolder(binding: ItemAlarmBinding) : RecyclerView.ViewHolder(binding.root) {
        var vTime: TextView
        var vName: TextView
        var vDays: TextView
        var vActive: SwitchCompat
        var vLayoutHiddenContent: LinearLayout
        var vLayoutAlarmDays: LinearLayout
        var vButtons = arrayOfNulls<ToggleButton>(7)
        var vDelete: ImageButton

        init {
            vTime = binding.textviewAlarmTime
            vName = binding.textviewAlarmName
            vDays = binding.textviewAlarmDays
            vActive = binding.switchAlarmActive
            vLayoutHiddenContent = binding.layoutHiddenContent
            vLayoutAlarmDays = binding.layoutAlarmDays
            vButtons[0] = binding.buttonMon
            vButtons[1] = binding.buttonTue
            vButtons[2] = binding.buttonWed
            vButtons[3] = binding.buttonThu
            vButtons[4] = binding.buttonFri
            vButtons[5] = binding.buttonSat
            vButtons[6] = binding.buttonSun
            vDelete = binding.buttonDeleteAlarm
        }

        fun setWeekDays(alarm: ParseObject): Boolean {
            var weekDays = ""
            arrayOf(6, 0, 1, 2, 3, 4, 5).forEach {
                weekDays += if (vButtons[it]?.isChecked == true) {
                    "1"
                } else {
                    "0"
                }
            }
            val didChange = alarm.get("daysOfWeek") != weekDays
            alarm.put("daysOfWeek", weekDays)
            return didChange
        }
    }
}