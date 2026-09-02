package com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.range

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.Chip
import com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.model.UseTime
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.ItemTabletTimeRangePerDayBinding
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import kotlin.system.measureTimeMillis

class UseTimeRangeAdapter(
    private val listener: UseTimeRangeFragment.RangeAdapterListener
) : ListAdapter<UseTime, UseTimeRangeAdapter.NewUseTimeRangeViewHolder>(
    UseTimeRangeDiffCallback()
) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): NewUseTimeRangeViewHolder {
        Timber.d("UseTimeRangeAdapter: onCreateViewHolder() - Creating ViewHolder for parent: $parent")
        return try {
            val binding = ItemTabletTimeRangePerDayBinding.inflate(
                LayoutInflater.from(parent.context),
                parent,
                false
            )
            Timber.d("UseTimeRangeAdapter: onCreateViewHolder() - ViewHolder created successfully")
            NewUseTimeRangeViewHolder(binding)
        } catch (e: Exception) {
            Timber.e(e, "UseTimeRangeAdapter: onCreateViewHolder() - Error inflating ViewHolder")
            CrashlyticsLog.recordException(e, "UseTimeRangeAdapter: Error inflating ViewHolder")
            throw e
        }
    }

    override fun onBindViewHolder(holder: NewUseTimeRangeViewHolder, position: Int) {
        Timber.d("UseTimeRangeAdapter: onBindViewHolder() - Binding item at position $position")
        try {
            val item = getItem(position)
            holder.bindTo(item)
            Timber.d("UseTimeRangeAdapter: onBindViewHolder() - Successfully bound item: $item")
        } catch (e: Exception) {
            Timber.e(e, "UseTimeRangeAdapter: onBindViewHolder() - Error binding item at position $position")
            CrashlyticsLog.recordException(e, "UseTimeRangeAdapter: Error binding item at position $position")
        }
    }

    inner class NewUseTimeRangeViewHolder(
        private val binding: ItemTabletTimeRangePerDayBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bindTo(useTime: UseTime) {
            Timber.d("UseTimeRangeAdapter: NewUseTimeRangeViewHolder.bindTo() - Binding UseTime: $useTime")
            val bindingTime = measureTimeMillis {
                try {
                    with(binding) {
                        // Set the day label
                        var daySet = false
                        for (i in 0..6) {
                            if (useTime.days[i] == 1) {
                                day.text = itemView.context.resources.getStringArray(R.array.days)[i]
                                Timber.d("UseTimeRangeAdapter: NewUseTimeRangeViewHolder.bindTo() - Day set to index $i (${day.text})")
                                daySet = true
                                break
                            }
                        }
                        if (!daySet) {
                            Timber.w("UseTimeRangeAdapter: NewUseTimeRangeViewHolder.bindTo() - No active day found for UseTime: $useTime")
                            day.text = ""
                        }

                        // Set time range
                        fromTimeSet.text = useTime.from?.let { DateUtil.getFormattedOnlyTime(it) }
                        toTimeSet.text = useTime.to?.let { DateUtil.getFormattedOnlyTime(it) }
                        Timber.d("UseTimeRangeAdapter: NewUseTimeRangeViewHolder.bindTo() - Time range set: ${fromTimeSet.text} - ${toTimeSet.text}")

                        // Setup click listener
                        itemCard.setOnClickListener {
                            Timber.d("UseTimeRangeAdapter: NewUseTimeRangeViewHolder.bindTo() - Item clicked for use time ${useTime.id}")
                            try {
                                listener.onEditItem(useTime)
                                Timber.d("UseTimeRangeAdapter: NewUseTimeRangeViewHolder.bindTo() - onEditItem called for use time ${useTime.id}")
                            } catch (e: Exception) {
                                Timber.e(e, "UseTimeRangeAdapter: NewUseTimeRangeViewHolder.bindTo() - Error in onEditItem for use time ${useTime.id}")
                                CrashlyticsLog.recordException(e, "UseTimeRangeAdapter: Error in onEditItem for use time ${useTime.id}")
                            }
                        }
                    }
                } catch (e: Exception) {
                    Timber.e(e, "UseTimeRangeAdapter: NewUseTimeRangeViewHolder.bindTo() - Error binding UseTime: $useTime")
                    CrashlyticsLog.recordException(e, "UseTimeRangeAdapter: Error binding UseTime: $useTime")
                }
            }
            Timber.d("UseTimeRangeAdapter: NewUseTimeRangeViewHolder.bindTo() - Binding completed in $bindingTime ms for UseTime: ${useTime.id}")
        }
    }

    private fun Chip.setDay(useTime: UseTime, dayIndex: Int) {
        try {
            isChecked = useTime.days[dayIndex] != 0
            setOnClickListener {
                Timber.d("UseTimeRangeAdapter: Chip.setDay() - Day $dayIndex toggled for use time ${useTime.id}, isChecked: $isChecked")
                try {
                    useTime.days[dayIndex] = if (isChecked) 1 else 0
                    listener.onUpdateItem(useTime)
                    Timber.d("UseTimeRangeAdapter: Chip.setDay() - onUpdateItem called for use time ${useTime.id}")
                } catch (e: Exception) {
                    Timber.e(e, "UseTimeRangeAdapter: Chip.setDay() - Error updating day $dayIndex for use time ${useTime.id}")
                    CrashlyticsLog.recordException(e, "UseTimeRangeAdapter: Error updating day $dayIndex for use time ${useTime.id}")
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "UseTimeRangeAdapter: Chip.setDay() - Error setting day $dayIndex for use time ${useTime.id}")
            CrashlyticsLog.recordException(e, "UseTimeRangeAdapter: Error setting day $dayIndex for use time ${useTime.id}")
        }
    }

    private fun addPaddingIfNeeded(number: Int): String {
        return if (number < 10) "0$number" else "$number"
    }
}
