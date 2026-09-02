package com.sosmartlabs.momotabletpadres.sim.ui.adapter

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet

class ChooseDeviceDiffCallback: DiffUtil.ItemCallback<Tablet>() {
    override fun areItemsTheSame(oldItem: Tablet, newItem: Tablet): Boolean {
        return oldItem == newItem
    }

    override fun areContentsTheSame(oldItem: Tablet, newItem: Tablet): Boolean {
        return oldItem == newItem
    }
}