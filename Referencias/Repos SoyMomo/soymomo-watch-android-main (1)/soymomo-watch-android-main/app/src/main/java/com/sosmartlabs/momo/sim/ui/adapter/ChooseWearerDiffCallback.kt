package com.sosmartlabs.momo.sim.ui.adapter

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momo.models.Wearer

class ChooseWearerDiffCallback: DiffUtil.ItemCallback<Wearer>() {
    override fun areItemsTheSame(oldItem: Wearer, newItem: Wearer): Boolean {
        return oldItem == newItem
    }

    override fun areContentsTheSame(oldItem: Wearer, newItem: Wearer): Boolean {
        return oldItem == newItem
    }
}