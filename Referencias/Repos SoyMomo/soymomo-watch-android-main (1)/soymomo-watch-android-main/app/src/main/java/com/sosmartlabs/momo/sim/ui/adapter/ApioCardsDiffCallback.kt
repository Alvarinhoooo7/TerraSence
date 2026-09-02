package com.sosmartlabs.momo.sim.ui.adapter

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momo.sim.model.PaymentUserCard

class ApioCardsDiffCallback: DiffUtil.ItemCallback<PaymentUserCard>() {
    override fun areItemsTheSame(oldItem: PaymentUserCard, newItem: PaymentUserCard): Boolean {
        return oldItem.digits == newItem.digits
    }

    override fun areContentsTheSame(oldItem: PaymentUserCard, newItem: PaymentUserCard): Boolean {
        return oldItem == newItem
    }
}