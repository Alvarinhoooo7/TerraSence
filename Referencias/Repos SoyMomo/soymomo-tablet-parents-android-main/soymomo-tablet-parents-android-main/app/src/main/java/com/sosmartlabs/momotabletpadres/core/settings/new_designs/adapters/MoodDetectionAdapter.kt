package com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters

import android.annotation.SuppressLint
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.core.settings.dug.mooddetection.model.MoodDetection
import com.sosmartlabs.momotabletpadres.databinding.ItemOnappDetectionBinding
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.helpers.MoodDetectionItemHelper.setMoodDetection

class MoodDetectionAdapter(private val itemClickListener: (MoodDetection) -> Unit):
    ListAdapter<MoodDetection, MoodDetectionAdapter.MoodDetectionItemViewHolder>(
        MoodDetectionItemCallback()
    ) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MoodDetectionItemViewHolder {
        return MoodDetectionItemViewHolder(
            ItemOnappDetectionBinding.inflate(LayoutInflater.from(parent.context), parent, false)).apply {
            itemView.setOnClickListener {
                itemClickListener(detection)
            }
        }
    }

    override fun onBindViewHolder(holder: MoodDetectionItemViewHolder, position: Int) {
        holder.detection = getItem(position)
    }

    /**
     * Hold a view that shown the information of a [MoodDetection]
     * @param binding [ItemOnappDetectionBinding] to been held by this class
     */
    class MoodDetectionItemViewHolder(private val binding: ItemOnappDetectionBinding) : RecyclerView.ViewHolder(binding.root) {
        /**
         * Detection held by this ViewHolder
         * Must be accessed through [detection] property from outside.
         */
        private lateinit var _detection: MoodDetection

        /**
         * Detection held by this [MoodDetectionItemViewHolder]
         */
        var detection: MoodDetection
            get() {
                return _detection
            }
            set(value) {
                _detection = value
                binding.setMoodDetection(value)
            }
    }

    /**
     * Class that handles when two [MoodDetection] represents the same detection an/or have the same information to display
     */
    class MoodDetectionItemCallback: DiffUtil.ItemCallback<MoodDetection>() {
        override fun areItemsTheSame(oldItem: MoodDetection, newItem: MoodDetection): Boolean {
            return oldItem.objectId == newItem.objectId
        }

        @SuppressLint("DiffUtilEquals")
        override fun areContentsTheSame(oldItem: MoodDetection, newItem: MoodDetection): Boolean {
            return oldItem.appName == newItem.appName
                    && oldItem.appIcon?.equals(newItem.appIcon) == true
                    && oldItem.date == newItem.date
                    && oldItem.text == newItem.text
                    && oldItem.riskFactors == newItem.riskFactors
                    && oldItem.totalMoodScore == newItem.totalMoodScore
        }
    }
}