package com.sosmartlabs.momo.watchrequests.ui.adapter

import android.content.Context
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.databinding.ItemPermissionLevelBinding
import com.sosmartlabs.momo.models.UserPermissionFeature

class UserPermissionAdapter(private val context: Context) :
    ListAdapter<UserPermissionFeature, UserPermissionAdapter.PermissionViewHolder>(
        UserPermissionFeatureDiffCallBack()
    ) {

    interface Listener {
        fun onItemEnabledChanged(userPermission: UserPermissionFeature, enabled: Boolean)
    }

    var listener: Listener? = null

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PermissionViewHolder {
        val binding = ItemPermissionLevelBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return PermissionViewHolder(binding)
    }

    override fun onBindViewHolder(holder: PermissionViewHolder, position: Int) {
        holder.bind(getItem(position), position == itemCount - 1)
    }

    inner class PermissionViewHolder(private val binding: ItemPermissionLevelBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(item: UserPermissionFeature, isLast: Boolean) = with(binding) {
            iconPermission.setImageResource(item.icon)
            titlePermission.text = context.getString(item.title)
            if (item.description != 0) {
                descriptionPermission.text = context.getString(item.description)
                descriptionPermission.isVisible = true
            } else {
                descriptionPermission.isVisible = false
            }
            divider.isVisible = !isLast
            // Give the switch an accessible label so TalkBack announces which permission it controls.
            switchStatePermission.contentDescription = context.getString(item.title)
            switchStatePermission.isChecked = item.switchStatePermission
            switchStatePermission.setOnClickListener {
                listener?.onItemEnabledChanged(item, switchStatePermission.isChecked)
            }
        }
    }

    class UserPermissionFeatureDiffCallBack : DiffUtil.ItemCallback<UserPermissionFeature>() {
        override fun areItemsTheSame(
            oldItem: UserPermissionFeature,
            newItem: UserPermissionFeature
        ): Boolean = oldItem.title == newItem.title

        override fun areContentsTheSame(
            oldItem: UserPermissionFeature,
            newItem: UserPermissionFeature
        ): Boolean = oldItem.switchStatePermission == newItem.switchStatePermission
    }
}
