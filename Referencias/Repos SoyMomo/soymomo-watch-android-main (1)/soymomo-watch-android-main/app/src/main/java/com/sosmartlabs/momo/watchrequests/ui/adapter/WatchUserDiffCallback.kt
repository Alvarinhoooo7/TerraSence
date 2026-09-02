package com.sosmartlabs.momo.watchrequests.ui.adapter

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momo.models.WatchUser

/**
 * Diff callback for the pending/accepted watch-user lists. Items are identified by
 * objectId; contents change when the active flag or any granular permission flips.
 */
class WatchUserDiffCallback : DiffUtil.ItemCallback<WatchUser>() {

    override fun areItemsTheSame(oldItem: WatchUser, newItem: WatchUser): Boolean =
        oldItem.objectId == newItem.objectId

    override fun areContentsTheSame(oldItem: WatchUser, newItem: WatchUser): Boolean =
        oldItem.objectId == newItem.objectId &&
            oldItem.active == newItem.active &&
            permissionSignature(oldItem) == permissionSignature(newItem)

    private fun permissionSignature(item: WatchUser): String {
        val permission = item.userPermission ?: return "none"
        return with(permission) { "$call$videocall$messages$location$edit" }
    }
}
