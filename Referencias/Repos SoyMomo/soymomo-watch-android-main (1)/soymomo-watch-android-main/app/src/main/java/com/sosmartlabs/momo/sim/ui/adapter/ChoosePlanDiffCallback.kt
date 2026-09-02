package com.sosmartlabs.momo.sim.ui.adapter

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momo.sim.model.SubscriptionPlan

class ChoosePlanDiffCallback: DiffUtil.ItemCallback<SubscriptionPlan>() {
    override fun areItemsTheSame(oldItem: SubscriptionPlan, newItem: SubscriptionPlan): Boolean {
        return oldItem.title == newItem.title
    }

    override fun areContentsTheSame(oldItem: SubscriptionPlan, newItem: SubscriptionPlan): Boolean {
        return oldItem.title == newItem.title &&
                oldItem.planDescription == newItem.planDescription &&
                oldItem.price == newItem.price &&
                oldItem.currencyCode == newItem.currencyCode &&
                oldItem.currency == newItem.currency &&
                oldItem.billingPeriod == newItem.billingPeriod &&
                oldItem.priceStrike == newItem.priceStrike &&
                oldItem.backgroundImageColors == newItem.backgroundImageColors &&
                oldItem.logo?.url == newItem.logo?.url
    }
}