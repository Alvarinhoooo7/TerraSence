package com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.databinding.ItemOnappDetectionBinding
import com.sosmartlabs.momotabletpadres.core.settings.dug.unsafesearch.model.DisplayedDetectedUnsafeSearch
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.helpers.UnsafeSearchItemHelper

class DetectedUnsafeSearchesAdapter (private val itemClickListener: (selected: DisplayedDetectedUnsafeSearch) -> Unit):
    ListAdapter<DisplayedDetectedUnsafeSearch,
            DetectedUnsafeSearchesAdapter.DetectedUnsafeSearchViewHolder>(UnsafeSearchItemCallback()) {

    class DetectedUnsafeSearchViewHolder (private val binding: ItemOnappDetectionBinding):
        RecyclerView.ViewHolder(binding.root) {
        val contentBinding get() = binding

        private lateinit var _detection: DisplayedDetectedUnsafeSearch

        var detection: DisplayedDetectedUnsafeSearch
            get() {
                return _detection
            }
            set(value) {
                _detection = value
            }
    }

    var listener: ((DisplayedDetectedUnsafeSearch) -> Unit)? = null

    override fun onCreateViewHolder(
        parent: ViewGroup,
        viewType: Int
    ): DetectedUnsafeSearchViewHolder {
        var item = DetectedUnsafeSearchViewHolder(
            ItemOnappDetectionBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        )
            .apply {
                itemView.setOnClickListener {
                    itemClickListener(detection)
                }
            }
        return item
    }

    override fun onBindViewHolder(holder: DetectedUnsafeSearchViewHolder, position: Int) {
        holder.detection = getItem(position)
        val item = getItem(position)
        UnsafeSearchItemHelper.setItemUnsafeSearchBinding(holder.itemView.context, item, holder.contentBinding, true)
        holder.contentBinding.root.setOnClickListener {
            listener?.let { it(item) }
            itemClickListener(holder.detection)
        }
    }
}

internal class UnsafeSearchItemCallback: DiffUtil.ItemCallback<DisplayedDetectedUnsafeSearch>() {
    override fun areItemsTheSame(
        oldItem: DisplayedDetectedUnsafeSearch,
        newItem: DisplayedDetectedUnsafeSearch
    ): Boolean {
        return oldItem.detectedSearch.objectId == newItem.detectedSearch.objectId
    }

    override fun areContentsTheSame(
        oldItem: DisplayedDetectedUnsafeSearch,
        newItem: DisplayedDetectedUnsafeSearch
    ): Boolean {
        return oldItem.detectedSearch.category == newItem.detectedSearch.category
                && oldItem.detectedSearch.date == newItem.detectedSearch.date
                && oldItem.appName == newItem.appName
                && oldItem.name == newItem.name
    }

}