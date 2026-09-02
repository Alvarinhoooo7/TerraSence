package com.sosmartlabs.momo.addfirstwatch.ui.adapter

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator

class ChooseMobileNetworkOperatorDiffCallback: DiffUtil.ItemCallback<MobileNetworkOperator>() {
    override fun areItemsTheSame(oldItem: MobileNetworkOperator, newItem: MobileNetworkOperator): Boolean {
        return oldItem == newItem
    }

    override fun areContentsTheSame(oldItem: MobileNetworkOperator, newItem: MobileNetworkOperator): Boolean {
        return oldItem.objectId == newItem.objectId
    }
}