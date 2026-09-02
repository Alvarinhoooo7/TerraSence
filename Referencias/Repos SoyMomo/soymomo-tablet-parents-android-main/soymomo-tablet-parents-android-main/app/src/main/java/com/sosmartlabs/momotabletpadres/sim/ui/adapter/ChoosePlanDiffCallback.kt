package com.sosmartlabs.momotabletpadres.sim.ui.adapter

import android.annotation.SuppressLint
import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionPlan

class ChoosePlanDiffCallback: DiffUtil.ItemCallback<SubscriptionPlan>() {
    override fun areItemsTheSame(oldItem: SubscriptionPlan, newItem: SubscriptionPlan): Boolean {
        return oldItem.title == newItem.title
    }

    // SubscriptionPlan is a ParseObject (identity equals); pre-existing comparison.
    @SuppressLint("DiffUtilEquals")
    override fun areContentsTheSame(oldItem: SubscriptionPlan, newItem: SubscriptionPlan): Boolean {
        return oldItem == newItem
    }
}