package com.sosmartlabs.momotabletpadres.main.ui.adapter

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momotabletpadres.models.MainCardTabletUser

/**
 * Callback for calculating the diff between two non-null MainCardTabletUser in a list.
 */
class TabletUserDiffCallback : DiffUtil.ItemCallback<MainCardTabletUser>() {
    override fun areItemsTheSame(oldItem: MainCardTabletUser, newItem: MainCardTabletUser) : Boolean {
        val old = oldItem.tablet
        val new = newItem.tablet
        // Both null = the same trailing "add" button. One null = different identity.
        if (old == null && new == null) return true
        if (old == null || new == null) return false
        return old.objectId == new.objectId
    }

    override fun areContentsTheSame(oldItem: MainCardTabletUser, newItem: MainCardTabletUser) : Boolean {
        return oldItem.areContentsTheSame(newItem)
    }
}