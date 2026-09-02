package com.sosmartlabs.momotabletpadres.adapters

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momotabletpadres.models.entity.NotificationEntity

class NotificationDiffCallback : DiffUtil.ItemCallback<NotificationEntity>() {
    override fun areItemsTheSame(oldItem: NotificationEntity, newItem: NotificationEntity): Boolean {
        return oldItem.objectId == newItem.objectId
    }
    override fun areContentsTheSame(oldItem: NotificationEntity, newItem: NotificationEntity): Boolean {
        return oldItem == newItem
    }
}