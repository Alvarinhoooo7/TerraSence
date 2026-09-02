package com.sosmartlabs.momo.reminders.ui

import android.content.Context
import android.graphics.Typeface
import android.text.Spannable
import android.text.SpannableStringBuilder
import android.text.format.DateUtils
import android.text.style.StyleSpan
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ItemRemindersListBinding
import com.sosmartlabs.momo.reminders.model.Reminder
import timber.log.Timber
import java.util.*

class RemindersAdapter(private val context: Context) :
    RecyclerView.Adapter<RemindersAdapter.CustomViewHolder>() {

    interface Listener {
        fun onItemClickListener(reminder: Reminder)
        fun onItemEnabledChanged(reminder: Reminder, enable: Boolean)
    }

    private lateinit var binding: ItemRemindersListBinding
    private val dataSet = arrayListOf<Reminder>()

    private var listener: Listener? = null

    fun setListener(listener: Listener) {
        this.listener = listener
    }

    fun setData(data: List<Reminder>) {
        this.dataSet.clear()
        this.dataSet.addAll(data)
        this.notifyDataSetChanged()
    }

    fun getReminderAt(position: Int): Reminder {
        return dataSet[position]
    }

    /**
     * Adapter position of the given reminder, or -1 if it isn't currently displayed.
     * Searches the adapter's own data set so callers get a position in adapter coordinates,
     * which are reversed with respect to the view model's reminder list.
     */
    fun indexOf(reminder: Reminder): Int {
        return dataSet.indexOf(reminder)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CustomViewHolder {
        Timber.d("onCreateViewHolder")
        binding =
            ItemRemindersListBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return CustomViewHolder(binding)
    }

    override fun onBindViewHolder(holder: CustomViewHolder, position: Int) {
        Timber.d("onBindViewHolder")
        val item = dataSet[position]

        with(holder.binding) {
            var sb = SpannableStringBuilder()

            val cal = Calendar.getInstance()
            val daysOfWeek = mutableListOf<String>()
            for (i1 in 0..6) {
                cal[Calendar.DAY_OF_WEEK] = (i1 + 2) % 7
                val shortDayName = DateUtils.formatDateTime(
                    context, cal.timeInMillis,
                    DateUtils.FORMAT_SHOW_WEEKDAY or DateUtils.FORMAT_ABBREV_WEEKDAY
                )
                daysOfWeek += shortDayName
            }

            for (i in daysOfWeek.indices) {
                sb.append(daysOfWeek[i][0])
                val index = sb.lastIndex
                if (item.days[i] == 1) {
                    sb.setSpan(
                        StyleSpan(Typeface.BOLD),
                        index,
                        index + 1,
                        Spannable.SPAN_INCLUSIVE_EXCLUSIVE
                    )
                }
            }

            sb.append("   ").append(item.from).append(" ")
            if (item.type == Reminder.TYPE_TASK) sb.append("- ").append(item.to)

            timeAndDays.text = sb


            reminderEmoji.text = item.emoji
            titleReminder.text = item.name

            switchStateReminder.isChecked = item.isActive

            reminderCard.setOnClickListener {
                listener?.onItemClickListener(item)
            }
            switchStateReminder.setOnClickListener {
                listener?.onItemEnabledChanged(item, switchStateReminder.isChecked)
            }

        }


    }

    override fun getItemCount(): Int {
        Timber.d("getItemCount")
        return dataSet.size
    }

    class CustomViewHolder(val binding: ItemRemindersListBinding) :
        RecyclerView.ViewHolder(binding.root)
}