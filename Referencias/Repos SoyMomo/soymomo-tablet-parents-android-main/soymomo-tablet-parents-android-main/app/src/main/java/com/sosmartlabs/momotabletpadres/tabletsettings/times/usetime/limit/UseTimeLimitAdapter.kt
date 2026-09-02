package com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.limit

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.Chip
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.model.UseTime
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.databinding.ItemTimeLimitPerDayBinding
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

class UseTimeLimitAdapter(
    private val listener: UseTimeLimitFragment.LimitAdapterListener
) : ListAdapter<UseTime, UseTimeLimitAdapter.NewUseTimeLimitViewHolder>(
    UseTimeLimitDiffCallback()
) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): NewUseTimeLimitViewHolder {
        Timber.d("UseTimeLimitAdapter: onCreateViewHolder() - Creating ViewHolder for parent: $parent")
        return try {
            val binding = ItemTimeLimitPerDayBinding.inflate(LayoutInflater.from(parent.context), parent, false)
            Timber.d("UseTimeLimitAdapter: onCreateViewHolder() - ViewHolder created successfully")
            NewUseTimeLimitViewHolder(binding)
        } catch (e: Exception) {
            Timber.e(e, "UseTimeLimitAdapter: onCreateViewHolder() - Error inflating ViewHolder")
            CrashlyticsLog.recordException(e, "UseTimeLimitAdapter: Error inflating ViewHolder")
            throw e
        }
    }

    override fun onBindViewHolder(holder: NewUseTimeLimitViewHolder, position: Int) {
        Timber.d("UseTimeLimitAdapter: onBindViewHolder() - Binding item at position $position")
        try {
            val item = getItem(position)
            holder.bindTo(item)
            Timber.d("UseTimeLimitAdapter: onBindViewHolder() - Successfully bound item: $item")
        } catch (e: Exception) {
            Timber.e(e, "UseTimeLimitAdapter: onBindViewHolder() - Error binding item at position $position")
            CrashlyticsLog.recordException(e, "UseTimeLimitAdapter: Error binding item at position $position")
        }
    }

    inner class NewUseTimeLimitViewHolder(
        private val binding: ItemTimeLimitPerDayBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bindTo(useTime: UseTime) {
            Timber.d("UseTimeLimitAdapter: NewUseTimeLimitViewHolder.bindTo() - Binding UseTime: $useTime")
            try {
                with(binding) {
                    // Set the day label
                    var daySet = false
                    for (i in 0..6) {
                        if (useTime.days[i] == 1) {
                            day.text = itemView.context.resources.getStringArray(R.array.days)[i]
                            Timber.d("UseTimeLimitAdapter: NewUseTimeLimitViewHolder.bindTo() - Day set to index $i (${day.text})")
                            daySet = true
                            break
                        }
                    }
                    if (!daySet) {
                        Timber.w("UseTimeLimitAdapter: NewUseTimeLimitViewHolder.bindTo() - No active day found for UseTime: $useTime")
                        day.text = ""
                    }

                    // Set the time limit
                    try {
                        timeSet.text = DateUtil.timeLimitStringFormatter(useTime.limit!!)
                        Timber.d("UseTimeLimitAdapter: NewUseTimeLimitViewHolder.bindTo() - Time limit set: ${timeSet.text}")
                    } catch (e: Exception) {
                        Timber.e(e, "UseTimeLimitAdapter: NewUseTimeLimitViewHolder.bindTo() - Error formatting time limit for UseTime: $useTime")
                        CrashlyticsLog.recordException(e, "UseTimeLimitAdapter: Error formatting time limit for UseTime: $useTime")
                        timeSet.text = ""
                    }

                    // Set click listener for editing
                    itemCard.setOnClickListener {
                        Timber.d("UseTimeLimitAdapter: NewUseTimeLimitViewHolder.bindTo() - itemCard clicked for UseTime: $useTime")
                        try {
                            listener.onEditItem(useTime)
                        } catch (e: Exception) {
                            Timber.e(e, "UseTimeLimitAdapter: NewUseTimeLimitViewHolder.bindTo() - Error in onEditItem for UseTime: $useTime")
                            CrashlyticsLog.recordException(e, "UseTimeLimitAdapter: Error in onEditItem for UseTime: $useTime")
                        }
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "UseTimeLimitAdapter: NewUseTimeLimitViewHolder.bindTo() - Error binding UseTime: $useTime")
                CrashlyticsLog.recordException(e, "UseTimeLimitAdapter: Error binding UseTime: $useTime")
            }
        }
    }

    private fun Chip.setDay(useTime: UseTime, dayIndex: Int) {
        Timber.d("UseTimeLimitAdapter: Chip.setDay() - Setting day index $dayIndex for UseTime: $useTime")
        try {
            isChecked = useTime.days[dayIndex] != 0
            setOnClickListener {
                Timber.d("UseTimeLimitAdapter: Chip.setDay() - Chip clicked for day index $dayIndex, isChecked: $isChecked")
                try {
                    useTime.days[dayIndex] = if (isChecked) 1 else 0
                    Timber.d("UseTimeLimitAdapter: Chip.setDay() - Updated days: ${useTime.days.toList()}")
                    listener.onUpdateItem(useTime)
                } catch (e: Exception) {
                    Timber.e(e, "UseTimeLimitAdapter: Chip.setDay() - Error updating UseTime for day index $dayIndex")
                    CrashlyticsLog.recordException(e, "UseTimeLimitAdapter: Error updating UseTime for day index $dayIndex")
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "UseTimeLimitAdapter: Chip.setDay() - Error setting day for UseTime: $useTime")
            CrashlyticsLog.recordException(e, "UseTimeLimitAdapter: Error setting day for UseTime: $useTime")
        }
    }
}
