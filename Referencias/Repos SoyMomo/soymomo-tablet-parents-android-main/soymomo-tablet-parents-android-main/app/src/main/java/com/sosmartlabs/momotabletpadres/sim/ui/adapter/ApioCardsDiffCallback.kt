package com.sosmartlabs.momotabletpadres.sim.ui.adapter

import android.annotation.SuppressLint
import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momotabletpadres.sim.model.PaymentUserCard

class ApioCardsDiffCallback: DiffUtil.ItemCallback<PaymentUserCard>() {
    override fun areItemsTheSame(oldItem: PaymentUserCard, newItem: PaymentUserCard): Boolean {
        return oldItem.digits == newItem.digits
    }

    // PaymentUserCard is a ParseObject (identity equals); pre-existing comparison.
    @SuppressLint("DiffUtilEquals")
    override fun areContentsTheSame(oldItem: PaymentUserCard, newItem: PaymentUserCard): Boolean {
        return oldItem == newItem
    }
}