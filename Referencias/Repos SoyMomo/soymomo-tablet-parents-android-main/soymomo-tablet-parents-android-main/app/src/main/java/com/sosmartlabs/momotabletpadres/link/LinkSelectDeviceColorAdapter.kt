package com.sosmartlabs.momotabletpadres.link

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.ItemLinkDeviceSelectColorBinding
import com.sosmartlabs.momotabletpadres.link.model.DeviceColor

/**
 * Adapter for displaying a list of device colors for selection.
 */
class LinkSelectDeviceColorAdapter(
    private val onColorSelected: (DeviceColor) -> Unit
) : ListAdapter<DeviceColor, LinkSelectDeviceColorAdapter.DeviceColorViewHolder>(DeviceColorDiffCallback()) {

    private var selectedPosition = -1

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DeviceColorViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        val binding = ItemLinkDeviceSelectColorBinding.inflate(inflater, parent, false)
        return DeviceColorViewHolder(binding)
    }

    override fun onBindViewHolder(holder: DeviceColorViewHolder, position: Int) {
        val deviceColor = getItem(position)
        holder.bind(deviceColor, position == selectedPosition)
        holder.itemView.setOnClickListener {
            if (selectedPosition != holder.bindingAdapterPosition) {
                val previousSelected = selectedPosition
                selectedPosition = holder.bindingAdapterPosition
                if (previousSelected != -1) {
                    notifyItemChanged(previousSelected)
                }
                notifyItemChanged(selectedPosition)
                onColorSelected(getItem(selectedPosition))
            }
        }
    }

    /**
     * ViewHolder for a single device color item.
     */
    class DeviceColorViewHolder(
        private val binding: ItemLinkDeviceSelectColorBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        /**
         * Binds the [DeviceColor] data to the view.
         */
        fun bind(deviceColor: DeviceColor, isSelected: Boolean) {
            Glide.with(binding.root.context)
                .load(deviceColor.deviceColor)
                .into(binding.deviceSelectColorImage)

            val context = binding.root.context
            if (isSelected) {
                binding.deviceSelectColorCard.strokeColor = ContextCompat.getColor(context, R.color.colorSecondary)
                binding.deviceSelectColorCard.strokeWidth = 4
            } else {
                binding.deviceSelectColorCard.strokeColor = ContextCompat.getColor(context, android.R.color.transparent)
                binding.deviceSelectColorCard.strokeWidth = 0
            }
        }
    }
}

/**
 * DiffUtil callback for efficiently updating the device color list.
 */
private class DeviceColorDiffCallback : DiffUtil.ItemCallback<DeviceColor>() {
    override fun areItemsTheSame(oldItem: DeviceColor, newItem: DeviceColor): Boolean {
        return oldItem.deviceColor == newItem.deviceColor
    }

    override fun areContentsTheSame(oldItem: DeviceColor, newItem: DeviceColor): Boolean {
        return oldItem == newItem
    }
}